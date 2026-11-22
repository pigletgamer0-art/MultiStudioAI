# Informe de análisis estático — Mobile Studio 2.0 vs 2.5

Fecha del inventario: 2026-11-22. Fuente: los dos APK proporcionados en esta conversación. Este informe refleja únicamente los datos que pudieron verificarse leyendo la estructura ZIP de los APK; no equivale a una decompilación completa ni a una prueba funcional.

## Archivos examinados

| Versión | Archivo de entrada | Tamaño | SHA-256 |
|---|---|---:|---|
| 2.0 | `mobilestudio_ver2-0.apk` | 34,368,663 bytes | `dc68fd6086d8a62126847f3f169844a108c6d8127d31f4ff29a4b0388a5d354c` |
| 2.5 | `MobileStudio_v2.5.apk` | 18,083,716 bytes | `8f0fd53ea1d3c048c06476fd43e201927ecb57630f028e41bf6bb547c3645735` |

## Estructura observada

| Indicador | 2.0 | 2.5 |
|---|---:|---:|
| Entradas ZIP | 1,218 | 1,204 |
| Archivos DEX | 16 | 11 |
| Fuentes en `assets/fonts/` | 42 | 42 |
| Archivos en `assets/materials/` | 134 | 134 |
| Tamaño descomprimido total | 83,700,864 bytes | 29,356,559 bytes |
| `AndroidManifest.xml` | Presente | Presente |
| `resources.arsc` | Presente | Presente |

Ambas contienen directorios de recursos Android, bibliotecas nativas y assets de fuentes/materiales. La cantidad de DEX y el tamaño total difieren, pero esos datos por sí solos no identifican qué funciones se añadieron o eliminaron.

## Identidad visual

Las imágenes de icono suministradas muestran:
- **2.0:** icono azul con una franja blanca angular.
- **2.5:** icono morado/azul con un cubo blanco y símbolo de reproducción.

Requisito confirmado por el usuario: conservar el icono de 2.0 para la futura aplicación unificada.

## Lo que todavía no está verificado

No se han extraído ni comparado de forma fiable:
- nombre e identificador de paquete;
- versión Android declarada, SDK mínimo/objetivo;
- permisos, activities, services, receivers y providers;
- clases/métodos y pantallas concretas;
- endpoints o dependencias de servicios externos;
- compatibilidad de bibliotecas y firmas.

Por tanto, **no se puede afirmar todavía qué funciones exclusivas de 2.5 se pueden portar** ni que exista una fusión funcional.

## Estrategia técnica recomendada

1. Decodificar ambos manifiestos y recursos con `apktool`.
2. Descompilar DEX con JADX y comparar paquetes/clases.
3. Construir una matriz de funciones basada en pantallas, flujos y referencias de código.
4. Elegir una base solo después de comparar package ID, SDK, dependencias y arquitectura.
5. Portar/reimplementar funciones en un proyecto Android limpio; no concatenar DEX ni mezclar APK a ciegas.
6. Aplicar el icono de 2.0 en los recursos launcher.
7. Compilar, firmar con una clave propia y probar instalación, actualización, navegación y cada función.

## Limitaciones y precauciones

- La ingeniería inversa puede estar limitada por licencias, derechos de autor o términos de uso. Solo continuar con autorización suficiente.
- El APK recompilado tendrá que firmarse de nuevo; no será una actualización compatible con la firma original salvo que se disponga legítimamente de la clave de firma original.
- Los APK originales no se publican aquí porque el repositorio es público y no se ha confirmado permiso de redistribución.
- Este commit contiene documentación de auditoría, no el código de la aplicación ni un APK unificado.
