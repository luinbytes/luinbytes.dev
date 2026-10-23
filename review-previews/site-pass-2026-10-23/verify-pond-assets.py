import hashlib
import json
import struct
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = "4fb3aa223cd7e91defde84d505ecb5814d62cf39"
ASSETS = (
    "pixel-pond-world.webp",
    "pixel-koi-atlas.webp",
    "pixel-pond-foreground.webp",
    "pixel-pond-water-layer.webp",
    "pixel-tabby-atlas.webp",
    "pixel-tabby-turn-atlas.webp",
)


def metadata(data):
    result = {}
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset:offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        if kind in (b"ICCP", b"EXIF", b"XMP "):
            result.setdefault(kind, []).append(data[offset + 8:offset + 8 + size])
        offset += 8 + size + size % 2
    return result


def decode(source, destination):
    subprocess.run(
        ["dwebp", str(source), "-pam", "-o", str(destination)],
        check=True, capture_output=True, timeout=60,
    )
    data = destination.read_bytes()
    header, pixels = data.split(b"ENDHDR\n", 1)
    fields = dict(line.split() for line in header.splitlines()[1:])
    width, height = int(fields[b"WIDTH"]), int(fields[b"HEIGHT"])
    assert fields[b"DEPTH"] == b"4" and fields[b"MAXVAL"] == b"255"
    assert len(pixels) == width * height * 4
    return width, height, pixels


results = []
with tempfile.TemporaryDirectory() as directory:
    temporary = Path(directory)
    for name in ASSETS:
        relative = f"public/images/portfolio/{name}"
        original = subprocess.check_output(["git", "show", f"{BASE}:{relative}"], cwd=ROOT)
        current = (ROOT / relative).read_bytes()
        source = temporary / name
        source.write_bytes(original)
        before = decode(source, temporary / "before.pam")
        after = decode(ROOT / relative, temporary / "after.pam")
        assert before == after, f"Decoded RGBA changed for {name}"
        assert metadata(original) == metadata(current), f"Metadata changed for {name}"
        assert len(current) < len(original), f"Asset did not shrink for {name}"
        results.append({
            "asset": name, "beforeBytes": len(original), "afterBytes": len(current),
            "width": after[0], "height": after[1],
            "rgbaSha256": hashlib.sha256(after[2]).hexdigest(),
            "exactRgba": True, "metadataUnchanged": True,
        })

print(json.dumps({
    "base": BASE,
    "savedBytes": sum(row["beforeBytes"] - row["afterBytes"] for row in results),
    "assets": results,
}, indent=2))
