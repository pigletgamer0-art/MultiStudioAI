#!/usr/bin/env python3
"""Lee campos básicos del AndroidManifest.xml binario de un APK sin modificarlo."""
import struct
import sys
import zipfile
from pathlib import Path

def read_len8(data, offset):
    first = data[offset]
    if first & 0x80:
        return ((first & 0x7f) << 7) | data[offset + 1], offset + 2
    return first, offset + 1

def read_len16(data, offset):
    first = struct.unpack_from("<H", data, offset)[0]
    if first & 0x8000:
        second = struct.unpack_from("<H", data, offset + 2)[0]
        return ((first & 0x7fff) << 16) | second, offset + 4
    return first, offset + 2

def parse_string_pool(data, offset, header_size):
    count, _, flags, strings_start, _ = struct.unpack_from("<IIIII", data, offset + 8)
    utf8 = bool(flags & 0x100)
    offsets = struct.unpack_from("<" + "I" * count, data, offset + header_size)
    base = offset + strings_start
    result = []
    for item in offsets:
        pos = base + item
        if utf8:
            _, pos = read_len8(data, pos)  # UTF-16 length
            length, pos = read_len8(data, pos)  # byte length
            value = data[pos:pos + length].decode("utf-8", "replace")
        else:
            length, pos = read_len16(data, pos)
            value = data[pos:pos + 2 * length].decode("utf-16le", "replace")
        result.append(value)
    return result

def typed_value(strings, raw, value_type, value_data):
    if raw != 0xffffffff and raw < len(strings):
        return strings[raw]
    if value_type == 3 and value_data < len(strings):
        return strings[value_data]
    if value_type == 18:
        return bool(value_data)
    return value_data

def manifest_elements(data):
    offset = 8
    strings = []
    elements = []
    while offset + 8 <= len(data):
        chunk_type, header_size, chunk_size = struct.unpack_from("<HHI", data, offset)
        if chunk_size < 8 or offset + chunk_size > len(data):
            raise ValueError("Chunk XML binario inválido")
        if chunk_type == 0x0001:
            strings = parse_string_pool(data, offset, header_size)
        elif chunk_type == 0x0102 and strings:
            name_index = struct.unpack_from("<I", data, offset + 20)[0]
            tag = strings[name_index] if name_index < len(strings) else str(name_index)
            attr_start, attr_size, attr_count = struct.unpack_from("<HHH", data, offset + 24)
            attrs = {}
            first_attr = offset + 16 + attr_start
            for i in range(attr_count):
                pos = first_attr + i * attr_size
                _, name, raw = struct.unpack_from("<III", data, pos)
                _, _, value_type, value_data = struct.unpack_from("<HBBI", data, pos + 12)
                key = strings[name] if name < len(strings) else str(name)
                attrs[key] = typed_value(strings, raw, value_type, value_data)
            elements.append((tag, attrs))
        offset += chunk_size
    return elements

def summarize(apk):
    with zipfile.ZipFile(apk) as archive:
        elements = manifest_elements(archive.read("AndroidManifest.xml"))
    for tag, attrs in elements:
        if tag in {"manifest", "uses-sdk", "uses-permission", "uses-feature",
                   "application", "activity", "activity-alias", "service",
                   "receiver", "provider"}:
            print(f"{tag}: {attrs}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(f"Uso: {Path(sys.argv[0]).name} archivo.apk")
    summarize(sys.argv[1])
