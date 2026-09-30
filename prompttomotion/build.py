#!/usr/bin/env python3
"""Bundle PromptToMotion into one self-contained HTML file (dist/prompttomotion.html).

The single file loads Tailwind from its CDN (or from --tailwind-css if you pass a compiled stylesheet)
and inlines app.css and every script. Run it from anywhere:  python3 prompttomotion/build.py
"""
import argparse, pathlib, re

ROOT = pathlib.Path(__file__).parent

def inline_js(name):
    # A literal "</script" inside inlined JS would end the tag early, so escape it (valid in strings, templates and regexes).
    return "<script>" + (ROOT / "js" / name).read_text().replace("</script", "<\\/script") + "</script>"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tailwind-css", help="path to a compiled Tailwind stylesheet to inline instead of the CDN script")
    ap.add_argument("--no-fonts", action="store_true", help="drop the Google Fonts link (offline builds)")
    ap.add_argument("--full-document", action="store_true", help="wrap in <!doctype html><html><head>…<body> (needed outside the Artifact tool)")
    ap.add_argument("-o", "--out", default=str(ROOT / "dist" / "prompttomotion.html"))
    a = ap.parse_args()

    html = (ROOT / "index.html").read_text()
    html = html.replace('<link rel="stylesheet" href="css/app.css">', "<style>" + (ROOT / "css" / "app.css").read_text() + "</style>")
    cdn = '<script src="https://cdn.tailwindcss.com/3.4.16"></script>\n<script src="js/tailwind.config.js"></script>'
    if a.tailwind_css:
        html = html.replace(cdn, "<style>" + pathlib.Path(a.tailwind_css).read_text() + "</style>")
    else:
        html = html.replace('<script src="js/tailwind.config.js"></script>', inline_js("tailwind.config.js"))
    if a.no_fonts:
        html = re.sub(r'<link rel="(?:stylesheet|preconnect)" href="https://fonts[^>]*>\n?', "", html)
    for name in ("fx.js", "runtime.js", "scenes.js", "sound.js", "app.js"):
        html = html.replace('<script src="js/%s"></script>' % name, inline_js(name))
    if a.full_document:
        html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + html + "</body></html>"
    out = pathlib.Path(a.out); out.parent.mkdir(parents=True, exist_ok=True); out.write_text(html)
    print("wrote", out, len(html), "bytes")

main()
