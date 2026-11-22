# Mobile Studio — análisis de integración

Este repositorio documenta el análisis de los paquetes Mobile Studio 2.0 y 2.5 y prepara una ruta reproducible para una futura reconstrucción.

## Objetivo acordado
- Conservar el icono/logotipo de Mobile Studio 2.0.
- Investigar y recuperar, cuando sea técnicamente posible y esté autorizado, las funciones de ambas versiones.
- No sustituir ni sobrescribir los paquetes originales.
- No declarar una integración terminada hasta compilar e instalar una aplicación reconstruida y probar sus funciones.

## Estado real
**Análisis estático parcial. Todavía no existe una aplicación unificada ni un proyecto Android compilable.**

Los archivos ZIP que se acaban de aportar se han comprobado: son contenedores ZIP de los mismos paquetes APK (sus SHA-256 coinciden con los APK analizados anteriormente). No contienen un proyecto fuente Android: no aparecen `settings.gradle`, `build.gradle`, `gradlew` ni archivos bajo `app/src/`.

El análisis preliminar de cadenas DEX muestra, entre otras evidencias, editor de scripts/terreno e integración SDK Anthropic en 2.0; en 2.5 aparecen símbolos de construcción de avatares R15, gestión/importación de plugins, selección/edición de objetos y exportación de modelos. La clasificación final de funciones comunes y exclusivas requiere una decompilación completa con JADX/apktool.

## Hallazgos verificables
- 2.0: 16 archivos DEX; 2.5: 11.
- Los application ID son distintos: 2.0 usa `com.exampletest.mobilestudiotest` y 2.5 `com.tetrazbloxy.mobilestudio`; no se instalarán como una actualización mutua sin elegir y adaptar un único ID.
- Las dos versiones comparten 42 archivos de fuentes y 134 archivos de materiales, idénticos byte a byte.
- De 967 rutas comunes, 245 son idénticas y 722 difieren.
- Informe técnico: [docs/APK_AUDIT.md](docs/APK_AUDIT.md).
- Matriz preliminar de funciones: [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md).

## Herramientas
- `python tools/inspect_apks.py archivo.apk`: inventario y SHA-256.
- `python tools/compare_apks.py version2.0.apk version2.5.apk`: comparación reproducible de estructura, tamaños DEX y hashes de recursos.
- `python tools/manifest_summary.py archivo.apk`: muestra package ID, versión, SDK, permisos y componentes del manifiesto binario.

## Archivos originales
Los APK originales no se incluyen en este repositorio público porque no se ha confirmado autorización de redistribución. Consérvalos localmente y verifica sus hashes con el informe.

## Próximos pasos
1. Obtener el proyecto fuente original, si está disponible, o preparar un entorno autorizado de ingeniería inversa.
2. Decodificar manifiestos y recursos con `apktool`.
3. Descompilar DEX con JADX y comparar clases/métodos.
4. Confirmar derechos de modificación y redistribución de los componentes.
5. Reconstruir en un proyecto Android independiente y probar en dispositivo/emulador.
