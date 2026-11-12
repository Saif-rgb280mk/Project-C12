#!/usr/bin/env python3
"""KINETIC XI — builds the complete project PDF.

Output: dist/KINETIC_XI_Master_Blueprint_and_Source.pdf containing
  Part A  The Master Prompt & Design Blueprint (rendered from docs/parts/*.md)
  Part B  Prototype screenshot tour (docs/screenshots/*.jpg)
  Part C  Complete source code, syntax highlighted with line numbers
  Part D  Verified results (engine tests, physics lab, browser tests)
  Part E  What I used: languages, tools, status, how to run, study guide
It also writes docs/KINETIC_XI_Master_Design_Prompt.md (the plain-text prompt document).

Requires: Python 3, reportlab, pygments, pillow.  Run:  python3 tools/build_pdf.py
"""
import datetime
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from pygments import lex
from pygments.lexers import get_lexer_by_name
from pygments.token import Token
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, Image, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle, XPreformatted)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
PARTS = DOCS / "parts"
SHOTS = DOCS / "screenshots"
OUT_PDF = ROOT / "dist" / "KINETIC_XI_Master_Blueprint_and_Source.pdf"
OUT_MD = DOCS / "KINETIC_XI_Master_Design_Prompt.md"
TODAY = datetime.date.today().strftime("%d %B %Y")

# --------------------------------------------------------------------------- fonts ---
def first_existing(paths):
    for p in paths:
        if Path(p).exists():
            return p
    return None

FONT_CANDIDATES = {
    "Body": ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/Library/Fonts/Arial Unicode.ttf",
             "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"],
    "Body-Bold": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                  "/System/Library/Fonts/Supplemental/Arial Bold.ttf"],
    "Mono": ["/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
             "/System/Library/Fonts/Supplemental/Courier New.ttf"],
    "Mono-Bold": ["/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
                  "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"],
    "Mono-Italic": ["/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Italic.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Oblique.ttf",
                    "/System/Library/Fonts/Supplemental/Courier New Italic.ttf"],
}
FALLBACK = {"Body": "Helvetica", "Body-Bold": "Helvetica-Bold", "Mono": "Courier", "Mono-Bold": "Courier-Bold",
            "Mono-Italic": "Courier-Oblique"}
F = {}
for name, cands in FONT_CANDIDATES.items():
    path = first_existing(cands)
    if path:
        pdfmetrics.registerFont(TTFont(name, path))
        F[name] = name
    else:
        print(f"warning: no TTF found for {name}; using {FALLBACK[name]} (some symbols may not render)")
        F[name] = FALLBACK[name]
if F["Body"] == "Body":
    pdfmetrics.registerFontFamily("Body", normal="Body", bold=F["Body-Bold"], italic="Body", boldItalic=F["Body-Bold"])
if F["Mono"] == "Mono":
    pdfmetrics.registerFontFamily("Mono", normal="Mono", bold=F["Mono-Bold"], italic=F["Mono-Italic"], boldItalic=F["Mono-Bold"])

# --------------------------------------------------------------------------- palette & styles ---
INK = colors.HexColor("#1f2328")
MUTED = colors.HexColor("#57606a")
DARK = colors.HexColor("#0b0f16")
ACCENT = colors.HexColor("#f2c200")
ACCENT_DK = colors.HexColor("#9a6b00")
RED = colors.HexColor("#d8262f")
BLUE = colors.HexColor("#1d5fd6")
CODE_BG = colors.HexColor("#f6f8fa")
BORDER = colors.HexColor("#d0d7de")
ZEBRA = colors.HexColor("#f3f5f8")

PAGE_W, PAGE_H = A4
MARGIN_X = 42
CONTENT_W = PAGE_W - 2 * MARGIN_X

def S(name, **kw):
    base = dict(fontName=F["Body"], fontSize=9.6, leading=13.6, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)

ST = {
    "Body": S("Body", spaceAfter=6),
    "H1": S("H1", fontName=F["Body-Bold"], fontSize=21, leading=26, spaceAfter=8, textColor=DARK),
    "H2": S("H2", fontName=F["Body-Bold"], fontSize=14.5, leading=19, spaceBefore=14, spaceAfter=7, textColor=DARK),
    "H3": S("H3", fontName=F["Body-Bold"], fontSize=11.5, leading=15, spaceBefore=10, spaceAfter=5, textColor=BLUE),
    "H4": S("H4", fontName=F["Body-Bold"], fontSize=10, leading=13.5, spaceBefore=8, spaceAfter=4, textColor=INK),
    "Bullet": S("Bullet", leftIndent=15, bulletIndent=4, spaceAfter=3),
    "Bullet2": S("Bullet2", leftIndent=29, bulletIndent=18, spaceAfter=2),
    "CodeBlock": S("CodeBlock", fontName=F["Mono"], fontSize=7.3, leading=9.3, backColor=CODE_BG,
                   borderColor=BORDER, borderWidth=0.5, borderPadding=6, spaceBefore=6, spaceAfter=10),
    "Cell": S("Cell", fontSize=7.9, leading=10.2),
    "CellHead": S("CellHead", fontName=F["Body-Bold"], fontSize=7.9, leading=10.2, textColor=colors.white),
    "PartLabel": S("PartLabel", fontName=F["Body-Bold"], fontSize=13, leading=16, textColor=ACCENT, spaceAfter=10),
    "PartTitle": S("PartTitle", fontName=F["Body-Bold"], fontSize=30, leading=36, textColor=colors.white, spaceAfter=16),
    "PartDesc": S("PartDesc", fontSize=11, leading=16, textColor=colors.HexColor("#c9d1d9"), spaceAfter=6),
    "FileTitle": S("FileTitle", fontName=F["Mono-Bold"], fontSize=9.5, leading=12, textColor=colors.white),
    "FileMeta": S("FileMeta", fontSize=7.8, leading=10, textColor=colors.HexColor("#c9d1d9")),
    "FileDesc": S("FileDesc", fontSize=8.4, leading=11.4, textColor=MUTED, spaceBefore=3, spaceAfter=4),
    "Code": S("Code", fontName=F["Mono"], fontSize=6.6, leading=8.15, backColor=CODE_BG, borderPadding=(2, 4, 2, 4)),
    "Caption": S("Caption", fontSize=8.4, leading=11.5, textColor=MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=14),
    "TOCTitle": S("TOCTitle", fontName=F["Body-Bold"], fontSize=22, leading=28, spaceAfter=14, textColor=DARK),
}
TOC_STYLES = [
    S("TOC0", fontName=F["Body-Bold"], fontSize=10.5, leading=15, spaceBefore=8, leftIndent=0, firstLineIndent=0),
    S("TOC1", fontSize=8.8, leading=11.6, leftIndent=14, firstLineIndent=0, textColor=colors.HexColor("#30363d")),
]

# --------------------------------------------------------------------------- markdown -> flowables ---
def md_inline(text):
    """Inline markdown: `code`, **bold**, *italic*. Code spans are swapped for placeholders
    first so that bold/italic markers may wrap around them."""
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return f"\x00{len(codes) - 1}\x00"

    s = escape(re.sub(r"`([^`]+)`", stash, text))
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    return re.sub(r"\x00(\d+)\x00",
                  lambda m: f'<font name="{F["Mono"]}" size="8.4" color="#953800">{escape(codes[int(m.group(1))])}</font>', s)

def wrap_text_lines(text, width):
    lines = []
    for raw in text.split("\n"):
        raw = raw.replace("\t", "    ")
        while len(raw) > width:
            cut = raw.rfind(" ", int(width * 0.6), width)
            cut = cut if cut > 0 else width
            lines.append(raw[:cut])
            raw = "      " + raw[cut:].lstrip()
        lines.append(raw)
    return lines

def code_block(text):
    return XPreformatted(escape("\n".join(wrap_text_lines(text.rstrip("\n"), 118))), ST["CodeBlock"])

def md_table(rows):
    ncols = max(len(r) for r in rows)
    rows = [r + [""] * (ncols - len(r)) for r in rows]
    plain = [[re.sub(r"[*`]", "", c) for c in r] for r in rows]
    lengths = [max(len(r[c]) for r in plain) for c in range(ncols)]
    # Never break inside a word: each column is at least as wide as its longest word.
    def word_width(cell, header):
        best = 0.0
        for chunk in re.split(r"(`[^`]+`)", cell):
            if chunk.startswith("`") and chunk.endswith("`") and len(chunk) > 1:
                words, font, size = chunk[1:-1].split(), F["Mono"], 8.4
            else:
                words, font, size = re.sub(r"\*", "", chunk).split(), F["Body-Bold"] if header else F["Body"], 7.9
            for w in words:
                best = max(best, pdfmetrics.stringWidth(w, font, size))
        return best + 12   # cell padding

    min_w = [min(175.0, max(word_width(r[c], i == 0) for i, r in enumerate(rows))) for c in range(ncols)]
    weights = [min(max(l, 5), 70) ** 0.85 for l in lengths]
    free = max(0.0, CONTENT_W - sum(min_w))
    extra = [max(0.0, w / sum(weights) * CONTENT_W - m) for w, m in zip(weights, min_w)]
    widths = [m + (free * e / sum(extra) if sum(extra) > 0 else free / ncols) for m, e in zip(min_w, extra)]
    scale = CONTENT_W / sum(widths)
    widths = [w * scale for w in widths]
    data = []
    for i, r in enumerate(rows):
        style = ST["CellHead"] if i == 0 else ST["Cell"]
        data.append([Paragraph(md_inline(c), style) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    ts = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            ts.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
    t.setStyle(TableStyle(ts))
    return t

def md_to_flowables(md):
    flow, para = [], []
    lines = md.split("\n")
    i = 0

    def flush():
        if para:
            flow.append(Paragraph(md_inline(" ".join(para)), ST["Body"]))
            para.clear()

    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            flush()
            i += 1
            buf = []
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            flow.append(code_block("\n".join(buf)))
            continue
        if line.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                    rows.append(cells)
                i += 1
            flow.append(md_table(rows))
            flow.append(Spacer(1, 8))
            continue
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            flush()
            level = len(m.group(1))
            if level == 2:
                flow.append(CondPageBreak(110))
            flow.append(Paragraph(md_inline(m.group(2)), ST[f"H{level}"]))
            i += 1
            continue
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if m:
            flush()
            indent = len(m.group(1))
            bullet = "•" if m.group(2) in "-*" else m.group(2)
            text = m.group(3)
            i += 1
            while i < len(lines) and lines[i].startswith(" " * (indent + 2)) and lines[i].strip() and \
                    not re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]):
                text += " " + lines[i].strip()
                i += 1
            flow.append(Paragraph(md_inline(text), ST["Bullet2" if indent >= 2 else "Bullet"], bulletText=bullet))
            continue
        if not line.strip():
            flush()
            i += 1
            continue
        para.append(line.strip())
        i += 1
    flush()
    return flow

# --------------------------------------------------------------------------- source listings ---
SOURCES = [
    ("engine/include/kxi/math.hpp", "Vector math, critically-damped springs, deterministic RNG and value noise."),
    ("engine/include/kxi/surface.hpp", "The Living Pitch interface: weather, cells, contact coefficients."),
    ("engine/src/surface.cpp", "Hydrology (rain, drainage, evaporation), footfall wear and compaction, friction/bounce formulas."),
    ("engine/include/kxi/ball_physics.hpp", "True-Inertia Ball interface: parameters, atmosphere, state, strikes."),
    ("engine/src/ball_physics.cpp", "Drag crisis, Magnus, knuckle force, RK4 flight, impulse bounce, skid-to-roll, rolling resistance."),
    ("engine/include/kxi/locomotion.hpp", "Athlete profile and momentum-true locomotion interface."),
    ("engine/src/locomotion.cpp", "Force–velocity propulsion, traction friction circle, plant-and-cut, gait clock, slips."),
    ("engine/include/kxi/foot_ik.hpp", "Full-body grounding interface: two-bone IK and pelvis solver."),
    ("engine/src/foot_ik.cpp", "Law-of-cosines leg IK, pelvis drop, centre-of-mass weight shift."),
    ("engine/include/kxi/fatigue.hpp", "Physiology interface: D' balance, glycogen, strain, injury hazard."),
    ("engine/src/fatigue.cpp", "Critical-speed model, recovery, strain accumulation, injury rolls."),
    ("engine/include/kxi/input.hpp", "MacBook key table, mac/HID key codes, bindings, Context Intent Arbiter interface."),
    ("engine/src/input.cpp", "The arbiter state machine resolving every overloaded key; Mac conflict doctor; rollover chords."),
    ("engine/include/kxi/json.hpp", "Dependency-free JSON DOM."),
    ("engine/src/json.cpp", "Recursive-descent JSON parser and pretty printer."),
    ("engine/include/kxi/settings.hpp", "The full settings suite, Apple Silicon presets, dynamic resolution controller."),
    ("engine/src/settings.cpp", "Single field-visitor list driving JSON save/load with clamping and warnings."),
    ("engine/include/kxi/tactics.hpp", "Pitch control, threat surface, run planner, defensive line, adaptive manager."),
    ("engine/src/tactics.cpp", "Implementation of the team brain and the Touchline Mind."),
    ("engine/include/kxi/camera.hpp", "Camera presets and rig interface."),
    ("engine/src/camera.cpp", "Broadcast/Tele/Co-op/Pro/Custom rigs with spring tracking."),
    ("engine/tests/tests.cpp", "45 unit and physical-plausibility tests (271 checks)."),
    ("engine/tools/physics_lab.cpp", "Command-line lab printing the measured tables used in this document."),
    ("engine/CMakeLists.txt", "Cross-platform build (library, tests, lab)."),
    ("platform/macos/KXIKeyboardInput.mm", "Objective-C++: GameController + NSEvent keyboard capture, Mission Control check."),
    ("platform/macos/AppleSiliconGovernor.swift", "Swift: chip detection, hardware RT check, thermal/power governor, QoS thread."),
    ("platform/macos/GrassBlades.metal", "Metal Shading Language: instanced 3D grass reading the living pitch."),
    ("prototype/index.html", "Prototype page shell and script order."),
    ("prototype/style.css", "Settings menu styling."),
    ("prototype/js/core.js", "Namespace, pitch constants, vectors, RNG, noise, team space."),
    ("prototype/js/surface.js", "Living pitch (JavaScript port)."),
    ("prototype/js/ball.js", "Ball physics port + physics-solved aiming (shots, lobs)."),
    ("prototype/js/input.js", "Keyboard capture with timestamps + the Context Intent Arbiter port."),
    ("prototype/js/settings.js", "Settings model, persistence and generated options menu with key remapping."),
    ("prototype/js/player.js", "Locomotion, fatigue and leg IK for every player."),
    ("prototype/js/camera.js", "Camera rigs and true perspective projection with near-plane clipping."),
    ("prototype/js/audio.js", "Procedural stadium audio, SFX, commentary and PA."),
    ("prototype/js/ai.js", "Team brain: line, pressing, runs, keeper, decisions, adaptive manager."),
    ("prototype/js/game.js", "The match: touches, kicks, laws, restarts, goals, stats."),
    ("prototype/js/render.js", "Broadcast renderer, HUD, radar and input overlay."),
    ("prototype/js/main.js", "Bootstrap and fixed 120 Hz timestep loop."),
    ("tools/prototype_tests.js", "Automated browser tests and screenshot capture (Playwright)."),
    ("tools/build_pdf.py", "This PDF builder (Python + ReportLab + Pygments)."),
    ("config/keybindings.default.json", "Generated by the engine: binding table, Mac conflicts, rollover chords."),
    ("config/settings.default.json", "Generated by the engine: every default setting."),
]

LANG_OF = {".hpp": ("C++17", "cpp"), ".cpp": ("C++17", "cpp"), ".mm": ("Objective-C++", "objective-c++"),
           ".swift": ("Swift", "swift"), ".metal": ("Metal Shading Language", "cpp"),
           ".js": ("JavaScript", "javascript"), ".html": ("HTML5", "html"), ".css": ("CSS3", "css"),
           ".json": ("JSON", "json"), ".py": ("Python 3", "python"), ".txt": ("CMake", "cmake"), ".md": ("Markdown", "markdown")}

TOKEN_STYLE = [
    (Token.Comment.Preproc, ("#8250df", False)), (Token.Comment.PreprocFile, ("#0a3069", False)),
    (Token.Comment, ("#6e7781", True)), (Token.Keyword.Type, ("#0550ae", False)), (Token.Keyword, ("#cf222e", False)),
    (Token.Name.Function, ("#8250df", False)), (Token.Name.Class, ("#953800", False)),
    (Token.Name.Builtin, ("#0550ae", False)), (Token.Name.Tag, ("#116329", False)),
    (Token.Name.Attribute, ("#0550ae", False)), (Token.Name.Decorator, ("#8250df", False)),
    (Token.Literal.String, ("#0a3069", False)), (Token.Literal.Number, ("#0550ae", False)),
    (Token.Operator.Word, ("#cf222e", False)),
]

def style_for(ttype):
    for t, st in TOKEN_STYLE:
        if ttype in t:
            return st
    return (None, False)

def lang_info(path):
    p = Path(path)
    ext = ".txt" if p.name == "CMakeLists.txt" else p.suffix
    return LANG_OF[ext]

def highlighted_lines(code, lexer_name):
    lexer = get_lexer_by_name(lexer_name, stripnl=False, ensurenl=False)
    lines, cur = [], []
    for ttype, value in lex(code, lexer):
        colour, italic = style_for(ttype)
        parts = value.replace("\t", "    ").split("\n")
        for k, piece in enumerate(parts):
            if k > 0:
                lines.append(cur)
                cur = []
            if piece:
                cur.append((piece, colour, italic))
    if cur:
        lines.append(cur)
    return lines

def render_segments(segs):
    out = []
    for text, colour, italic in segs:
        t = escape(text)
        if italic and F["Mono-Italic"] == "Mono-Italic":
            t = f'<font name="Mono-Italic">{t}</font>'
        if colour:
            t = f'<font color="{colour}">{t}</font>'
        out.append(t)
    return "".join(out)

def wrap_segments(segs, width):
    rows, cur, n = [], [], 0
    for text, colour, italic in segs:
        while text:
            room = width - n
            if room <= 0:
                rows.append(cur)
                cur, n = [], 0
                room = width
            piece, text = text[:room], text[room:]
            cur.append((piece, colour, italic))
            n += len(piece)
    rows.append(cur)
    return rows

def code_listing(path, desc):
    src = (ROOT / path).read_text(encoding="utf-8")
    lang, lexer = lang_info(path)
    nlines = src.count("\n") + (0 if src.endswith("\n") else 1)
    flows = [CondPageBreak(160)]
    head = Table([[Paragraph(escape(path), ST["FileTitle"]),
                   Paragraph(f"{escape(lang)} · {nlines} lines", ST["FileMeta"])]],
                 colWidths=[CONTENT_W * 0.72, CONTENT_W * 0.28])
    head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), DARK), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 5),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                              ("LINEBELOW", (0, 0), (-1, -1), 2, ACCENT)]))
    flows.append(head)
    flows.append(Paragraph(escape(desc), ST["FileDesc"]))
    width = 116
    rendered = []
    for num, segs in enumerate(highlighted_lines(src, lexer), start=1):
        for k, row in enumerate(wrap_segments(segs, width)):
            gutter = f'{num:>4}  ' if k == 0 else '   ↳  '
            rendered.append(f'<font color="#8c959f">{gutter}</font>{render_segments(row)}')
    for start in range(0, len(rendered), 64):
        flows.append(XPreformatted("\n".join(rendered[start:start + 64]), ST["Code"]))
    flows.append(Spacer(1, 10))
    return flows, lang, nlines

# --------------------------------------------------------------------------- page decorations ---
def draw_cover(c, doc):
    c.saveState()
    c.setFillColor(DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Perspective pitch lines
    c.setStrokeColor(colors.HexColor("#1f6f3a"))
    c.setLineWidth(1.2)
    top_y, bot_y = 300, 40
    tl, tr, bl, br = 150, PAGE_W - 150, -60, PAGE_W + 60
    c.line(tl, top_y, tr, top_y); c.line(bl, bot_y, br, bot_y); c.line(tl, top_y, bl, bot_y); c.line(tr, top_y, br, bot_y)
    c.line(PAGE_W / 2, top_y, PAGE_W / 2, bot_y)
    c.ellipse(PAGE_W / 2 - 95, 130, PAGE_W / 2 + 95, 205)
    for k in range(1, 9):
        y = bot_y + (top_y - bot_y) * (k / 9) ** 0.8
        c.setStrokeColor(colors.HexColor("#123f22"))
        c.setLineWidth(0.5)
        t = (y - bot_y) / (top_y - bot_y)
        c.line(bl + (tl - bl) * t, y, br + (tr - br) * t, y)
    # Ball
    c.setFillColor(colors.white)
    c.circle(PAGE_W / 2 + 40, 172, 6, fill=1, stroke=0)
    # Title block
    c.setFillColor(ACCENT)
    c.setFont(F["Body-Bold"], 12)
    c.drawString(MARGIN_X + 8, PAGE_H - 150, "MASTER DESIGN PROMPT · ARCHITECTURAL BLUEPRINT · COMPLETE SOURCE")
    c.setFillColor(colors.white)
    c.setFont(F["Body-Bold"], 58)
    c.drawString(MARGIN_X + 4, PAGE_H - 220, "KINETIC XI")
    c.setFont(F["Body"], 15)
    c.setFillColor(colors.HexColor("#c9d1d9"))
    c.drawString(MARGIN_X + 8, PAGE_H - 252, "A next-generation, physics-first football simulation")
    c.drawString(MARGIN_X + 8, PAGE_H - 272, "for MacBook keyboards and Apple Silicon — and beyond.")
    c.setStrokeColor(ACCENT)
    c.setLineWidth(3)
    c.line(MARGIN_X + 8, PAGE_H - 292, MARGIN_X + 140, PAGE_H - 292)
    items = [
        "Part A   The Master Prompt & Design Blueprint",
        "Part B   Playable prototype — screenshot tour",
        "Part C   Complete source code (C++, Objective-C++, Swift, Metal, JavaScript, HTML/CSS, Python)",
        "Part D   Verified results — engine tests, physics lab, browser tests",
        "Part E   What I used · how to run it on your MacBook · study guide",
    ]
    c.setFont(F["Body"], 11)
    c.setFillColor(colors.white)
    for k, s in enumerate(items):
        c.drawString(MARGIN_X + 8, PAGE_H - 330 - k * 20, s)
    c.setFont(F["Body"], 9)
    c.setFillColor(colors.HexColor("#8b949e"))
    c.drawString(MARGIN_X + 8, PAGE_H - 450, f"Version 1.0 · {TODAY} · Original work — all clubs, names and presentation are fictional.")
    c.restoreState()

def draw_body(c, doc):
    c.saveState()
    c.setFont(F["Body"], 7.6)
    c.setFillColor(MUTED)
    c.drawString(MARGIN_X, PAGE_H - 30, "KINETIC XI · Master Design Prompt, Blueprint & Source")
    c.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 30, getattr(doc, "current_part", ""))
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(MARGIN_X, PAGE_H - 35, PAGE_W - MARGIN_X, PAGE_H - 35)
    c.line(MARGIN_X, 34, PAGE_W - MARGIN_X, 34)
    c.drawCentredString(PAGE_W / 2, 22, f"{doc.page}")
    c.restoreState()

def draw_part(c, doc):
    c.saveState()
    c.setFillColor(DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, PAGE_H - 12, PAGE_W, 12, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#30363d"))
    c.setFont(F["Body-Bold"], 220)
    c.drawRightString(PAGE_W - 30, 60, getattr(doc, "part_letter", ""))
    c.restoreState()

class KXIDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(str(filename), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=48,
                         bottomMargin=46, title="KINETIC XI — Master Design Prompt, Blueprint & Source",
                         author="KINETIC XI project", subject="Football game design document and complete source code")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f")
        part_frame = Frame(self.leftMargin + 10, self.bottomMargin, self.width - 20, self.height - 120, id="p")
        self.addPageTemplates([PageTemplate(id="cover", frames=[frame], onPage=draw_cover),
                               PageTemplate(id="body", frames=[frame], onPage=draw_body),
                               PageTemplate(id="part", frames=[part_frame], onPage=draw_part)])
        self.current_part = ""
        self.part_letter = ""
        self._n = 0

    def beforeDocument(self):
        # multiBuild lays the document out several times; bookmark keys must be identical
        # on every pass or the table of contents never converges.
        self._n = 0
        self.current_part = ""
        self.part_letter = ""

    def afterFlowable(self, fl):
        if not isinstance(fl, Paragraph):
            return
        name = fl.style.name
        level = {"PartTitle": 0, "H2": 1, "FileTitle": 1, "H3": 2}.get(name)
        if name == "PartLabel":
            self.part_letter = fl.getPlainText().split()[-1]
        if level is None:
            return
        text = fl.getPlainText()
        if name == "PartTitle":
            self.current_part = f"Part {self.part_letter} · {text}"
            text = f"Part {self.part_letter} — {text}"
        key = f"k{self._n}"
        self._n += 1
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=level >= 1)
        if level <= 1:
            self.notify("TOCEntry", (level, text, self.page, key))

class PartMarker(Flowable):
    """Zero-size flowable placed just before a part's page break so the part page's
    background (drawn when the page starts) already knows which letter to show."""
    def __init__(self, letter):
        super().__init__()
        self.letter = letter

    def wrap(self, aw, ah):
        return 0, 0

    def draw(self):
        self.canv._doctemplate.part_letter = self.letter


def part_page(letter, title, desc_lines):
    flows = [NextPageTemplate("part"), PartMarker(letter), PageBreak(), Spacer(1, 140),
             Paragraph(f"PART {letter}", ST["PartLabel"]), Paragraph(escape(title), ST["PartTitle"])]
    for d in desc_lines:
        flows.append(Paragraph(md_inline(d), ST["PartDesc"]))
    flows += [NextPageTemplate("body"), PageBreak()]
    return flows

# --------------------------------------------------------------------------- build ---
def main():
    story = [Spacer(1, 1), NextPageTemplate("body"), PageBreak()]
    toc = TableOfContents()
    toc.levelStyles = TOC_STYLES
    toc.dotsMinLevel = 0
    story += [Paragraph("Contents", ST["TOCTitle"]), toc]

    # Part A — design document
    part_files = sorted(PARTS.glob("0[1-3]_*.md"))
    design_md = "\n\n".join(p.read_text(encoding="utf-8") for p in part_files)
    OUT_MD.write_text(design_md + "\n", encoding="utf-8")
    story += part_page("A", "The Master Prompt & Design Blueprint", [
        "Section 0 is the copy-paste mega-prompt for a game-development AI. Sections 1–9 are the master design "
        "document: vision and identity, engine architecture, physics, AI, presentation, the mandatory MacBook "
        "keyboard scheme, the AAA settings suite, the technical blueprint and the production roadmap.",
        "Every system has a matching implementation in Part C and evidence in Part D."])
    story += md_to_flowables(design_md)

    # Part B — screenshots
    story += part_page("B", "Playable Prototype — Screenshot Tour", [
        "Captured automatically from <b>prototype/index.html</b> by <b>tools/prototype_tests.js</b> (headless Chromium "
        "driven with real key presses). Open the same file on your MacBook to play it."])
    captions = json.loads((SHOTS / "captions.json").read_text(encoding="utf-8")) if (SHOTS / "captions.json").exists() else {}
    for img in sorted(SHOTS.glob("*.jpg")):
        cap = captions.get(img.stem, img.stem.replace("_", " "))
        from PIL import Image as PILImage
        with PILImage.open(img) as im:
            w, h = im.size
        dw = CONTENT_W
        dh = dw * h / w
        story.append(KeepTogether([Image(str(img), width=dw, height=dh), Paragraph(md_inline(cap), ST["Caption"])]))

    # Part C — complete source
    story += part_page("C", "Complete Source Code", [
        "Every source file in the project, in build order: the C++17 engine core and its tests, the macOS layer "
        "(Objective-C++, Swift, Metal), the playable prototype (HTML, CSS, JavaScript), the tools (JavaScript, Python) "
        "and the engine-generated configuration (JSON).",
        "Syntax highlighted with line numbers; long lines continue on a row marked ↳."])
    lang_lines = {}
    lang_files = {}
    for path, desc in SOURCES:
        flows, lang, n = code_listing(path, desc)
        story += flows
        lang_lines[lang] = lang_lines.get(lang, 0) + n
        lang_files.setdefault(lang, []).append(path)

    # Part D — verified results
    story += part_page("D", "Verified Results", [
        "Raw output from the engine test runner, the physics lab and the automated browser tests, produced on the "
        "build machine while making this document."])
    tests_txt = (DOCS / "test_results.txt").read_text(encoding="utf-8")
    lab_txt = (DOCS / "lab_results.txt").read_text(encoding="utf-8")
    proto = json.loads((DOCS / "prototype_test_results.json").read_text(encoding="utf-8"))
    summary = tests_txt.strip().splitlines()[-1]
    story.append(Paragraph("D.1 Summary", ST["H2"]))
    rows = [["Check", "Result"],
            ["C++ engine unit + physics tests", summary],
            ["Compiler warnings (-Wall -Wextra -Wpedantic -Wshadow -Wconversion)", "0"],
            ["Prototype kick-off pass", f"state {proto['kickoffPass']['state']}, ball {proto['kickoffPass']['ballSpeed']} m/s"],
            ["Dribbling — jog / sprint / close control (possession kept)",
             " / ".join(proto["dribble"][k]["possessionKept"] for k in ("jog", "sprint", "closeControl"))],
            ["Sprint-dribble top speed with the ball", f"{proto['dribble']['sprint']['finalSpeedMs']} m/s"],
            ["Immediate shot from 30 m", f"{proto['shot']['shots']} {proto['shot'].get('type', 'Shot')}, {proto['shot']['ballSpeed']} m/s off the boot, {proto['shot'].get('spinRadS', '?')} rad/s spin"],
            ["Storm on the living pitch", f"moisture {proto['storm']['avgMoisture']}, max water {proto['storm']['maxWaterMm']} mm — {proto['storm']['pitch']}"],
            ["Goal flow and half-time", f"{proto['goal']['state']} → {proto['halfTime']}"],
            ["Full-match soak (random keys, heavy rain)",
             f"{proto['soak']['simulatedSeconds']} s simulated, final state {proto['soak']['finalState']}, "
             f"score {proto['soak']['score']}, NaN values {proto['soak']['nanValues']}, page errors {len(proto['pageErrors'])}"]]
    story.append(md_table([[escape(c) for c in r] for r in rows]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("D.2 Engine test run (kxi_tests)", ST["H2"]))
    story.append(code_block(tests_txt))
    story.append(Paragraph("D.3 Physics & systems lab (kxi_lab)", ST["H2"]))
    story.append(code_block(lab_txt))
    story.append(Paragraph("D.4 Browser test results (tools/prototype_tests.js)", ST["H2"]))
    story.append(code_block(json.dumps(proto, indent=2)))

    # Part E — what I used
    story += part_page("E", "What I Used · How to Run · Study Guide", [
        "Every language, library and tool used to make this project, what is implemented versus designed, "
        "step-by-step instructions for your MacBook, and a study guide so you can explain every part."])
    table = ["| Language | Where it is used | Files | Lines |", "|---|---|---|---|"]
    where = {"C++17": "engine core, tests, physics lab", "Objective-C++": "macOS keyboard capture",
             "Swift": "Apple Silicon power/thermal governor", "Metal Shading Language": "GPU grass shader",
             "JavaScript": "playable prototype + browser tests", "HTML5": "prototype page",
             "CSS3": "settings menu styling", "Python 3": "this PDF builder", "CMake": "engine build system",
             "JSON": "settings & key bindings (generated by the engine)"}
    for lang in sorted(lang_lines, key=lambda k: -lang_lines[k]):
        table.append(f"| {lang} | {where.get(lang, '')} | {len(lang_files[lang])} | {lang_lines[lang]:,} |")
    table.append(f"| **Total** | | **{sum(len(v) for v in lang_files.values())}** | **{sum(lang_lines.values()):,}** |")
    used_md = (PARTS / "04_what_i_used.md").read_text(encoding="utf-8").replace("{{LANGUAGE_TABLE}}", "\n".join(table))
    story += md_to_flowables(used_md)

    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    doc = KXIDoc(OUT_PDF)
    doc.multiBuild(story)
    print(f"wrote {OUT_PDF} ({OUT_PDF.stat().st_size / 1e6:.1f} MB, {doc.page} pages)")
    print(f"wrote {OUT_MD}")
    for lang in sorted(lang_lines, key=lambda k: -lang_lines[k]):
        print(f"  {lang:<24} {len(lang_files[lang]):>3} files {lang_lines[lang]:>6} lines")

if __name__ == "__main__":
    main()
