# Informe de análisis estático — Mobile Studio 2.0 vs 2.5

Fecha: 2026-11-22. Archivos analizados directamente desde los APK adjuntos. Se combinaron inventario ZIP, hashes, comparación byte a byte de rutas compartidas y extracción de cadenas imprimibles de los archivos DEX usando `strings`. **No se ha hecho aún una decompilación JADX/apktool completa ni una prueba en Android.**

## 1. Identificación de los archivos

| Versión | Archivo | Tamaño | SHA-256 |
|---|---|---:|---|
| 2.0 | `mobilestudio_ver2-0.apk` | 34,368,663 bytes (32.78 MiB) | `dc68fd6086d8a62126847f3f169844a108c6d8127d31f4ff29a4b0388a5d354c` |
| 2.5 | `MobileStudio_v2.5.apk` | 18,083,716 bytes (17.25 MiB) | `8f0fd53ea1d3c048c06476fd43e201927ecb57630f028e41bf6bb547c3645735` |

## 2. Estructura y recursos

| Indicador | 2.0 | 2.5 |
|---|---:|---:|
| Entradas ZIP | 1,218 | 1,204 |
| DEX | 16 | 11 |
| Tamaño total de DEX | 67,167,728 bytes | 16,230,276 bytes |
| Fuentes `assets/fonts/` | 42 | 42 |
| Materiales `assets/materials/` | 134 | 134 |
| Entradas descomprimidas | 83,700,864 bytes | 29,356,559 bytes |
| Manifiesto Android | Sí | Sí |
| Tabla de recursos | Sí | Sí |

Ambos APK incluyen cuatro variantes ABI de `libzstd-jni-1.5.6-3.so`: arm64-v8a, armeabi-v7a, x86 y x86_64.

### Comparación de rutas comunes

- 967 rutas ZIP aparecen en ambas versiones.
- 245 de esas rutas tienen bytes idénticos.
- 722 rutas comunes tienen contenido diferente.
- Los 42 archivos de fuentes son idénticos byte a byte.
- Los 134 archivos de materiales son idénticos byte a byte.
- Los recursos launcher usan rutas distintas por cambios de configuración/directorio (`mipmap-*-v4` frente a `mipmap-*`); no se debe asumir que son intercambiables sin revisar manifiesto y XML adaptativos.

**Lectura:** hay una base compartida de recursos (incluidas todas las fuentes y materiales) y diferencias sustanciales en DEX y recursos. No es una simple actualización de icono.

## 3. Manifiesto Android: diferencias confirmadas

Se decodificó el XML binario del manifiesto directamente.

| Campo | 2.0 | 2.5 |
|---|---|---|
| `package` | `com.exampletest.mobilestudiotest` | `com.tetrazbloxy.mobilestudio` |
| `versionName` | `2.0` | `2.5` |
| `versionCode` | `3` | `8` |
| `minSdkVersion` | 24 | 24 |
| `targetSdkVersion` | 37 | 37 |
| Clase Application | `com.exampletest.mobilestudiotest.StudioApp` | `com.exampletest.mobilestudiotest.StudioApp` |
| Activity principal | `com.exampletest.mobilestudiotest.MainActivity` | `com.exampletest.mobilestudiotest.MainActivity` |

En ambos manifiestos se observan `INTERNET`, una activity principal exportada, el proveedor AndroidX Startup no exportado y el receiver de ProfileInstaller protegido por `android.permission.DUMP`. La segunda versión cambia el nombre de paquete y el sufijo de la autoridad AndroidX Startup y del permiso dinámico propio.

**Consecuencia importante:** los APK no tienen el mismo application ID. Android no tratará 2.5 como una actualización normal de 2.0 aunque la clase principal coincida. Una versión unificada debe elegir un único package ID y revisar cuidadosamente las autoridades, permisos, rutas de archivos, deep links y cualquier integración que dependa del ID antiguo.

## 4. Evidencia preliminar de funciones en DEX

La extracción de cadenas y símbolos de DEX revela nombres y textos de componentes propios del paquete `com.exampletest.mobilestudiotest`. Son indicios de código incluido, no garantía de que cada flujo funcione en tiempo de ejecución.

### Evidencia encontrada en 2.0

Cadenas/símbolos observados incluyen:
- `ScriptEditor` y textos para crear scripts.
- `TerrainPanel`.
- `ToolboxPanel`.
- `PluginApi`, `BetaPlugin` y referencias a errores/validación de plugins.
- `Avatar`, opciones de avatar R6/R15 y flujo de playtest.
- `RobloxCloud`, `syncFromCloud`, cuentas/modelos y referencias de publicación/guardado.
- Dependencias y modelos de cliente Anthropic en DEX (`com.anthropic...`), junto con mensajes sobre API key/guardado. Esto prueba que hay código de integración SDK empaquetado; no prueba que la función IA esté configurada o disponible para el usuario.

### Evidencia encontrada en 2.5

Cadenas/símbolos observados incluyen:
- Métodos de avatar: `Avatar.buildR15`, `Avatar.addAccessories`, `Avatar.composeClothing`, `Avatar.applyTo`.
- Edición de escena: `Studio.multiSelect`, `boxSelect`, `groupSelection`, `ungroupSelection`, `insertObject`, `insertConstraint`, `renderParts`, `copySelection`, `deleteSelection`, `setAnchored`.
- Gestión de plugins: `managePlugins`, `activatePlugin`, `deactivatePlugin`, `pluginRoot`, `importZip`.
- Importación/exportación: `openPlaceBytes`, `openRecentFile`, `exportSelection`, `addSelectionToToolbox`.
- Playtest: `startPlay`, `stopPlay`, `playAs`, `playHere`.
- Textos visibles extraídos: “Export Selection (.rbxm)”, “Install Plugin from File”, “Install Plugin from Roblox (ID or link)”, “Import Model into Toolbox”, “Publish to Roblox”, “Save a Copy to This Device”.

Algunos de estos nombres también aparecen en 2.0 o pueden corresponder a código compartido/renombrado. La lista no es una matriz definitiva de funciones exclusivas. Es necesario comparar clases y métodos con JADX para clasificar cada función como común, añadida, retirada o modificada.

## 5. Identidad visual acordada

El usuario confirmó que la aplicación unificada debe conservar el logotipo de 2.0 (icono azul con franja blanca angular), no el icono cubo/reproducción de 2.5. Se inspeccionó el recurso launcher real del APK 2.0 (`res/mipmap-xxxhdpi-v4/ic_launcher.webp`) y coincide visualmente con la imagen de referencia aportada. El recurso se extrajo para análisis local, pero todavía no se ha añadido como asset al repositorio ni aplicado a un proyecto Android: aún no existe proyecto reconstruido.

## 6. Decisión técnica provisional

No elegir todavía 2.0 o 2.5 como base. Aunque 2.0 tiene un volumen de DEX mucho mayor (incluye una integración SDK Anthropic extensa), 2.5 contiene símbolos propios de flujos de edición/Avatar/plugins y cambios en componentes. La selección de base debe esperar a inspeccionar:
1. package name, versionCode/versionName, minSdk/targetSdk y permisos de ambos manifiestos;
2. activities/services/receivers/providers y configuración de componentes;
3. clases/métodos de código propio con JADX y diferencias de recursos;
4. dependencias, endpoints y configuración de servicios externos.

No se deben combinar DEX ni fusionar APK a ciegas. La ruta segura es reconstruir un proyecto Android independiente y portar o reimplementar las funciones verificadas.

## 7. Próximas tareas concretas

1. Instalar/usar `apktool` y `jadx` en un entorno de análisis.
2. Decodificar los manifiestos y extraer los recursos launcher reales.
3. Exportar inventarios de clases y métodos por paquete; producir una matriz comparativa de funciones.
4. Revisar licencias, permisos de modificación y derechos de redistribución de cada componente.
5. Crear un proyecto Android limpio con identidad visual 2.0 y funciones portadas de forma incremental.
6. Compilar, firmar con clave propia y probar en dispositivo/emulador.

## 8. Estado y límites

**Estado: análisis estático parcial. No hay todavía código fuente recuperado de forma completa, proyecto Android compilable, fusión funcional ni APK unificado.**

Los APK originales no se publican en este repositorio público porque no se ha confirmado autorización de redistribución. La ingeniería inversa y redistribución deben respetar licencias, derechos y términos aplicables. Un APK recompilado tendrá una firma nueva; no será una actualización instalable encima de la aplicación original sin la clave de firma original legítima.
