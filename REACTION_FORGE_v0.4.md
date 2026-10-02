# Reaction Forge — Script v0.4 para Mod Studio de Sandboxels

## Instalación

1. Abre Sandboxels con Mod Studio instalado.
2. En **Mod Studio → Editor**, crea un proyecto nuevo.
3. Pega TODO el contenido del archivo `Reaction_Forge_Mod_Studio_v0.4.js`.
4. Guarda, activa el proyecto y recarga Sandboxels.
5. Coloca dos o más elementos distintos que se toquen para que el contacto cree una nueva mezcla ficticia.

Desactiva otras versiones de Reaction Forge (como la v0.3 o la prueba anterior) antes de recargar, para evitar conflictos.

## Cambios respecto a v0.3-test

- Las masas de un solo material ya no generan compuestos nuevos.
- Agrupa hasta 6 materiales distintos cercanos; un montón de agua ya no desplaza otro ingrediente.
- Las reacciones originales tienen prioridad: todos los pares del grupo se comprueban.
- Las mezclas se preparan y validan antes de escribirlas y consumir los píxeles.
- Los resultados se pueden combinar más adelante colocándoles al lado un nuevo elemento.
- Compatible con los elementos físicos de otros mods, excluidas las herramientas que no crean píxeles.
- Registro antes y después de cargar Sandboxels.
- Lectura defensiva de recetas anteriores en `reaction_forge_modstudio_test_v1`.
- Protección contra sobrecarga: máximo 6 reacciones por ciclo y 3000 recetas guardadas.

## Datos y privacidad

Las mezclas se guardan únicamente en `localStorage` del navegador, sin enviarse a un servidor. Borra o exporta los datos antes de eliminar almacenamiento del sitio.

Desde la consola del navegador puedes usar:
- `ReactionForgeTest.stats()` para consultar el estado.
- `ReactionForgeTest.pause()` y `.resume()` para parar/reanudar combinaciones.
- `ReactionForgeTest.exportJSON()` para copiar todas las recetas como texto JSON.

**Advertencias:** las mezclas son ficticias, no química real; las herramientas que no crean píxeles no participan en mezclas espaciales. Al mezclar, se consumen los píxeles originales. Conserva una copia de mundos importantes.

## Validación

19 pruebas unitarias simuladas en Node.js y comprobación de sintaxis JavaScript. No se pudo completar una prueba de navegador real en este entorno, por lo que la integración con el Sandboxels oficial queda por verificar.