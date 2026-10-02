/*
 * Reaction Forge — contacto directo v0.4 para Sandboxels / Mod Studio
 * Pinta 2-6 elementos distintos uno junto al otro; genera una sustancia ficticia.
 * NO es un simulador de química real. No necesita interfaz ni reactor.
 * Instalar UN solo proyecto Reaction Forge a la vez y recargar Sandboxels.
 */
(function () {
    "use strict";

    if (window.ReactionForgeTest) {
        console.info("[Reaction Forge] Ya está activo.");
        return;
    }
    if (window.ReactionForge) {
        console.warn("[Reaction Forge] Desactiva la versión completa anterior para evitar conflictos.");
        return;
    }
    if (typeof elements === "undefined" || typeof behaviors === "undefined" ||
        typeof runPerPixel !== "function" || typeof changePixel !== "function" ||
        typeof deletePixel !== "function" || typeof pixelMap === "undefined") {
        console.error("[Reaction Forge] Debes ejecutar este script dentro de Sandboxels.");
        return;
    }

    const STORAGE = "reaction_forge_modstudio_test_v1"; // Conserva las mezclas del script anterior.
    const PREFIX = "rft_mix_";
    const MAX_RECIPES = 3000;
    const MAX_PER_TICK = 6;
    const MAX_GROUP = 6;
    const FRESH_TICKS = 90;
    const NEIGHBORS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    const own = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(Number.isFinite(n) ? n : 160)));
    let enabled = true;
    let tickNumber = -1;
    let perTick = 0;
    let reactions = 0;
    let saveTimer = null;
    let saved = [];
    const byPair = new Map();
    let restoring = false;

    function pair(a, b) { return JSON.stringify([a, b].sort()); }
    function hash(text, seed) {
        let h = seed >>> 0;
        for (let i = 0; i < text.length; i++) {
            h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        }
        return (h >>> 0).toString(16).padStart(8, "0");
    }
    function recipeId(a, b) {
        const k = pair(a, b);
        return PREFIX + hash(k, 2166136261) + hash(k, 374761393);
    }
    function hasElement(id) {
        return typeof id === "string" && own(elements, id) &&
            !!elements[id] && typeof elements[id] === "object";
    }
    function ingredient(id) {
        if (!hasElement(id) || id === "air" || id === "unknown") return false;
        const e = elements[id];
        return e.tool === undefined && e.canPlace !== false;
    }
    function normalizedColor(value) {
        if (Array.isArray(value)) return normalizedColor(value[0]);
        if (value && typeof value === "object" &&
            Number.isFinite(value.r) && Number.isFinite(value.g) && Number.isFinite(value.b)) {
            return [clamp(value.r), clamp(value.g), clamp(value.b)];
        }
        if (typeof value === "string") {
            let m = /^#([0-9a-f]{6})$/i.exec(value);
            if (m) return [0,2,4].map(i => parseInt(m[1].slice(i,i+2), 16));
            m = /^#([0-9a-f]{3})$/i.exec(value);
            if (m) return [...m[1]].map(c => parseInt(c+c, 16));
            m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
            if (m) return m.slice(1,4).map(n => clamp(Number(n)));
        }
        return [160,160,160];
    }
    function toHex(c) { return "#" + c.map(n => clamp(n).toString(16).padStart(2, "0")).join(""); }
    function densityOf(e) {
        return Number.isFinite(e.density) && e.density >= 0 ? e.density :
            (e.state === "gas" ? 1.2 : 1500);
    }
    function makeRecipe(a, b, id, defA, defB) {
        const ac = normalizedColor(defA.colorObject || defA.color);
        const bc = normalizedColor(defB.colorObject || defB.color);
        const state = defA.state === "liquid" || defB.state === "liquid" ? "liquid" :
            (defA.state === "gas" && defB.state === "gas" ? "gas" : "solid");
        let name = String(defA.name || a) + " + " + String(defB.name || b);
        if (name.length > 72) name = name.slice(0, 61) + "…" + id.slice(-7);
        return {
            id, a, b, name,
            color: toHex(ac.map((v,i) => (v + bc[i]) / 2)),
            state,
            density: Math.round((densityOf(defA) + densityOf(defB)) / 2)
        };
    }
    function definition(r) {
        return {
            name: String(r.name || (r.a + " + " + r.b)).slice(0, 75),
            color: r.color,
            behavior: r.state === "gas" ? behaviors.GAS :
                (r.state === "liquid" ? behaviors.LIQUID : behaviors.POWDER),
            category: "reaction_forge",
            state: r.state,
            density: r.density,
            excludeRandom: true,
            rfRecipe: pair(r.a,r.b),
            desc: "Sustancia ficticia creada por contacto. Puedes mezclarla otra vez."
        };
    }
    function isOurElement(r) {
        return hasElement(r.id) && elements[r.id].rfRecipe === pair(r.a,r.b);
    }
    function register(r) {
        if (hasElement(r.id)) return isOurElement(r);
        const obj = definition(r);
        // Antes de onload: Sandboxels terminará de registrar elements[] automáticamente.
        // Después de onload: addElement actualiza IDs, colores y botones de la categoría.
        const live = typeof addElement === "function" && typeof document !== "undefined" &&
            !!document.getElementById("elementCountSpan") &&
            !!document.getElementById("categoryControls") &&
            !!document.getElementById("elementControls");
        try {
            if (live) addElement(r.id, obj);
            else elements[r.id] = obj;
            return true;
        } catch (error) {
            console.warn("[Reaction Forge] No se pudo registrar", r.id, error);
            return false;
        }
    }
    function restore() {
        if (restoring) return;
        restoring = true;
        try {
            let todo = saved.slice();
            let progress = true;
            while (todo.length && progress) {
                progress = false;
                todo = todo.filter(r => {
                    if (isOurElement(r)) return false;
                    if (hasElement(r.id) || !ingredient(r.a) || !ingredient(r.b)) return true;
                    if (!register(r)) return true;
                    progress = true;
                    return false;
                });
            }
        } finally {
            restoring = false;
        }
    }
    function readStorage() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE) || "[]");
            if (!Array.isArray(data)) return;
            const seenIds = new Set();
            for (const r of data) {
                if (!r || typeof r.a !== "string" || typeof r.b !== "string" ||
                    typeof r.id !== "string" || r.id !== recipeId(r.a, r.b) ||
                    !/^#[0-9a-f]{6}$/i.test(r.color) ||
                    !["solid","liquid","gas"].includes(r.state) ||
                    typeof r.name !== "string" ||
                    seenIds.has(r.id) || saved.length >= MAX_RECIPES) continue;
                const clean = {
                    id:r.id, a:r.a, b:r.b, name:r.name.slice(0,75),
                    color:r.color, state:r.state,
                    density: Number.isFinite(r.density) && r.density >= 0 ? r.density : 1500
                };
                saved.push(clean);
                byPair.set(pair(clean.a,clean.b),clean);
                seenIds.add(r.id);
            }
        } catch (error) {
            console.warn("[Reaction Forge] No se pudieron leer las mezclas guardadas:",error);
        }
    }
    function save() {
        if (saveTimer !== null) clearTimeout(saveTimer);
        saveTimer = null;
        try { localStorage.setItem(STORAGE, JSON.stringify(saved)); }
        catch (error) { console.warn("[Reaction Forge] Error al guardar mezclas:",error); }
    }
    function scheduleSave() {
        if (saveTimer === null) saveTimer = setTimeout(save, 950);
    }
    function isPixel(p) {
        return !!(p && !p.del && Number.isInteger(p.x) && Number.isInteger(p.y) &&
            p.x >= 0 && p.y >= 0 &&
            ingredient(p.element) && pixelMap[p.x]?.[p.y] === p);
    }
    function hasNativeReaction(a, b) {
        return !!((elements[a] && elements[a].reactions && own(elements[a].reactions,b)) ||
                  (elements[b] && elements[b].reactions && own(elements[b].reactions,a)));
    }
    function groupFor(origin) {
        const group = [origin], types = new Set([origin.element]);
        for (const [dx,dy] of NEIGHBORS) {
            const x = origin.x + dx, y = origin.y + dy;
            if (x < 0 || y < 0 || (typeof outOfBounds === "function" && outOfBounds(x,y))) continue;
            const next = pixelMap[x]?.[y];
            if (!isPixel(next) || types.has(next.element)) continue;
            if (group.some(p => hasNativeReaction(p.element, next.element))) continue;
            group.push(next);
            types.add(next.element);
            if (group.length === MAX_GROUP) break;
        }
        return group;
    }
    function plan(group) {
        // Planificar ANTES de guardar o tocar los píxeles: o se crea todo o nada.
        const ids = group.map(p => p.element).sort();
        const newRecipes = [];
        const freshDefinitions = new Map();
        let result = ids[0];
        for (const next of ids.slice(1)) {
            const k = pair(result, next);
            const old = byPair.get(k);
            if (old) {
                if (hasElement(old.id) && !isOurElement(old)) return null;
                if (!hasElement(old.id)) {
                    if (!ingredient(old.a) || !ingredient(old.b)) return null;
                    newRecipes.push({ preexisting: true, recipe: old });
                    freshDefinitions.set(old.id, definition(old));
                }
                result = old.id;
                continue;
            }
            if (saved.length + newRecipes.filter(x => !x.preexisting).length >= MAX_RECIPES) return null;
            const id = recipeId(result,next);
            if (hasElement(id) && elements[id].rfRecipe !== k) return null;
            const defA = freshDefinitions.get(result) || elements[result];
            const defB = freshDefinitions.get(next) || elements[next];
            if (!defA || !defB) return null;
            const recipe = makeRecipe(result, next, id, defA, defB);
            newRecipes.push({ preexisting: false, recipe });
            freshDefinitions.set(id, definition(recipe));
            result = id;
        }
        return { result, newRecipes };
    }
    function createProduct(group) {
        const expected = group.map(p => p.element);
        const outcome = plan(group);
        if (!outcome) return false;
        if (group.some((p,i) => !isPixel(p) || p.element !== expected[i])) return false;
        for (const { recipe } of outcome.newRecipes) {
            if (!register(recipe)) return false;
        }
        if (!hasElement(outcome.result)) return false;
        for (const entry of outcome.newRecipes) {
            if (!entry.preexisting) {
                saved.push(entry.recipe);
                byPair.set(pair(entry.recipe.a,entry.recipe.b),entry.recipe);
            }
        }
        if (outcome.newRecipes.some(x => !x.preexisting)) scheduleSave();
        try {
            changePixel(group[0],outcome.result);
            group[0]._reactionForgeMade = true; // Evita cascadas; nuevas colocaciones siguen reaccionando.
            for (let i=1;i<group.length;i++) deletePixel(group[i].x,group[i].y);
        } catch (error) {
            console.warn("[Reaction Forge] Error procesando contacto:", error);
            return false;
        }
        reactions++;
        return true;
    }
    function contact(pixel) {
        if (!enabled || !pixel || pixel._reactionForgeMade || pixel.del ||
            typeof pixelTicks !== "number") return;
        if (tickNumber !== pixelTicks) { tickNumber = pixelTicks; perTick = 0; }
        if (perTick >= MAX_PER_TICK) return;
        const age = pixelTicks - pixel.start;
        if (!Number.isFinite(age) || age < 1 || age > FRESH_TICKS) return;
        if ((pixelTicks + pixel.x*7 + pixel.y*11) % 4 !== 0) return;
        if (!isPixel(pixel)) return;
        const group = groupFor(pixel);
        if (group.length < 2) return; // Agua + agua no crea un material nuevo.
        if (createProduct(group)) perTick++;
    }

    readStorage();
    restore();
    if (typeof runAfterLoad === "function") runAfterLoad(restore);
    runPerPixel(contact);
    if (typeof window.addEventListener === "function") window.addEventListener("pagehide", save);

    window.ReactionForgeTest = Object.freeze({
        version: "0.4",
        pause() { enabled = false; },
        resume() { enabled = true; },
        stats() { return { enabled, reacciones:reactions, mezclasGuardadas:saved.length }; },
        exportJSON() { return JSON.stringify(saved,null,2); }
    });
    console.info("[Reaction Forge v0.4] Activo: coloca juntos 2-6 elementos DISTINTOS.");
})();