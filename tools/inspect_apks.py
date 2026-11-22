#!/usr/bin/env python3
"""Inventario ZIP reproducible de APKs; no decompila ni modifica los APK."""
import hashlib, sys, zipfile
from pathlib import Path

def inspect(path):
    p = Path(path)
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    with zipfile.ZipFile(p) as z:
        names = z.namelist()
        return {
            "file": p.name,
            "size_bytes": p.stat().st_size,
            "sha256": digest,
            "zip_entries": len(names),
            "uncompressed_bytes": sum(i.file_size for i in z.infolist()),
            "dex_files": sum(n.endswith(".dex") for n in names),
            "font_assets": sum(n.startswith("assets/fonts/") for n in names),
            "material_assets": sum(n.startswith("assets/materials/") for n in names),
            "has_manifest": "AndroidManifest.xml" in names,
            "has_resources_table": "resources.arsc" in names,
            "native_libraries": sum(n.endswith(".so") for n in names),
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Uso: python tools/inspect_apks.py archivo1.apk [archivo2.apk ...]")
    for item in sys.argv[1:]:
        print(inspect(item))
