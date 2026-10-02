/*
 * Reaction Forge v0.1 — Un laboratorio de mezclas personalizadas para Sandboxels
 * Mezclas procedurales de dos elementos, reciclables para nuevas mezclas.
 * Editor visual de elementos y recetas, con guardado y exportación JSON.
 * Las mezclas simuladas son ficticias; no son fórmulas ni instrucciones químicas reales.
 * Licencia MIT. Proyecto comunitario no oficial.
 */
(function () {
    "use strict";
    if (window.ReactionForge) return;
    if (typeof elements === "undefined" || typeof behaviors === "undefined") {
        console.error("[Reaction Forge] No se encontró la API de Sandboxels.");
        return;
    }

    const VERSION = "0.1.0";
    const KEY = "reaction_forge_data_v1";
    const CAT = "reaction_forge";
    const OFFSETS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    const VALID_ID = /^[a-z][a-z0-9_]{1,63}$/;
    const isOwnId = (s) => typeof s === "string" && (s.startsWith("rf_custom_") || s.startsWith("rf_mix_"));
    const empty = () => ({version:1, custom:[], recipes:[], generated:[]});
    const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
    function readState() {
        try {
            const json = JSON.parse(localStorage.getItem(KEY) || "null");
            if (!obj(json)) return empty();
            return {
                version:1,
                custom:Array.isArray(json.custom) ? json.custom : [],
                recipes:Array.isArray(json.recipes) ? json.recipes : [],
                generated:Array.isArray(json.generated) ? json.generated : []
            };
        } catch (e) { console.warn("[Reaction Forge] Datos no legibles",e); return empty(); }
    }
    const state = readState();
    let saveTimer = null;
    let installed = false;
    let activeTab = "mix";
    const originalContact = new Map();
    const starterRules = new Map();
    const log = [];
    function saveNow() {
        saveTimer = null;
        try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
        catch (e) { console.warn("[Reaction Forge] Guardado no disponible",e); status("Almacenamiento lleno o bloqueado. Exporta una copia JSON.",true); return false; }
    }
    function saveSoon() {
        if (saveTimer !== null) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 700);
    }
    function status(msg,err) {
        const target=document.getElementById("rf-status");
        if (target) { target.textContent=msg; target.style.color=err ? "#ff9696" : "#a3e2c5"; }
    }
    function slug(name) {
        return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0,38);
    }
    function cap(value,lo,hi,fallback) {
        const v=Number(value);
        return Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : fallback;
    }
    function validColor(value) { return /^#[0-9a-f]{6}$/i.test(value || ""); }
    function safeText(s,max=90) { return String(s || "").replace(/[<>]/g, "").slice(0,max); }
    function goodState(s) { return ["solid","liquid","gas"].includes(s) ? s : "solid"; }
    function makeElement(info) {
        const stateType=goodState(info.state);
        const behavior=stateType==="liquid" ? behaviors.LIQUID : (stateType==="gas" ? behaviors.GAS : behaviors.POWDER);
        return {
            name:safeText(info.name,75),
            color:validColor(info.color) ? info.color : "#b3b8df",
            behavior:info.fixed ? behaviors.WALL : behavior,
            category:CAT,
            state:stateType,
            density:cap(info.density,1,30000,1400),
            desc:"Reaction Forge — material ficticio. Puedes volver a mezclarlo en un reactor.",
            excludeRandom:true
        };
    }
    function putElement(id,def,live) {
        if (live && typeof addElement === "function" && document.getElementById("elementCountSpan")) {
            addElement(id,def);
        } else { elements[id]=def; }
    }
    const BASE = [
        ["rf_reactor",{name:"Reactor de mezclas", color:"#374b80",behavior:behaviors.WALL,category:CAT,state:"solid",density:4000,insulate:true,excludeRandom:true,desc:"Coloca al menos dos elementos vecinos. Transforma dos píxeles en uno nuevo cada cierto tiempo. No sustituye la química real.",tick:reactorTick}],
        ["rf_prism_solvent",{name:"Solvente prisma", color:"#70a7ff",state:"liquid",density:1060}],
        ["rf_crystal_dust",{name:"Polvo cristalino",color:"#ce8aff",state:"solid",density:2350}],
        ["rf_void_dust",{name:"Polvo del vacío",color:"#6654a7",state:"solid",density:1960}],
        ["rf_neon_vapor",{name:"Vapor neón",color:"#63f2b1",state:"gas",density:3}],
        ["rf_bio_gel",{name:"Gel biológico ficticio",color:"#6dcf75",state:"liquid",density:1220}],
        ["rf_prism_glass",{name:"Vidrio prisma",color:"#8ff7ef",state:"solid",density:2450,fixed:true}],
        ["rf_nebula_gel",{name:"Gel nebuloso",color:"#ab5bdb",state:"liquid",density:1300}],
        ["rf_star_crystal",{name:"Cristal estelar",color:"#fce17a",state:"solid",density:2800}],
        ["rf_fizz_vapor",{name:"Vapor efervescente",color:"#b0e8e8",state:"gas",density:4}],
        ["rf_living_crystal",{name:"Cristal vivo",color:"#71e2a1",state:"solid",density:2700}]
    ];
    for (const [id,def] of BASE) putElement(id,id==="rf_reactor"?def:makeElement(def),false);
    const starter = [
        ["water","rf_crystal_dust","rf_prism_glass"],
        ["rf_prism_solvent","rf_void_dust","rf_nebula_gel"],
        ["rf_nebula_gel","rf_neon_vapor","rf_star_crystal"],
        ["rf_crystal_dust","rf_bio_gel","rf_living_crystal"],
        ["rf_prism_solvent","rf_neon_vapor","rf_fizz_vapor"]
    ];
    function pair(a,b) { return [a,b].sort().join("||"); }
    for (const [a,b,out] of starter) starterRules.set(pair(a,b),out);
    function validInput(s) { return typeof s === "string" && VALID_ID.test(s) && !!elements[s] && s!=="rf_reactor" && s!=="unknown" && elements[s].tool === undefined; }
    function validateCustom(x) {
        return obj(x) && typeof x.id==="string" && x.id.startsWith("rf_custom_") && VALID_ID.test(x.id) && typeof x.name==="string" && x.name.length<=75 && validColor(x.color) && ["solid","liquid","gas"].includes(x.state);
    }
    for (const x of state.custom.slice()) {
        if (!validateCustom(x) || elements[x.id]) continue;
        putElement(x.id,makeElement(x),false);
    }
    function hash32(s,seed) {
        let h=seed>>>0;
        for(let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h=Math.imul(h,16777619); }
        return (h>>>0).toString(16).padStart(8,"0");
    }
    function mixId(a,b) { const k=pair(a,b); return "rf_mix_"+hash32(k,2166136261)+hash32(k,374761393); }
    function rgb(s) {
        if (obj(s) && Number.isFinite(s.r) && Number.isFinite(s.g) && Number.isFinite(s.b)) return [s.r,s.g,s.b];
        if (typeof s === "string" && /^#[0-9a-f]{3}$/i.test(s)) s="#"+s.slice(1).split("").map(c=>c+c).join("");
        if (validColor(s)) return [1,3,5].map(n=>parseInt(s.slice(n,n+2),16));
        const m=typeof s === "string" && s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
        return m ? [Number(m[1]),Number(m[2]),Number(m[3])] : [153,153,153];
    }
    function hex(v) {return "#"+v.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");}
    function elementColor(id) {
        const e=elements[id];
        const raw=Array.isArray(e.colorObject)?e.colorObject[0]:(e.colorObject|| (Array.isArray(e.color)?e.color[0]:e.color));
        return rgb(raw);
    }
    function mixColor(a,b) { const x=elementColor(a),y=elementColor(b);return hex(x.map((v,i)=>(v+y[i])/2)); }
    function mixPhase(a,b) {
        const sa=elements[a].state||"solid",sb=elements[b].state||"solid";
        if (sa==="gas"&&sb==="gas")return "gas";
        if (sa==="liquid"||sb==="liquid")return "liquid";
        return "solid";
    }
    function makeGenerated(a,b) {
        const id=mixId(a,b);
        const already=state.generated.find(x=>x.id===id);
        if (already) return id;
        if (elements[id]) return id;
        const ea=elements[a],eb=elements[b];
        const data={id,a,b,name:safeText(`${ea.name||a} + ${eb.name||b}`,75),color:mixColor(a,b),state:mixPhase(a,b),density:Math.round((cap(ea.density,1,30000,1000)+cap(eb.density,1,30000,1000))/2)};
        putElement(id,makeElement(data),installed);
        state.generated.push(data);
        saveSoon();
        return id;
    }
    // Saved products are registered BEFORE Sandboxels finalizes the element list.
    // Repeat dependency passes because a generated product may be an ingredient of another.
    let pending=state.generated.filter(x=>obj(x) && typeof x.id==="string" && x.id.startsWith("rf_mix_") && VALID_ID.test(x.id) && validColor(x.color));
    for(let pass=0;pass<16 && pending.length;pass++) {
        const next=[];
        for(const item of pending) {
            if (elements[item.id]) continue;
            if (typeof item.a!=="string"||typeof item.b!=="string"||!elements[item.a]||!elements[item.b]||mixId(item.a,item.b)!==item.id) { next.push(item); continue; }
            putElement(item.id,makeElement(item),false);
        }
        if(next.length===pending.length)break;
        pending=next;
    }
    function goodRecipe(x) {
        return obj(x) && validInput(x.a) && validInput(x.b) && validInput(x.out) && typeof x.contact === "boolean";
    }
    function resolveRecipe(a,b) {
        const k=pair(a,b);
        for(let i=state.recipes.length-1;i>=0;i--) {
            const r=state.recipes[i];
            if (pair(r.a,r.b)===k && elements[r.out]) return r.out;
        }
        return starterRules.get(k)||null;
    }
    function blend(a,b) {
        if (!validInput(a)||!validInput(b)) throw new Error("Elige dos elementos que existan en Sandboxels.");
        const out=resolveRecipe(a,b)||makeGenerated(a,b);
        log.unshift({a,b,out});
        if(log.length>40) log.length=40;
        return out;
    }
    function reactorTick(pixel) {
        if ((pixelTicks + pixel.x*3 + pixel.y) % 12 !== 0) return;
        const near=[];
        for(const [dx,dy] of OFFSETS) {
            const x=pixel.x+dx,y=pixel.y+dy;
            if (outOfBounds(x,y)) continue;
            const n=pixelMap[x]?.[y];
            if (n && !n.del && validInput(n.element)) near.push(n);
        }
        if(near.length<2) return;
        let a=null,b=null;
        // Give priority to explicit recipes when the reactor has many neighbors.
        for(let i=0;i<near.length-1 && !a;i++)for(let j=i+1;j<near.length;j++) {
            if(near[i].element!==near[j].element && resolveRecipe(near[i].element,near[j].element)) {a=near[i];b=near[j];break;}
        }
        if(!a) {a=near[0]; b=near[1];}
        if(!b) return;
        let out;
        try {out=blend(a.element,b.element);} catch(e){return;}
        // Consume only the two ingredient pixels, keeping the reactor in place.
        if(pixelMap[a.x]?.[a.y]!==a || pixelMap[b.x]?.[b.y]!==b) return;
        changePixel(a,out);
        deletePixel(b.x,b.y);
        if(log.length%8===0) refreshIfOpen();
    }
    // Native contact reactions are opt-in and preserve native rules by refusing collisions.
    function setContact(x) {
        if(!x.contact || !goodRecipe(x)) return {ok:true};
        for(const [a,b] of [[x.a,x.b],[x.b,x.a]]) {
            if (elements[a].reactions && elements[a].reactions[b] !== undefined && !originalContact.has(a+"|"+b)) return {ok:false,message:`${a} y ${b} ya tienen una reacción nativa; usa el reactor.`};
        }
        for(const [a,b] of [[x.a,x.b],[x.b,x.a]]) {
            if(!elements[a].reactions) elements[a].reactions={};
            const k=a+"|"+b;
            if(!originalContact.has(k)) originalContact.set(k,{prev:elements[a].reactions[b],target:elements[a].reactions});
            elements[a].reactions[b]={elem1:x.out,elem2:null,chance:1};
        }
        return {ok:true};
    }
    function unsetContact(x) {
        for(const [a,b] of [[x.a,x.b],[x.b,x.a]]) {
            const k=a+"|"+b,p=originalContact.get(k);
            if(!p||!elements[a]?.reactions) continue;
            const current=elements[a].reactions[b];
            if(current && current.elem1===x.out && current.elem2===null) {
                if(p.prev===undefined) delete elements[a].reactions[b];
                else elements[a].reactions[b]=p.prev;
            }
            originalContact.delete(k);
        }
    }
    function addCustom(name,color,phase,density) {
        const base=slug(name);
        if(base.length<2) throw new Error("Escribe un nombre de al menos dos letras.");
        const id="rf_custom_"+base;
        if(elements[id]) throw new Error("Ya existe un material con ese nombre.");
        const data={id,name:safeText(name,75),color,state:goodState(phase),density:cap(density,1,30000,1500)};
        if(!validColor(data.color))throw new Error("El color no es válido.");
        putElement(id,makeElement(data),installed);
        state.custom.push(data);
        saveNow();
        return id;
    }
    function addRecipe(a,b,out,contact) {
        if(!validInput(a)||!validInput(b)||!validInput(out))throw new Error("Revisa los identificadores de ingredientes y resultado.");
        const entry={a,b,out,contact:!!contact};
        const prev=state.recipes.find(r=>pair(r.a,r.b)===pair(a,b));
        if(prev)unsetContact(prev);
        const applied=setContact(entry);
        if(!applied.ok) entry.contact=false;
        if(prev)state.recipes.splice(state.recipes.indexOf(prev),1);
        state.recipes.push(entry);
        saveNow();
        return applied;
    }
    function removeRecipe(k) {
        const i=state.recipes.findIndex(x=>pair(x.a,x.b)===k);
        if(i<0)return;
        const x=state.recipes[i];unsetContact(x);state.recipes.splice(i,1);saveNow();renderTab();
    }
    // Use DOM methods and textContent for all user-provided strings: no user HTML injection.
    function dom(tag,attrs={},value) {
        const n=document.createElement(tag);
        for(const [k,v] of Object.entries(attrs)) {
            if(k==="class") n.className=v;
            else if(k==="type" || k==="placeholder" || k==="title" || k==="min" || k==="max" || k==="step" || k==="accept" || k==="list" || k==="id") n.setAttribute(k,v);
        }
        if(value!==undefined)n.textContent=value;
        return n;
    }
    function field(label,placeholder,initial="",type="text") {
        const wrap=dom("label",{class:"rf-field"});wrap.appendChild(dom("span",{},label));
        const el=dom("input",{type,placeholder});el.value=initial;wrap.appendChild(el);
        return {wrap,el};
    }
    function select(label,options,initial) {
        const wrap=dom("label",{class:"rf-field"});wrap.appendChild(dom("span",{},label));const el=dom("select");
        for(const [val,title] of options){const opt=dom("option",{},title);opt.value=val;el.appendChild(opt);}
        el.value=initial||options[0][0];wrap.appendChild(el);return {wrap,el};
    }
    function btn(label,handler,kind="") {
        const b=dom("button",{class:"rf-action "+kind,type:"button"},label);b.addEventListener("click",handler);return b;
    }
    function message(e){status(e?.message||String(e),true);}
    function openPanel(){document.getElementById("rf-root")?.classList.remove("rf-hide");renderTab();}
    function closePanel(){document.getElementById("rf-root")?.classList.add("rf-hide");}
    function refreshIfOpen(){const root=document.getElementById("rf-root");if(root && !root.classList.contains("rf-hide") && activeTab==="history")renderTab();}
    function listRow(title,desc,act) {
        const row=dom("div",{class:"rf-row"}),txt=dom("div",{class:"rf-row-text"});txt.appendChild(dom("strong",{},title));txt.appendChild(dom("small",{},desc));row.appendChild(txt);
        if(act)row.appendChild(act);return row;
    }
    function inputNames(container) {
        const datalist=dom("datalist",{id:"rf-elements"});
        for(const id of Object.keys(elements).filter(v=>VALID_ID.test(v)).sort()) {const op=dom("option");op.value=id;datalist.appendChild(op);}
        container.appendChild(datalist);
    }
    function renderTab() {
        const wrap=document.getElementById("rf-body");if(!wrap)return;
        wrap.replaceChildren();
        for(const el of document.querySelectorAll("[data-rf-tab]"))el.classList.toggle("rf-active",el.dataset.rfTab===activeTab);
        if(activeTab==="mix") {
            wrap.appendChild(dom("p",{class:"rf-lead"},"Combina CUALQUIER par de materiales existentes, incluso dos iguales, tus customs y resultados anteriores. Las nuevas mezclas se convierten en elementos reutilizables."));
            const a=field("Elemento A (identificador)","water","water"), b=field("Elemento B (identificador)","rf_crystal_dust","rf_crystal_dust");
            a.el.setAttribute("list","rf-elements");b.el.setAttribute("list","rf-elements");wrap.append(a.wrap,b.wrap);
            inputNames(wrap);
            wrap.appendChild(btn("Crear combinación y seleccionar",()=>{try{const out=blend(a.el.value.trim(),b.el.value.trim());if(typeof selectElement==="function")selectElement(out);if(typeof selectCategory==="function")selectCategory(CAT);status(`Resultado: ${elements[out].name||out} (${out})`);renderTab();}catch(e){message(e);}},"rf-primary"));
            wrap.appendChild(dom("p",{class:"rf-info"},"En el mundo: dibuja el Reactor de mezclas y ponle dos materiales distintos al lado. Los consumirá y dejará el resultado. El reactor se encuentra en la categoría Reaction Forge."));
            const samples=dom("div",{class:"rf-samples"});samples.appendChild(dom("strong",{},"Prueba estas combinaciones:"));
            for(const [aa,bb,oo] of starter) samples.appendChild(btn(`${aa} + ${bb} → ${oo}`,()=>{a.el.value=aa;b.el.value=bb;status("Receta de ejemplo cargada. Pulsa Crear combinación.");}));
            wrap.appendChild(samples);
        }
        if(activeTab==="custom") {
            wrap.appendChild(dom("p",{class:"rf-lead"},"Crea una sustancia custom. Luego úsala en el reactor o como ingrediente de nuevas recetas."));
            const n=field("Nombre del nuevo material","Cristal arcoíris"),c=field("Color hexadecimal","#ff72a1","#ff72a1","color"),d=field("Densidad (1-30000)","1400","1400","number");
            d.el.min="1";d.el.max="30000";
            const ph=select("Estado físico",[["solid","Sólido / polvo"],["liquid","Líquido"],["gas","Gas"]],"solid");
            wrap.append(n.wrap,c.wrap,ph.wrap,d.wrap);
            wrap.appendChild(btn("Crear material custom",()=>{try{const id=addCustom(n.el.value,c.el.value,ph.el.value,d.el.value);status(`Creado ${id}. Aparece en Reaction Forge.`);renderTab();}catch(e){message(e);}},"rf-primary"));
            wrap.appendChild(dom("h4",{},`Mis materiales (${state.custom.filter(x=>elements[x.id]).length})`));
            for(const item of state.custom.filter(x=>elements[x.id]))wrap.appendChild(listRow(item.name,`${item.id} · ${item.state} · ${item.color}`,btn("Seleccionar",()=>{selectElement(item.id);selectCategory(CAT);closePanel();})));
        }
        if(activeTab==="recipes") {
            wrap.appendChild(dom("p",{class:"rf-lead"},"Diseña reacciones exactas A + B → producto. El reactor siempre las respeta. También puedes activar reacciones por contacto cuando no choquen con las nativas."));
            const a=field("Ingrediente A","water"),b=field("Ingrediente B","rf_void_dust"),out=field("Resultado (debe existir)","rf_nebula_gel");
            for(const f of [a,b,out]){f.el.setAttribute("list","rf-elements");wrap.appendChild(f.wrap);}inputNames(wrap);
            const label=dom("label",{class:"rf-check"});const checkbox=dom("input",{type:"checkbox"});label.append(checkbox,dom("span",{},"Reaccionar también al tocarse (sin reemplazar reacciones nativas)"));wrap.appendChild(label);
            wrap.appendChild(btn("Guardar receta",()=>{try{const r=addRecipe(a.el.value.trim(),b.el.value.trim(),out.el.value.trim(),checkbox.checked);status(r.ok?"Receta guardada.":`Guardada solo para reactor: ${r.message}`);renderTab();}catch(e){message(e);}},"rf-primary"));
            wrap.appendChild(dom("h4",{},`Mis recetas (${state.recipes.length})`));
            for(const r of state.recipes){if(!goodRecipe(r))continue;wrap.appendChild(listRow(`${r.a} + ${r.b} → ${r.out}`,r.contact?"Reactor + contacto":"Solo reactor",btn("Eliminar",()=>removeRecipe(pair(r.a,r.b)))));}
        }
        if(activeTab==="history") {
            wrap.appendChild(dom("p",{class:"rf-lead"},`Combinaciones generadas: ${state.generated.filter(x=>elements[x.id]).length}. No hay una lista fija de recetas: puedes seguir combinando productos con productos. El espacio y la memoria del navegador son finitos.`));
            wrap.appendChild(btn("Exportar todo a JSON",exportData,"rf-primary"));
            const file=dom("input",{type:"file",accept:".json,application/json"});
            file.addEventListener("change",async()=>{try{const content=await file.files[0]?.text();if(!content)return;importData(content);status("Importado. Recarga Sandboxels para recuperar todos los elementos.");renderTab();}catch(e){message(e);}});wrap.appendChild(file);
            wrap.appendChild(dom("h4",{},"Últimas combinaciones de esta sesión"));
            for(const r of log.slice(0,25))wrap.appendChild(listRow(`${r.a} + ${r.b}`,`→ ${r.out}`,elements[r.out]?btn("Elegir",()=>{selectElement(r.out);selectCategory(CAT);closePanel();}):null));
            wrap.appendChild(dom("h4",{},"Resultados guardados (últimos 70)"));
            for(const r of state.generated.slice(-70).reverse()) if(elements[r.id]) wrap.appendChild(listRow(r.name,`${r.id} · ${r.state}`,btn("Elegir",()=>{selectElement(r.id);selectCategory(CAT);closePanel();})));
            wrap.appendChild(dom("p",{class:"rf-info"},"Exportar hace una copia de seguridad. Si borras los datos del sitio, también borrarás la biblioteca local. No importes archivos JSON desconocidos."));
        }
    }
    function exportData(){
        saveNow();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=dom("a");a.href=u;a.download="reaction_forge_backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);status("Copia JSON exportada.");
    }
    function importData(raw){
        if(raw.length>2500000)throw new Error("El archivo es demasiado grande (máx. 2,5 MB).");
        const d=JSON.parse(raw);
        if(!obj(d)||d.version!==1||!Array.isArray(d.custom)||!Array.isArray(d.recipes)||!Array.isArray(d.generated))throw new Error("Formato JSON no compatible.");
        let customs=0,recipes=0,generations=0;
        for(const x of d.custom){if(!validateCustom(x)||state.custom.some(v=>v.id===x.id)||elements[x.id])continue;
            state.custom.push({id:x.id,name:safeText(x.name,75),color:x.color,state:x.state,density:cap(x.density,1,30000,1400)});
            putElement(x.id,makeElement(x),installed);customs++;
        }
        for(const x of d.generated){if(!obj(x)||typeof x.a!=="string"||typeof x.b!=="string"||typeof x.id!=="string"||!x.id.startsWith("rf_mix_")||!VALID_ID.test(x.id)||mixId(x.a,x.b)!==x.id||!validColor(x.color)||!elements[x.a]||!elements[x.b]||elements[x.id])continue;
            const clean={id:x.id,a:x.a,b:x.b,name:safeText(x.name,75),color:x.color,state:goodState(x.state),density:cap(x.density,1,30000,1400)};
            state.generated.push(clean);putElement(x.id,makeElement(clean),installed);generations++;
        }
        for(const x of d.recipes){if(!goodRecipe(x))continue;addRecipe(x.a,x.b,x.out,x.contact);recipes++;}
        saveNow();status(`Importados: ${customs} materiales, ${generations} mezclas y ${recipes} recetas.`);
    }
    function installUI() {
        if(installed || document.getElementById("rf-root"))return;
        installed=true;
        const st=dom("style");st.textContent=`
#rf-root{position:fixed;inset:0;background:#060b16bf;z-index:999999;display:flex;justify-content:center;align-items:center;padding:10px;box-sizing:border-box;font:14px/1.45 system-ui,Arial,sans-serif;color:#eaf1ff}
#rf-root.rf-hide{display:none}#rf-root *{box-sizing:border-box}
#rf-panel{width:min(700px,100%);max-height:min(89vh,870px);display:flex;flex-direction:column;background:#151e32;border:1px solid #5167a1;border-radius:14px;box-shadow:0 20px 65px #000a;overflow:hidden}
#rf-panel button,#rf-panel input,#rf-panel select{font:inherit}#rf-panel button{cursor:pointer}#rf-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 17px;background:#222d47}
#rf-header h2{font-size:18px;margin:0}#rf-header small{font-size:11px;color:#b8c8e6}#rf-tabs{display:flex;overflow-x:auto;gap:5px;padding:8px;background:#12192b}
#rf-tabs button{background:#2a3450;color:#fff;border:1px solid #435275;border-radius:7px;padding:8px 11px;white-space:nowrap}#rf-tabs button.rf-active{background:#367bc0}
#rf-body{padding:16px 18px;overflow:auto;min-height:100px;flex:1}#rf-body h4{font-size:14px;margin:20px 0 9px}
#rf-body .rf-lead{margin:0 0 14px;color:#d4e1ff}#rf-body .rf-info{background:#26334f;padding:9px;border-radius:7px;color:#e0e9ff}
#rf-body .rf-field{display:flex;flex-direction:column;gap:5px;margin:9px 0}#rf-body .rf-field span{font-size:12px;color:#cedfff}
#rf-body input:not([type=checkbox]),#rf-body select{width:100%;min-height:36px;background:#0c1423;color:#fff;border:1px solid #60739a;border-radius:7px;padding:7px}
#rf-body .rf-action,#rf-header .rf-action{color:#fff;border:1px solid #6178a0;background:#334566;border-radius:7px;padding:7px 11px;margin:3px}
#rf-body .rf-primary{background:#245ea0;border-color:#529bdc;font-weight:700;padding:10px 13px}
#rf-body .rf-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #344361;padding:8px 0;gap:5px;min-width:0}
#rf-body .rf-row-text{min-width:0;overflow-wrap:anywhere}#rf-body .rf-row strong{font-size:12px;display:block}#rf-body .rf-row small{font-size:11px;color:#a9bddf;display:block}
#rf-body .rf-check{display:flex;align-items:center;gap:10px;padding:9px 0}#rf-body .rf-samples{margin-top:16px}#rf-body .rf-samples strong{display:block;margin-bottom:8px}
#rf-status{min-height:34px;padding:9px 16px;color:#a3e2c5;background:#111b2c;border-top:1px solid #344361;font-size:12px;overflow-wrap:anywhere}
@media(max-width:540px){#rf-panel{max-height:92vh}#rf-body{padding:11px}#rf-header{padding:10px}#rf-tabs button{font-size:12px;padding:7px}#rf-header h2{font-size:15px}}
`;document.head.appendChild(st);
        const root=dom("div",{id:"rf-root",class:"rf-hide"}),panel=dom("section",{id:"rf-panel"}),header=dom("div",{id:"rf-header"});
        const title=dom("div");title.append(dom("h2",{},"⚗️ Reaction Forge"),dom("small",{},"v"+VERSION+" · química creativa · Sandboxels"));
        header.append(title,btn("Cerrar ✕",closePanel));panel.appendChild(header);
        const tabs=dom("div",{id:"rf-tabs"});for(const [id,label] of [["mix","Combinar"],["custom","Customs"],["recipes","Recetas"],["history","Mis mezclas"]]) {
            const button=btn(label,()=>{activeTab=id;renderTab();});button.dataset.rfTab=id;tabs.appendChild(button);
        }panel.appendChild(tabs);panel.appendChild(dom("div",{id:"rf-body"}));panel.appendChild(dom("div",{id:"rf-status"},"Listo para experimentar con mezclas ficticias."));root.appendChild(panel);
        root.addEventListener("click",(e)=>{if(e.target===root)closePanel();});
        document.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&!root.classList.contains("rf-hide"))closePanel();});
        document.body.appendChild(root);
        const launch=dom("button",{type:"button",id:"rf-launch"},"⚗️ Reaction Forge");
        launch.className="controlButton";launch.title="Abrir laboratorio de mezclas y reacciones";launch.addEventListener("click",openPanel);
        const near=document.getElementById("modStudioButton")||document.getElementById("modsButton");
        if(near)near.insertAdjacentElement("afterend",launch);
        else document.body.appendChild(launch);
        for(const r of state.recipes)if(goodRecipe(r)) {const result=setContact(r);if(!result.ok){r.contact=false;saveSoon();}}
        renderTab();
    }
    window.ReactionForge=Object.freeze({version:VERSION,blend,addCustom,addRecipe,getData:()=>JSON.parse(JSON.stringify(state)),open:openPanel});
    const queueInstall=()=>setTimeout(installUI,0);
    if(typeof runAfterLoad==="function")runAfterLoad(queueInstall);
    else if(document.readyState==="complete")queueInstall();
    else window.addEventListener("load",queueInstall,{once:true});
})();