/*
 * Mod Studio para Sandboxels — v0.1.0
 * Editor JavaScript, biblioteca de proyectos locales y listado de mods instalados.
 * Creado como mod independiente. No sustituye el administrador original de Sandboxels.
 * Los proyectos se guardan solo en localStorage (origen de la página).
 * Aviso: ejecutar JavaScript otorga al código acceso completo a la página. Ejecuta solo código de confianza.
 */
(function () {
    "use strict";

    if (window.TelloModStudio && window.TelloModStudio.initialized) return;

    const VERSION = "0.1.0";
    const KEY = "tello_mod_studio_projects_v1";
    const TEMPLATE = `// Mi primer elemento en Sandboxels\n// Cambia los valores y activa el proyecto desde Mod Studio.\nelements.tello_polvo_neon = {\n    name: "Polvo Neon",\n    color: ["#62ffdf", "#a36cff", "#e5ff70"],\n    behavior: behaviors.POWDER,\n    category: "Tello Mods",\n    state: "solid",\n    density: 1450,\n    desc: "Un polvo de colores creado programando en Mod Studio."\n};\n`;

    let projects = readProjects();
    let selectedId = projects[0] ? projects[0].id : null;
    let draftCode = selectedId ? projects[0].code : "";
    let draftName = selectedId ? projects[0].name : "";
    let dirty = false;
    let view = "editor";
    let panel = null;
    let wasPaused = false;
    const bootErrors = [];
    const executed = [];
    let refs = {};

    function readProjects() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
            if (!Array.isArray(raw)) return [];
            return raw.filter(p => p && typeof p.id === "string" && typeof p.code === "string" && typeof p.name === "string")
                .map(p => ({ id: p.id, name: p.name, code: p.code, enabled: p.enabled === true, updated: Number(p.updated) || 0 }));
        } catch (error) {
            console.warn("[Mod Studio] No se pudieron leer proyectos:", error);
            return [];
        }
    }
    function persist() {
        try {
            localStorage.setItem(KEY, JSON.stringify(projects));
            return true;
        } catch (error) {
            notify("No se pudo guardar. Comprueba el espacio o permisos del navegador.", true);
            console.error("[Mod Studio] Guardado fallido:", error);
            return false;
        }
    }
    function projectById(id) { return projects.find(p => p.id === id); }
    function getNativeMods() {
        try {
            if (typeof enabledMods !== "undefined" && Array.isArray(enabledMods)) return enabledMods.slice();
            const mods = JSON.parse(localStorage.getItem("enabledMods") || "[]");
            return Array.isArray(mods) ? mods : [];
        } catch (_) { return []; }
    }
    function makeId() {
        return (window.crypto && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : "local_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    }
    function safeFilename(name) {
        return (name.replace(/\.js$/i, "").trim().normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "mi_mod") + ".js";
    }
    function checkSyntax(code) {
        try { new Function(code); return null; }
        catch (error) { return String(error.message || error); }
    }
    // Sandboxels carga el archivo de Mod Studio como script, antes de la creación de botones.
    // Ejecutamos los proyectos activos aquí para que el juego finalice sus nuevos elementos.
    for (const project of projects) {
        if (!project.enabled) continue;
        try {
            const syntaxError = checkSyntax(project.code);
            if (syntaxError) throw new SyntaxError(syntaxError);
            // Ejecución intencional del JavaScript del usuario, en el contexto de Sandboxels.
            // NO es un sandbox de seguridad. No se ejecutan archivos importados sin activación explícita.
            new Function(project.code + "\n//# sourceURL=modstudio-" + safeFilename(project.name))();
            executed.push(project.id);
        } catch (error) {
            bootErrors.push({ name: project.name, message: String(error.message || error) });
            console.error("[Mod Studio] Error en el proyecto " + project.name, error);
            // Evita que un proyecto defectuoso vuelva a ejecutarse automáticamente.
            project.enabled = false;
            try { localStorage.setItem(KEY, JSON.stringify(projects)); } catch (_) { /* continuar */ }
        }
    }

    function el(tag, className, content) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined) node.textContent = content;
        return node;
    }
    function action(label, handler, kind = "") {
        const b = el("button", "tms-action " + kind, label);
        b.type = "button";
        b.addEventListener("click", handler);
        return b;
    }
    function notify(message, error = false) {
        if (refs.status) {
            refs.status.textContent = message;
            refs.status.className = "tms-status" + (error ? " tms-error" : "");
        }
    }
    function confirmDiscard() {
        return !dirty || window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?");
    }
    function syncDraft() {
        if (refs.code) draftCode = refs.code.value;
        if (refs.name) draftName = refs.name.value;
    }
    function markDirty() { syncDraft(); dirty = true; notify("Cambios sin guardar."); }
    function saveCurrent() {
        syncDraft();
        const p = projectById(selectedId);
        if (!p) { notify("Primero crea un proyecto.", true); return false; }
        const name = draftName.trim();
        if (!name) { notify("El proyecto necesita un nombre.", true); return false; }
        const previous = { ...p };
        p.name = name;
        p.code = draftCode;
        p.updated = Date.now();
        if (!persist()) { Object.assign(p, previous); return false; }
        dirty = false;
        notify("Proyecto guardado. Si está activo, recarga para aplicar los cambios.");
        updateCounts();
        fillProjectSelector();
        return true;
    }
    function createProject(template = false) {
        if (!confirmDiscard()) return;
        const count = projects.length + 1;
        const project = { id: makeId(), name: "Mi mod " + count, code: template ? TEMPLATE : "// Escribe tu mod de Sandboxels aqui.\n", enabled: false, updated: Date.now() };
        projects.push(project);
        if (!persist()) { projects.pop(); return; }
        selectedId = project.id;
        draftCode = project.code;
        draftName = project.name;
        dirty = false;
        selectView("editor");
        notify("Proyecto creado. Escribe JavaScript y guárdalo.");
    }
    function selectProject(id) {
        if (id === selectedId) { selectView("editor"); return; }
        if (!confirmDiscard()) { if (refs.picker) refs.picker.value = selectedId || ""; return; }
        const p = projectById(id);
        if (!p) return;
        selectedId = p.id;
        draftName = p.name;
        draftCode = p.code;
        dirty = false;
        selectView("editor");
    }
    function toggleLocal(id) {
        const p = projectById(id);
        if (!p) return;
        if (id === selectedId && dirty && !saveCurrent()) return;
        if (!p.enabled) {
            const syntaxError = checkSyntax(p.code);
            if (syntaxError) { notify("Error de sintaxis: " + syntaxError, true); return; }
            if (!window.confirm("Activar '" + p.name + "' ejecutará su JavaScript al recargar Sandboxels. Activa solo código de confianza. ¿Continuar?")) return;
        }
        p.enabled = !p.enabled;
        if (!persist()) { p.enabled = !p.enabled; return; }
        render();
        notify((p.enabled ? "Activado" : "Desactivado") + ": recarga Sandboxels para aplicar el cambio.");
    }
    function deleteLocal(id) {
        const p = projectById(id);
        if (!p || !window.confirm("¿Eliminar definitivamente el proyecto '" + p.name + "'? Exporta antes si necesitas una copia.")) return;
        const old = projects.slice();
        projects = projects.filter(item => item.id !== id);
        if (!persist()) { projects = old; return; }
        if (selectedId === id) {
            selectedId = projects.length ? projects[0].id : null;
            draftName = selectedId ? projects[0].name : "";
            draftCode = selectedId ? projects[0].code : "";
            dirty = false;
        }
        render();
        notify("Proyecto eliminado. Si estaba activo, recarga para quitar sus efectos.");
    }
    function duplicateLocal(id) {
        const p = projectById(id);
        if (!p) return;
        const copy = { ...p, id: makeId(), name: p.name + " (copia)", enabled: false, updated: Date.now() };
        projects.push(copy);
        if (!persist()) { projects.pop(); return; }
        render();
        notify("Proyecto duplicado.");
    }
    function downloadProject(id) {
        if (id === selectedId && dirty && !saveCurrent()) return;
        const p = projectById(id);
        if (!p) return;
        try {
            const blob = new Blob([p.code], { type: "text/javascript;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = safeFilename(p.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 5000);
            notify("Exportación iniciada: " + link.download);
        } catch (error) { notify("No se pudo exportar: " + String(error.message || error), true); }
    }
    async function importProject(file) {
        if (!file) return;
        if (!/\.js$/i.test(file.name)) { notify("Selecciona un archivo .js", true); return; }
        if (!confirmDiscard()) return;
        try {
            const code = await file.text();
            const project = { id: makeId(), name: file.name.replace(/\.js$/i, ""), code, enabled: false, updated: Date.now() };
            projects.push(project);
            if (!persist()) { projects.pop(); return; }
            selectedId = project.id;
            draftCode = project.code;
            draftName = project.name;
            dirty = false;
            selectView("editor");
            notify("Archivo importado como proyecto desactivado. Revisa el código antes de activarlo.");
        } catch (error) { notify("No se pudo importar: " + String(error.message || error), true); }
    }
    function changeNative(url, remove) {
        try {
            if (remove) {
                if (typeof removeMod !== "function") throw new Error("La API removeMod no está disponible.");
                removeMod(url, true);
            } else {
                if (typeof addMod !== "function") throw new Error("La API addMod no está disponible.");
                addMod(url, true);
            }
            if (typeof changedMods !== "undefined") changedMods = true;
            render();
            notify("Lista de mods actualizada. Recarga para aplicar el cambio.");
        } catch (error) { notify("No se pudo cambiar el mod: " + String(error.message || error), true); }
    }
    function updateCounts() {
        if (refs.counters) refs.counters.textContent = projects.length + " creados · " + projects.filter(p => p.enabled).length + " activos · " + getNativeMods().length + " instalados";
    }
    function fillProjectSelector() {
        if (!refs.picker) return;
        refs.picker.replaceChildren();
        for (const p of projects) {
            const option = el("option", "", p.name + (p.enabled ? " ●" : ""));
            option.value = p.id;
            refs.picker.appendChild(option);
        }
        refs.picker.value = selectedId || "";
    }
    function makeEditor(container) {
        const row = el("div", "tms-row");
        refs.picker = el("select", "tms-input tms-grow");
        refs.picker.setAttribute("aria-label", "Seleccionar proyecto");
        fillProjectSelector();
        refs.picker.addEventListener("change", () => selectProject(refs.picker.value));
        row.append(refs.picker, action("+ Nuevo", () => createProject(false)), action("+ Ejemplo", () => createProject(true)));
        container.appendChild(row);
        const project = projectById(selectedId);
        if (!project) {
            container.appendChild(el("p", "tms-muted", "No tienes proyectos todavía. Pulsa Nuevo o Ejemplo para comenzar."));
            return;
        }
        const label = el("label", "tms-label", "Nombre del proyecto");
        refs.name = el("input", "tms-input");
        refs.name.type = "text";
        refs.name.maxLength = 100;
        refs.name.value = draftName;
        refs.name.addEventListener("input", markDirty);
        label.appendChild(refs.name);
        container.appendChild(label);
        const hint = el("div", "tms-editor-info", "JavaScript · Ctrl+S para guardar · Tab para sangría");
        container.appendChild(hint);
        refs.code = el("textarea", "tms-code");
        refs.code.spellcheck = false;
        refs.code.autocapitalize = "off";
        refs.code.autocomplete = "off";
        refs.code.autocorrect = "off";
        refs.code.value = draftCode;
        refs.code.setAttribute("aria-label", "Editor de código JavaScript");
        refs.code.addEventListener("input", markDirty);
        refs.code.addEventListener("keydown", e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveCurrent(); }
            if (e.key === "Tab") {
                e.preventDefault();
                const start = refs.code.selectionStart;
                const end = refs.code.selectionEnd;
                refs.code.setRangeText("    ", start, end, "end");
                markDirty();
            }
        });
        container.appendChild(refs.code);
        const buttons = el("div", "tms-row tms-bottom-actions");
        buttons.append(
            action("Validar JS", () => { syncDraft(); const err = checkSyntax(draftCode); notify(err ? "Error de sintaxis: " + err : "Sintaxis JavaScript válida. Esto no comprueba las APIs del juego.", !!err); }),
            action("Guardar", () => saveCurrent(), "tms-primary"),
            action(project.enabled ? "Desactivar" : "Activar", () => toggleLocal(project.id)),
            action("Exportar .js", () => downloadProject(project.id))
        );
        container.appendChild(buttons);
        const info = el("p", "tms-muted", project.enabled ? "Este proyecto está activo. Los cambios guardados se aplican después de recargar." : "Este proyecto está desactivado. Actívalo y recarga para probarlo en el juego.");
        container.appendChild(info);
    }
    function makeOwned(container) {
        const top = el("div", "tms-row");
        top.append(action("+ Nuevo proyecto", () => createProject(false), "tms-primary"));
        container.appendChild(top);
        if (!projects.length) container.appendChild(el("p", "tms-muted", "Todavía no has creado mods."));
        projects.forEach(p => {
            const card = el("div", "tms-project");
            const heading = el("div", "tms-project-heading");
            heading.append(el("strong", "", p.name), el("span", "tms-pill" + (p.enabled ? " tms-on" : ""), p.enabled ? "Activo" : "Desactivado"));
            card.appendChild(heading);
            card.appendChild(el("div", "tms-muted", "JavaScript · " + (p.updated ? new Date(p.updated).toLocaleDateString() : "sin fecha")));
            const actions = el("div", "tms-row");
            actions.append(
                action("Editar", () => selectProject(p.id)),
                action(p.enabled ? "Desactivar" : "Activar", () => toggleLocal(p.id)),
                action("Exportar", () => downloadProject(p.id)),
                action("Duplicar", () => duplicateLocal(p.id)),
                action("Eliminar", () => deleteLocal(p.id), "tms-danger")
            );
            card.appendChild(actions);
            container.appendChild(card);
        });
    }
    function makeInstalled(container) {
        container.appendChild(el("p", "tms-muted", "Mods externos habilitados en el administrador oficial de Sandboxels. Los proyectos propios se encuentran en Mis mods."));
        const top = el("div", "tms-row");
        const url = el("input", "tms-input tms-grow");
        url.type = "text";
        url.placeholder = "nombre.js o URL https://...";
        url.setAttribute("aria-label", "Nombre o URL de un mod");
        const add = () => {
            const value = url.value.trim();
            if (!value || !(/^[\w./-]+\.js(?:\?.*)?$/i.test(value) || /^https:\/\/[^\s]+\.js(?:\?.*)?$/i.test(value))) {
                notify("Escribe un archivo .js o una URL HTTPS terminada en .js.", true);
                return;
            }
            changeNative(value, false);
        };
        url.addEventListener("keydown", e => { if (e.key === "Enter") add(); });
        top.append(url, action("Añadir mod", add, "tms-primary"));
        container.appendChild(top);
        const installed = getNativeMods();
        if (!installed.length) container.appendChild(el("p", "tms-muted", "No hay mods externos habilitados."));
        installed.forEach(path => {
            const card = el("div", "tms-project");
            const heading = el("div", "tms-project-heading");
            const name = path.split("/").pop() || path;
            heading.append(el("strong", "", name), el("span", "tms-pill", "Habilitado"));
            card.appendChild(heading);
            card.appendChild(el("div", "tms-modpath", path));
            const actions = el("div", "tms-row");
            actions.append(action("Quitar", () => { if (window.confirm("¿Quitar '" + name + "' de los mods habilitados?")) changeNative(path, true); }, "tms-danger"));
            if (/^https:\/\//i.test(path)) {
                const link = el("a", "tms-external", "Abrir archivo ↗");
                link.href = path;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                actions.appendChild(link);
            }
            card.appendChild(actions);
            container.appendChild(card);
        });
    }
    function render() {
        if (!panel) return;
        refs.picker = null;
        refs.code = null;
        refs.name = null;
        refs.content.replaceChildren();
        refs.tabs.forEach((btn, key) => {
            const active = key === view;
            btn.classList.toggle("tms-selected", active);
            btn.setAttribute("aria-selected", String(active));
        });
        if (view === "editor") makeEditor(refs.content);
        else if (view === "owned") makeOwned(refs.content);
        else makeInstalled(refs.content);
        updateCounts();
    }
    function selectView(next) {
        if (view === "editor" && next !== "editor" && dirty) {
            if (!confirmDiscard()) return;
            const saved = projectById(selectedId);
            draftName = saved ? saved.name : "";
            draftCode = saved ? saved.code : "";
            dirty = false;
        }
        view = next;
        render();
    }
    function openPanel() {
        if (!panel) return;
        if (typeof closeMenu === "function" && typeof showingMenu !== "undefined" && showingMenu) closeMenu();
        wasPaused = (typeof paused !== "undefined") ? paused : false;
        if (typeof paused !== "undefined") {
            paused = true;
            if (typeof checkPause === "function") checkPause();
        }
        panel.hidden = false;
        render();
    }
    function closePanel() {
        if (!panel || panel.hidden) return;
        if (view === "editor" && dirty && !confirmDiscard()) return;
        panel.hidden = true;
        if (typeof paused !== "undefined") {
            paused = wasPaused;
            if (typeof checkPause === "function") checkPause();
        }
    }
    function reloadGame() {
        if (dirty && !saveCurrent()) return;
        if (window.confirm("Se recargará Sandboxels. Guarda la escena del juego antes de continuar. ¿Recargar ahora?")) window.location.reload();
    }
    function injectStyle() {
        if (document.getElementById("tms-styles")) return;
        const style = el("style");
        style.id = "tms-styles";
        style.textContent = `
#tms-root[hidden]{display:none!important} #tms-root{position:fixed;inset:0;z-index:2147483646;background:rgba(7,12,24,.82);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif!important;color:#e9f0ff}
#tms-root *{box-sizing:border-box} #tms-root .tms-window{background:#101a2d;border:1px solid #334766;border-radius:16px;width:min(940px,100%);max-height:min(94dvh,980px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 22px 80px #0009;text-align:left}
#tms-root .tms-header{padding:15px 18px;background:linear-gradient(120deg,#172f50,#151b32);display:flex;align-items:center;justify-content:space-between;gap:8px}
#tms-root h2{font:700 1.25rem system-ui,sans-serif;margin:0;color:#f8fbff} #tms-root .tms-sub{font-size:12px;color:#a7c0dd;margin:3px 0 0}
#tms-root .tms-tabs{display:flex;gap:4px;padding:10px 14px 0;border-bottom:1px solid #334766;flex-wrap:wrap}
#tms-root .tms-tab{color:#b6cae8;background:none;border:0;border-radius:9px 9px 0 0;padding:10px 15px;cursor:pointer;font:600 13px system-ui,sans-serif}
#tms-root .tms-tab.tms-selected{color:#fff;background:#224d7e;box-shadow:inset 0 -3px #69c6ff}
#tms-root .tms-body{padding:16px 18px;overflow:auto;min-height:170px;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}
#tms-root .tms-label{font-size:12px;color:#b9cce6;display:flex;flex-direction:column;gap:7px}
#tms-root .tms-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap} #tms-root .tms-grow{flex:1 1 220px;min-width:0}
#tms-root .tms-input,#tms-root .tms-code{background:#071123;color:#eaf6ff;border:1px solid #39516d;border-radius:9px;font:14px system-ui,sans-serif;min-height:38px;padding:8px 10px;outline:none;width:100%}
#tms-root .tms-input:focus,#tms-root .tms-code:focus{border-color:#5ad5ff;box-shadow:0 0 0 2px #5ad5ff33}
#tms-root .tms-code{font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;height:clamp(180px,37dvh,430px);white-space:pre;tab-size:4;overflow:auto}
#tms-root .tms-editor-info{font-size:11px;color:#95accd}
#tms-root .tms-action{font:600 12px system-ui,sans-serif;color:#d8eaff;background:#223850;border:1px solid #416084;border-radius:8px;padding:9px 11px;cursor:pointer;white-space:nowrap}
#tms-root .tms-action:hover{background:#355878} #tms-root .tms-primary{background:#166394;border-color:#2894cf;color:#fff} #tms-root .tms-danger{color:#ffb6be;border-color:#8e4854}
#tms-root .tms-muted{color:#9bb3cc;font-size:12px;margin:0;line-height:1.5} #tms-root .tms-project{border:1px solid #2e4765;border-radius:10px;background:#14233a;padding:12px;display:flex;flex-direction:column;gap:9px}
#tms-root .tms-project-heading{display:flex;align-items:center;gap:12px;justify-content:space-between;word-break:break-word} #tms-root .tms-project strong{font-size:14px;color:#e2eeff}
#tms-root .tms-pill{border-radius:30px;padding:4px 8px;color:#b2c3d6;background:#26384a;font-size:11px} #tms-root .tms-on{color:#a5ffe0;background:#165449}
#tms-root .tms-modpath{font-size:11px;font-family:monospace;color:#90a8c4;overflow-wrap:anywhere}
#tms-root .tms-external{color:#6fd4ff;font-size:12px} #tms-root .tms-footer{padding:10px 18px;border-top:1px solid #2e4765;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:#0c1729}
#tms-root .tms-status{font-size:12px;color:#98e9d3;overflow-wrap:anywhere;flex:1 1 180px} #tms-root .tms-status.tms-error{color:#ff929e}
#tms-root .tms-close{background:transparent;border:1px solid #62738b;color:#e5eeff;border-radius:8px;font:700 20px system-ui,sans-serif;min-width:34px;height:34px;cursor:pointer}
#tms-root .tms-small{font-size:11px;color:#809bb7} #modStudioButton{border-color:#54a8d6!important}
@media(max-width:550px){#tms-root{padding:5px}#tms-root .tms-window{max-height:98dvh;border-radius:9px}#tms-root .tms-header{padding:12px}#tms-root .tms-body{padding:11px}#tms-root .tms-footer{padding:10px}#tms-root .tms-action{padding:9px;font-size:11px}#tms-root .tms-tab{padding:10px;font-size:12px}}
`;
        document.head.appendChild(style);
    }
    function installUI() {
        if (document.getElementById("tms-root")) return;
        injectStyle();
        const button = el("button", "controlButton", "Mod Studio");
        button.id = "modStudioButton";
        button.title = "Crear y gestionar mods con JavaScript";
        button.type = "button";
        button.addEventListener("click", openPanel);
        const nativeModsButton = document.getElementById("modsButton");
        if (nativeModsButton) nativeModsButton.insertAdjacentElement("afterend", button);
        else (document.getElementById("toolControls") || document.body).appendChild(button);

        panel = el("div");
        panel.id = "tms-root";
        panel.hidden = true;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Mod Studio para Sandboxels");
        const windowNode = el("div", "tms-window");
        const header = el("div", "tms-header");
        const heading = el("div");
        heading.append(el("h2", "", "⚙ Mod Studio"), el("p", "tms-sub", "Crea mods escribiendo JavaScript · v" + VERSION));
        header.append(heading, action("✕", closePanel, "tms-close"));
        const tabs = el("div", "tms-tabs");
        refs.tabs = new Map();
        [["editor", "Editor de código"], ["owned", "Mis mods"], ["installed", "Instalados"]].forEach(([key, label]) => {
            const tab = el("button", "tms-tab", label);
            tab.type = "button";
            tab.setAttribute("role", "tab");
            tab.addEventListener("click", () => selectView(key));
            tabs.appendChild(tab);
            refs.tabs.set(key, tab);
        });
        refs.content = el("div", "tms-body");
        const footer = el("div", "tms-footer");
        const info = el("div", "tms-small");
        refs.counters = info;
        refs.status = el("div", "tms-status", "Los proyectos quedan guardados en este navegador.");
        const fileInput = el("input");
        fileInput.type = "file";
        fileInput.accept = ".js,text/javascript";
        fileInput.hidden = true;
        fileInput.addEventListener("change", async () => {
            await importProject(fileInput.files && fileInput.files[0]);
            fileInput.value = "";
        });
        const footerActions = el("div", "tms-row");
        footerActions.append(action("Importar .js", () => fileInput.click()), action("Recargar", reloadGame, "tms-primary"));
        footer.append(info, refs.status, footerActions, fileInput);
        windowNode.append(header, tabs, refs.content, footer);
        panel.appendChild(windowNode);
        panel.addEventListener("click", event => { if (event.target === panel) closePanel(); });
        panel.addEventListener("keydown", event => {
            if (event.key === "Escape") { event.stopPropagation(); closePanel(); }
        });
        document.body.appendChild(panel);
        render();
        if (bootErrors.length) notify("Un mod propio falló y se desactivó: " + bootErrors.map(e => e.name + " (" + e.message + ")").join("; "), true);
    }

    window.TelloModStudio = { initialized: true, version: VERSION, open: openPanel, getProjects: () => projects.map(p => ({ id: p.id, name: p.name, enabled: p.enabled, updated: p.updated })), bootErrors };
    if (typeof runAfterLoad === "function" && document.readyState !== "complete") runAfterLoad(installUI);
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installUI, { once: true });
    else installUI();
})();