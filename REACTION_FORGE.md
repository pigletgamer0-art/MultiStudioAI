# Reaction Forge para Sandboxels — v0.1.0

Un mod NO OFICIAL de **química creativa** para Sandboxels. Permite combinar cualquier pareja de elementos existentes, generar sustancias ficticias nuevas y combinarlas de nuevo sin depender de un catálogo fijo. *No simula reacciones químicas reales ni enseña a fabricar sustancias en la vida real.*

## Instalación

1. Abre https://sandboxels.r74n.com/.
2. Ve a **Mods**.
3. Pega la URL completa del mod:

   `https://cdn.jsdelivr.net/gh/pigletgamer0-art/MultiStudioAI@sandboxels-mod-studio-v0.1/reaction_forge.js`

   Si el CDN tarda en actualizar, prueba:

   `https://raw.githubusercontent.com/pigletgamer0-art/MultiStudioAI/sandboxels-mod-studio-v0.1/reaction_forge.js`

4. Pulsa Enter y **recarga** la página.
5. Verás el botón **⚗️ Reaction Forge** cerca de Mods y Mod Studio.

## Funciones

- **Combinar:** introduce dos identificadores de elemento (por ejemplo, `water` y `sand`), obtén un nuevo material y selecciónalo para dibujar. Puedes combinarlo de nuevo, indefinidamente en teoría; en la práctica depende de la memoria y almacenamiento del navegador.
- **Customs:** crea elementos propios con nombre, color, estado (`solid`, `liquid`, `gas`) y densidad.
- **Recetas:** define `Ingrediente A + Ingrediente B → Resultado`. Las recetas funcionan en el reactor. Opcionalmente reaccionan por contacto, siempre que no se sobrescriba una reacción nativa existente.
- **Mis mezclas:** historial reciente, resultados persistentes, copia de seguridad e importación de JSON.
- **Reactor de mezclas:** pon dos píxeles de ingredientes junto al reactor, que aparecerá en la categoría **Reaction Forge**. Consume dos píxeles y genera uno del material resultante. Usa primero las recetas explícitas; de lo contrario crea mezclas procedurales.
- **Recetas iniciales:** cinco combinaciones ficticias predefinidas para experimentar.

**Combinaciones sin lista fija no significa química infinita real.** Las sustancias generadas usan una mezcla aproximada de color, fase y densidad, no cálculos moleculares. Para combinaciones de tres ingredientes, crea una mezcla A+B y vuelve a combinarla con C.

## Guardado y privacidad

El mod utiliza `localStorage` en tu navegador. Los proyectos no se suben a servidores propios. Usa **Mis mezclas → Exportar todo a JSON** como respaldo antes de borrar datos del sitio, cambiar de dispositivo o eliminar mods. Puedes importar el archivo después.

El archivo `ejemplo_customs.json` contiene dos elementos de demostración y una receta para importar.

## Estado de las pruebas

- Sintaxis validada con Node.js.
- Pruebas de motor con APIs simuladas: recetas, mezclas en cadena, reinicio, reactor, conflictos con reacciones existentes.
- Interfaz probada en Chromium con una página simulada de Sandboxels a 412px de ancho, sin errores JavaScript.
- **Pendiente:** probar el mod con la web real de Sandboxels en Android y PC, con otros mods y archivos de guardado.

## Seguridad

Solo importa JSON de fuentes de confianza. Las reacciones son ficticias y no representan instrucciones para experimentos químicos reales.
