#!/usr/bin/env python3
"""Compara estructura ZIP y hashes de dos APK sin modificar los archivos."""
import hashlib
import re
import sys
import zipfile
from pathlib import Path

DEX_RE = re.compile(r"classes(?:\d+)?\.dex$")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def inspect(path):
    p = Path(path)
    with zipfile.ZipFile(p) as z:
        infos = {i.filename: i for i in z.infolist()}
        names = set(infos)
        dex = [n for n in names if DEX_RE.fullmatch(n)]
        return {
            "path": str(p),
            "sha256": sha(p.read_bytes()),
            "size": p.stat().st_size,
            "entries": names,
            "dex_count": len(dex),
            "dex_bytes": sum(infos[n].file_size for n in dex),
            "font_hashes": {n: sha(z.read(n)) for n in names if n.startswith("assets/fonts/") and not n.endswith("/")},
            "material_hashes": {n: sha(z.read(n)) for n in names if n.startswith("assets/materials/") and not n.endswith("/")},
            "hashes": {n: sha(z.read(n)) for n in names},
            "uncompressed": sum(i.file_size for i in infos.values()),
        }

def main(a_path, b_path):
    a, b = inspect(a_path), inspect(b_path)
    common = a["entries"] & b["entries"]
    same = sum(a["hashes"][n] == b["hashes"][n] for n in common)
    print(f"A: {a['path']} size={a['size']} sha256={a['sha256']}")
    print(f"B: {b['path']} size={b['size']} sha256={b['sha256']}")
    for label, item in (("A", a), ("B", b)):
        print(f"{label}: entries={len(item['entries'])} dex={item['dex_count']} "
              f"dex_bytes={item['dex_bytes']} uncompressed={item['uncompressed']}")
    print(f"common_paths={len(common)} byte_identical={same} different={len(common)-same}")
    for prefix, key in (("assets/fonts/", "font_hashes"), ("assets/materials/", "material_hashes")):
        x, y = a[key], b[key]
        shared = set(x) & set(y)
        equal = sum(x[n] == y[n] for n in shared)
        print(f"{prefix}: A={len(x)} B={len(y)} common={len(shared)} identical={equal}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python tools/compare_apks.py version2.0.apk version2.5.apk")
    main(sys.argv[1], sys.argv[2])
