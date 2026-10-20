"""Build dist/ for Netlify.

Thmanyah's license allows web use only when the font is bundled into the
product, not served as standalone files, so the official OTFs from
font.thmanyah.com are inlined into the page as base64 and never copied to
dist/. Put them in fonts/ (that folder is never deployed). Without them the
page falls back to IBM Plex Sans Arabic.
"""
import base64
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
WEIGHTS = {"light": 300, "regular": 400, "medium": 500, "bold": 700, "black": 900}
WANTED = {"Thmanyah Sans": {400, 500, 700}, "Thmanyah Serif Display": {400}}


def family_of(name):
    n = re.sub(r"[\s_-]", "", name.lower())
    if "serifdisplay" in n:
        return "Thmanyah Serif Display"
    if "sans" in n:
        return "Thmanyah Sans"
    return None


def weight_of(name):
    n = name.lower()
    for key, w in WEIGHTS.items():
        if key in n:
            return w
    return None


def font_faces():
    faces = []
    for f in sorted((ROOT / "fonts").glob("*")):
        if f.suffix.lower() not in (".otf", ".ttf", ".woff", ".woff2"):
            continue
        fam, w = family_of(f.stem), weight_of(f.stem)
        if fam is None or w not in WANTED[fam]:
            continue
        fmt = {".otf": "opentype", ".ttf": "truetype", ".woff": "woff", ".woff2": "woff2"}[f.suffix.lower()]
        data = base64.b64encode(f.read_bytes()).decode()
        faces.append(
            f'@font-face{{font-family:"{fam}";font-weight:{w};font-display:swap;'
            f'src:url(data:font/{f.suffix[1:].lower()};base64,{data}) format("{fmt}")}}'
        )
        print(f"  {fam} {w}: {f.name}")
    return faces


def bake(name, faces):
    html = (ROOT / name).read_text(encoding="utf-8")
    if faces:
        html = html.replace("/*@FONTS*/", "\n".join(faces))
        html = re.sub(r"<!--@FALLBACK-->.*?<!--/@FALLBACK-->\n?", "", html, flags=re.S)
    return html


def main():
    faces = font_faces()
    if not faces:
        print("  fonts/ has no Thmanyah files; using IBM Plex Sans Arabic")
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    (DIST / "index.html").write_text(bake("index.html", faces), encoding="utf-8")
    shutil.copy(ROOT / "assets" / "detail-logo.png", DIST / "assets" / "detail-logo.png")
    (DIST / "admin.html").write_text(bake("admin.html", faces), encoding="utf-8")
    for folder in ("api", "lib"):
        target = DIST / folder
        target.mkdir(parents=True)
        for src in (ROOT / folder).glob("*.js"):
            shutil.copy(src, target / src.name)
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    (DIST / "package.json").write_text(
        json.dumps({"private": True, "dependencies": pkg["dependencies"]}, indent=2) + "\n",
        encoding="utf-8",
    )
    size = (DIST / "index.html").stat().st_size / 1024
    print(f"dist/index.html {size:.0f} KB")


if __name__ == "__main__":
    main()
