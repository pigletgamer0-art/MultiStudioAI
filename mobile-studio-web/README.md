# Mobile Studio Web

Reconstrucción incremental del editor Mobile Studio para navegador. Se aloja en este subdirectorio para no alterar la aplicación MultiStudio AI existente en la raíz del repositorio.

## Primera base funcional

- Editor de escena 3D con Three.js, cámara orbital y gizmos mover/rotar/escalar.
- Creación, selección, duplicación, eliminación e inspección de primitivas.
- Edición de posición, rotación, escala, color y nombre.
- Guardado local, importación y exportación de proyectos JSON.
- Terreno editable con pincel de elevación, bajada y aplanado.
- Editor de texto Luau, constructor de maniquí R6/R15, paleta de materiales.
- Importación segura de manifiestos JSON de plugins (solo metadatos; no ejecuta código externo).

## Desplegar en Vercel

1. Importa el repositorio `pigletgamer0-art/MultiStudioAI` en Vercel.
2. En **Configure Project**, establece **Root Directory** en `mobile-studio-web`.
3. Framework Preset: **Other**.
4. Build Command: vacío. Output Directory: `.`.
5. Pulsa Deploy.

También puedes ejecutar `vercel --prod` desde este directorio usando Vercel CLI.

Three.js y sus controles se cargan desde jsDelivr; el navegador necesita conexión a Internet.

## Límites conocidos

Esta entrega es un prototipo web inicial, no una conversión binaria ni una réplica completa del APK. El editor Luau no ejecuta scripts; Playtest es una vista previa; el avatar es un maniquí; el soporte RBXM/RBXMX, agrupación, undo/redo, plugins ejecutables aislados, publicación/cloud Roblox, IA y persistencia multiusuario siguen pendientes. No se ha reutilizado ni publicado código fuente Android inexistente. Las funciones que se vieron como símbolos en los APK son indicios estáticos, no prueba de funcionamiento.

Consulta `../docs/FEATURE_MATRIX.md` y `../docs/APK_AUDIT.md` para la evidencia estática que guía la reconstrucción.
