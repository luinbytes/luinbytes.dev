import base64
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def local_fonts(include_pixelify: bool = False) -> str:
    fonts = [
        ("Space Grotesk", "300 700", "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2"),
        ("Space Mono", "400", "@fontsource/space-mono/files/space-mono-latin-400-normal.woff2"),
        ("Space Mono", "700", "@fontsource/space-mono/files/space-mono-latin-700-normal.woff2"),
    ]
    if include_pixelify:
        fonts.append(("Pixelify Sans", "400 700", "@fontsource-variable/pixelify-sans/files/pixelify-sans-latin-wght-normal.woff2"))
    faces = []
    for family, weight, filename in fonts:
        path = ROOT / "node_modules" / filename
        if not path.is_file():
            raise RuntimeError(f"Missing social-card font {path}. Run npm ci first.")
        data = base64.b64encode(path.read_bytes()).decode()
        faces.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};src:url(data:font/woff2;base64,{data}) format("woff2");}}')
    return "\n".join(faces)
