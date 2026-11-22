# Matriz preliminar de funciones — Mobile Studio 2.0 y 2.5

Fecha: 2026-11-22.

Esta matriz organiza **indicios estáticos** encontrados en cadenas/símbolos DEX y textos de interfaz. No es una prueba de que cada función sea accesible, esté completa o funcione en ejecución. La etiqueta de versión indica dónde se observó la evidencia en esta revisión, no necesariamente dónde se introdujo por primera vez.

## Evidencia por versión

| Área | Evidencia observada en 2.0 | Evidencia observada en 2.5 | Estado |
|---|---|---|---|
| Edición de scripts | `ScriptEditor`, textos de creación/edición de scripts | No clasificado en esta pasada | Confirmado como indicio en 2.0 |
| Terreno | `TerrainPanel` | No clasificado en esta pasada | Confirmado como indicio en 2.0 |
| Toolbox | `ToolboxPanel` | `addSelectionToToolbox`, “Import Model into Toolbox” | Evidencia en ambas áreas; flujo exacto pendiente |
| Plugins | `PluginApi`, `BetaPlugin`, validación/errores de plugins | `managePlugins`, `activatePlugin`, `deactivatePlugin`, `pluginRoot`, `importZip`; “Install Plugin from File”; “Install Plugin from Roblox (ID or link)” | Evidencia en ambas; comparar implementación |
| Avatares | `Avatar`, opciones R6/R15 | `Avatar.buildR15`, `addAccessories`, `composeClothing`, `applyTo` | Evidencia en ambas; 2.5 expone símbolos adicionales |
| Playtest | referencias a playtest | `startPlay`, `stopPlay`, `playAs`, `playHere` | Evidencia en ambas |
| Edición/selección de objetos | No clasificado en esta pasada | `multiSelect`, `boxSelect`, `groupSelection`, `ungroupSelection`, `insertObject`, `insertConstraint`, `copySelection`, `deleteSelection`, `setAnchored`, `renderParts` | Indicios en 2.5; exclusividad no demostrada |
| Archivos y modelos | referencias a guardado/sincronización | `openPlaceBytes`, `openRecentFile`, `exportSelection`; “Export Selection (.rbxm)”; “Save a Copy to This Device” | Evidencia más detallada en 2.5 |
| Nube/publicación | `RobloxCloud`, `syncFromCloud`, referencias a publicación/guardado | “Publish to Roblox” | Evidencia en ambas; flujos y autenticación pendientes |
| IA/Anthropic | Clases del SDK Anthropic y cadenas sobre API key/guardado | No identificado en la extracción resumida disponible | Integración SDK empaquetada en 2.0; disponibilidad funcional no verificada |

## Elementos comunes confirmados por comparación binaria

- Los 42 archivos de fuentes en `assets/fonts/` son idénticos byte a byte.
- Los 134 archivos de materiales en `assets/materials/` son idénticos byte a byte.
- De 967 rutas presentes en ambos APK, 245 tienen contenido idéntico y 722 difieren.

Que un recurso sea idéntico no demuestra que su interfaz o comportamiento sea idéntico: el código que lo consume puede haber cambiado.

## Decisiones de integración propuestas

1. **Identidad visual:** conservar el icono launcher de 2.0, tal como pidió el usuario.
2. **Funciones:** no eliminar las áreas de 2.0 que muestran indicios propios (editor de scripts, terreno e integración Anthropic) al evaluar las capacidades de 2.5.
3. **Edición avanzada:** investigar y portar de forma incremental los flujos de selección, agrupación, restricciones, exportación e importación de plugins observados en 2.5.
4. **Avatar y playtest:** comparar las implementaciones completas antes de escoger una como base.
5. **Package ID:** escoger uno solo para la aplicación reconstruida y revisar autoridades, permisos, almacenamiento, enlaces y servicios asociados.
6. **Seguridad:** revisar manejo de API keys, credenciales y endpoints antes de reutilizar cualquier integración de nube o IA.

## Próxima verificación necesaria

La siguiente etapa requiere decodificación/decompilación con herramientas como JADX y apktool en un entorno autorizado. Para cada función habrá que registrar: clase/método, llamadas relevantes, recursos/pantallas asociados, dependencias, permisos, resultado de prueba y decisión (portar, reimplementar, reemplazar o descartar).

**No se debe fusionar DEX, manifiestos o recursos a ciegas.** Esta matriz es una guía de investigación, no una implementación ni un APK listo para instalar.
