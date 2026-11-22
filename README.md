# Mobile Studio — análisis de integración

Este repositorio documenta el análisis de los APK de Mobile Studio 2.0 y 2.5 y prepara una ruta reproducible para una futura reconstrucción.

## Objetivo acordado
- Conservar el icono/logotipo de Mobile Studio 2.0.
- Investigar y recuperar, cuando sea técnicamente posible y esté autorizado, las funciones de ambas versiones.
- No sustituir ni sobrescribir los APK originales.
- No declarar una integración terminada hasta compilar e instalar una aplicación reconstruida y probar sus funciones.

## Estado real
**Fase actual: inventario estático de APK. No existe todavía una aplicación unificada ni un proyecto Android compilable.**

Los APK son artefactos compilados, no el código fuente. Unir sus archivos DEX, recursos y manifiestos directamente no es una fusión segura: puede provocar conflictos de clases, recursos, dependencias, firmas y configuración de Android. La reconstrucción requiere análisis adicional y, posiblemente, reimplementar partes de la app.

## Inventario inicial
Consulta [docs/APK_AUDIT.md](docs/APK_AUDIT.md) para los hashes SHA-256, tamaños y diferencias de estructura observadas.

## Archivos originales
Por seguridad y por límites prácticos de publicación, los APK originales no se incluyen en este repositorio público. Consérvalos localmente y verifica sus hashes con el informe.

## Próximos pasos
1. Obtener un volcado/decompilación estática de ambos APK con herramientas Android adecuadas.
2. Comparar manifiestos, identificadores de paquete, permisos, componentes, recursos y clases.
3. Elaborar una matriz de funciones nuevas frente a funciones compartidas.
4. Confirmar derechos de modificación y redistribución de los componentes.
5. Reconstruir en un proyecto Android independiente y probar en dispositivo/emulador.
