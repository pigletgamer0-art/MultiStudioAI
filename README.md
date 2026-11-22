# Mobile Studio — análisis de integración

Este repositorio documenta el análisis de los APK de Mobile Studio 2.0 y 2.5 y prepara una ruta reproducible para una futura reconstrucción.

## Objetivo acordado
- Conservar el icono/logotipo de Mobile Studio 2.0.
- Investigar y recuperar, cuando sea técnicamente posible y esté autorizado, las funciones de ambas versiones.
- No sustituir ni sobrescribir los APK originales.
- No declarar una integración terminada hasta compilar e instalar una aplicación reconstruida y probar sus funciones.

## Estado real
**Análisis estático parcial. Todavía no existe una aplicación unificada ni un proyecto Android compilable.**

Los APK se han inspeccionado directamente: inventario ZIP, hashes SHA-256, estructura DEX, recursos y comparación byte a byte de archivos comunes. El análisis preliminar de cadenas DEX muestra, entre otras evidencias, editor de scripts/terreno e integración Anthropic en 2.0; en 2.5 aparecen símbolos de construcción de avatares R15, gestión/importación de plugins, selección/edición de objetos y exportación de modelos. La clasificación final de funciones comunes y exclusivas requiere una decompilación completa con JADX/apktool.

## Hallazgos verificables
- 2.0: 16 archivos DEX; 2.5: 11.
- Los application ID son distintos: 2.0 usa `com.exampletest.mobilestudiotest` y 2.5 `com.tetrazbloxy.mobilestudio`; no se instalarán como una actualización mutua sin elegir y adaptar un único ID.\n- Las dos versiones comparten 42 archivos de fuentes y 134 archivos de materiales, idénticos byte a byte.
- De 967 rutas comunes, 245 son idénticas y 722 difieren.
- El informe detallado está en [docs/APK_AUDIT.md](docs/APK_AUDIT.md).

## Herramientas
- `python tools/inspect_apks.py archivo.apk`: inventario y SHA-256.
- `python tools/compare_apks.py version2.0.apk version2.5.apk`: comparación reproducible de estructura, tamaños DEX y hashes de recursos.

## Archivos originales
Por seguridad y por límites prácticos de publicación, los APK originales no se incluyen en este repositorio público. Consérvalos localmente y verifica sus hashes con el informe.

## Próximos pasos
1. Decodificar manifiestos y recursos con `apktool`.
2. Descompilar DEX con JADX y comparar clases/métodos.
3. Elaborar una matriz de funciones nuevas, compartidas, modificadas y retiradas.
4. Confirmar derechos de modificación y redistribución de los componentes.
5. Reconstruir en un proyecto Android independiente y probar en dispositivo/emulador.
