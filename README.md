# Reaction Forge para Sandboxels — v0.2.0

Mod NO OFICIAL de química creativa para Sandboxels. Elige **cualquier elemento registrado en el juego**, incluyendo los de otros mods, herramientas que estén listadas en `elements` (en el editor) y elementos personalizados. Genera combinaciones ficticias por parejas o mezclas encadenadas con 2 a 32 ingredientes.

## Instalación

1. Abre https://sandboxels.r74n.com/.
2. En **Mods**, pega la URL completa:
   `https://cdn.jsdelivr.net/gh/pigletgamer0-art/MultiStudioAI@sandboxels-reaction-forge-v0.2/reaction_forge.js`
3. Confirma y recarga Sandboxels. Verás el botón **Reaction Forge**.

URL alternativa si la CDN tarda:
`https://raw.githubusercontent.com/pigletgamer0-art/MultiStudioAI/sandboxels-reaction-forge-v0.2/reaction_forge.js`

**Si usas la v0.1, desactiva primero la URL antigua para evitar cargas duplicadas.** Las creaciones almacenadas en el mismo navegador y dominio se conservan al usar v0.2, pero exporta tu copia JSON antes de cambiar.

## Funciones

- **Combinar**: admite todos los IDs registrados en `elements`, incluidos los que añade otro mod. Usa el autocompletado o el identificador exacto del elemento. Pulsa **Actualizar catálogo** si has agregado elementos durante la sesión.
- **Mezcla múltiple**: 2 a 32 ingredientes, separados por comas o líneas. Los resultados se vuelven a mezclar en cadena. No se generan todas las parejas de golpe; se crean cuando el usuario las pide.
- **Customs**: inventa elementos con nombre, color hexadecimal, fase y densidad.
- **Recetas**: define qué produce A+B, opcionalmente al contacto sin sobrescribir una reacción nativa existente.
- **Reactor**: produce combinaciones usando dos **píxeles físicos** vecinos del reactor, no herramientas. Los materiales originales siguen funcionando sin alteraciones globales.
- **Mis mezclas**: biblioteca persistente y JSON de importación/exportación.

## Mejoras de la v0.2

- Ya no descarta identificadores de un solo carácter, no convencionales, ni materiales de otros mods o herramientas en el editor.
- Corrige los resultados que dependían de otros mods y la restauración de cadenas largas (>16 generaciones) al recargar.
- Corrige el guardado que podía retrasarse indefinidamente durante la generación continua y añade guardado al salir de la página.
- Protege los IDs que pertenecen a otros mods para no sobrescribir elementos accidentalmente.
- Usa un índice rápido para reutilizar productos y manejar catálogos grandes.
- Incluye recuento de elementos y mezclador encadenado de hasta 32 ingredientes.

## Limitaciones importantes

- **Todas las combinaciones posibles**, no significa que existan ya resultados predefinidos o química real. Las mezclas se generan a demanda y son ficticias.
- Puedes usar herramientas como ingredientes manuales en el editor porque están en el registro `elements`, pero no es posible hacer que un reactor consuma una herramienta que no es un píxel físico.
- El tamaño de las bibliotecas está limitado por la RAM y almacenamiento del navegador. No es infinito literalmente. Grandes mezclas pueden ralentizar Sandboxels.
- Se conservan las reacciones del juego original; dos sustancias ordinarias no reaccionarán automáticamente si no están en el reactor o no has creado una receta de contacto.
- Si otra modificación instala sus elementos solo después de que Reaction Forge haya cargado, abrir el panel o actualizar el catálogo recupera las mezclas dependientes cuando corresponda.

## Pruebas

Comprobaciones automatizadas: sintaxis Node.js, 19 escenarios del motor en Sandboxels simulado, registro grande de 1.558 elementos, 300 mezclas adicionales, cadenas de 32 ingredientes, persistencia y restauración, interfaz móvil simulada en Chromium sin errores JS. **No se ha comprobado todavía la carga dentro del sitio oficial real.**

Archivo ZIP incluye el código fuente, este README, pruebas, un ejemplo JSON y un HTML de simulación. Esta versión no necesita claves API, cuentas ni conexión con terceros más allá de cargar Sandboxels/mod.