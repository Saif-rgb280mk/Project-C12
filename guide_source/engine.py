"""Layout engine for the "Learn to Code" guide.

Content modules call the helpers on a Builder (b.p, b.code, b.out, b.tip ...)
and the Builder turns them into ReportLab flowables with a consistent style.
"""

import json
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

# --------------------------------------------------------------------------
# Fonts
# --------------------------------------------------------------------------
LIB = "/usr/share/fonts/truetype/liberation/"
DJV = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("Body", LIB + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Body-Bold", LIB + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Body-Italic", LIB + "LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Body-BoldItalic", LIB + "LiberationSans-BoldItalic.ttf"))
addMapping("Body", 0, 0, "Body")
addMapping("Body", 1, 0, "Body-Bold")
addMapping("Body", 0, 1, "Body-Italic")
addMapping("Body", 1, 1, "Body-BoldItalic")
pdfmetrics.registerFont(TTFont("Mono", DJV + "DejaVuSansMono.ttf"))
pdfmetrics.registerFont(TTFont("Mono-Bold", DJV + "DejaVuSansMono-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Mono-Italic", DJV + "DejaVuSansMono-Oblique.ttf"))
pdfmetrics.registerFont(TTFont("Mono-BoldItalic", DJV + "DejaVuSansMono-BoldOblique.ttf"))
addMapping("Mono", 0, 0, "Mono")
addMapping("Mono", 1, 0, "Mono-Bold")
addMapping("Mono", 0, 1, "Mono-Italic")
addMapping("Mono", 1, 1, "Mono-BoldItalic")
pdfmetrics.registerFont(TTFont("Sym", DJV + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Sym-Bold", DJV + "DejaVuSans-Bold.ttf"))

# --------------------------------------------------------------------------
# Colours
# --------------------------------------------------------------------------
INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#6B7280")
NAVY = colors.HexColor("#1E3A5F")
RULE = colors.HexColor("#E5E7EB")
CODE_BG = colors.HexColor("#F6F8FA")
CODE_EDGE = colors.HexColor("#D0D7DE")
OUT_BG = colors.HexColor("#1E293B")
OUT_INK = colors.HexColor("#E2E8F0")
OUT_LABEL = colors.HexColor("#94A3B8")

PART_COLORS = [
    "#2563EB",  # 0 welcome
    "#0D9488",  # 1 tools
    "#7C3AED",  # 2 python 1
    "#9333EA",  # 3 python 2
    "#C026D3",  # 4 python 3
    "#EA580C",  # 5 essentials
    "#DC2626",  # 6 websites
    "#DB2777",  # 7 apps
    "#0891B2",  # 8 languages
    "#16A34A",  # 9 path
    "#475569",  # appendices
]

CALLOUTS = {
    # kind: (title, edge colour, background)
    "key": ("Key idea", "#2563EB", "#EFF6FF"),
    "tip": ("Tip", "#16A34A", "#F0FDF4"),
    "warn": ("Watch out", "#D97706", "#FFFBEB"),
    "try": ("Try it yourself", "#7C3AED", "#F5F3FF"),
    "note": ("Good to know", "#0891B2", "#ECFEFF"),
    "real": ("In the real world", "#DB2777", "#FDF2F8"),
}

PAGE_W, PAGE_H = A4
MARGIN_X = 20 * mm
MARGIN_TOP = 22 * mm
MARGIN_BOTTOM = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN_X

# --------------------------------------------------------------------------
# Paragraph styles
# --------------------------------------------------------------------------
BODY = ParagraphStyle(
    "body", fontName="Body", fontSize=10.5, leading=15.2, textColor=INK, spaceAfter=6.5
)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=9, leading=12.5, spaceAfter=3)
BULLET = ParagraphStyle(
    "bullet", parent=BODY, leftIndent=15, bulletIndent=3, spaceAfter=3.5, bulletFontName="Sym"
)
BULLET2 = ParagraphStyle("bullet2", parent=BULLET, leftIndent=30, bulletIndent=18)
NUMBERED = ParagraphStyle(
    "numbered", parent=BODY, leftIndent=19, bulletIndent=2, spaceAfter=3.5,
    bulletFontName="Body-Bold",
)
H2 = ParagraphStyle(
    "h2", fontName="Body-Bold", fontSize=19, leading=24, textColor=NAVY, spaceBefore=4, spaceAfter=2
)
H2_LABEL = ParagraphStyle(
    "h2label", fontName="Body-Bold", fontSize=8.5, leading=11, spaceAfter=1
)
H3 = ParagraphStyle(
    "h3", fontName="Body-Bold", fontSize=13, leading=17, textColor=NAVY, spaceBefore=9, spaceAfter=4
)
H4 = ParagraphStyle(
    "h4", fontName="Body-Bold", fontSize=11, leading=15, textColor=INK, spaceBefore=6, spaceAfter=3
)
CELL = ParagraphStyle("cell", fontName="Body", fontSize=9, leading=12, textColor=INK)
CELL_HEAD = ParagraphStyle(
    "cellhead", fontName="Body-Bold", fontSize=9, leading=12, textColor=colors.white
)
CODE_LINE = ParagraphStyle(
    "codeline", fontName="Mono", fontSize=8.4, leading=11.2, textColor=colors.HexColor("#24292F")
)
OUT_LINE = ParagraphStyle("outline", parent=CODE_LINE, textColor=OUT_INK)
CODE_LABEL = ParagraphStyle(
    "codelabel", fontName="Body-Bold", fontSize=7, leading=9, textColor=colors.HexColor("#57606A")
)
CALLOUT_TITLE = ParagraphStyle("callouttitle", parent=BODY, fontName="Body-Bold", spaceAfter=2)
CALLOUT_BODY = ParagraphStyle("calloutbody", parent=BODY, spaceAfter=2)
CALLOUT_ITEM = ParagraphStyle(
    "calloutitem", parent=CALLOUT_BODY, leftIndent=17, bulletIndent=0, bulletFontName="Body-Bold"
)

# --------------------------------------------------------------------------
# Inline markup:  `code`   **bold**   *italic*   [text](url)   {sym:✓}
# --------------------------------------------------------------------------
_INLINE_CODE = re.compile(r"`([^`]+)`")


def fmt(text, code_color="#B4235A"):
    """Convert the guide's tiny markup language into ReportLab paragraph XML."""
    pieces = []

    def stash(match):
        pieces.append(match.group(1))
        return f"\x00{len(pieces) - 1}\x00"

    text = _INLINE_CODE.sub(stash, text)
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", text)
    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<a href="\2" color="#1D4ED8"><u>\1</u></a>',
        text,
    )
    text = re.sub(r"\{sym:([^}]+)\}", r'<font name="Sym">\1</font>', text)

    def unstash(match):
        code = escape(pieces[int(match.group(1))]).replace(" ", "&nbsp;")
        return (
            f'<font name="Mono" size="9" color="{code_color}">{code}</font>'
        )

    text = re.sub(r"\x00(\d+)\x00", unstash, text)
    return text.replace("{bt}", "`")


# --------------------------------------------------------------------------
# Syntax highlighting
# --------------------------------------------------------------------------
GH = {
    "kw": "#CF222E",
    "str": "#0A3069",
    "com": "#6E7781",
    "num": "#0550AE",
    "fn": "#8250DF",
    "tag": "#116329",
    "attr": "#953800",
    "prop": "#0550AE",
    "plain": "#24292F",
}

_KW = {
    "python": "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield",
    "javascript": "const let var function return if else for while do of in new class extends import export from default async await try catch finally throw this typeof true false null undefined break continue switch case",
    "typescript": "const let var function return if else for while do of in new class extends import export from default async await try catch finally throw this typeof true false null undefined interface type string number boolean",
    "java": "public private protected class static void int double boolean String return if else for while new import package extends implements this true false null try catch final",
    "kotlin": "fun val var return if else for in while class object import true false null when",
    "c": "int char void return if else for while const include struct double float unsigned long sizeof",
    "cpp": "int char void return if else for while const include struct double float auto class public private std",
    "csharp": "string var return if else foreach in for while class public static void int using new true false null",
    "swift": "func let var return if else for in while struct class import some private true false nil",
    "go": "package import func return if else for range var const type struct map true false nil",
    "rust": "fn let mut return if else for in while loop match struct impl use pub true false",
    "php": "function return if else foreach as echo while for true false null",
    "ruby": "def end do if else elsif while puts class return true false nil each",
    "sql": "SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PRIMARY KEY NOT NULL INTEGER TEXT ORDER BY DESC ASC AND OR JOIN ON AS LIMIT GROUP COUNT",
    "r": "function for in if else TRUE FALSE NULL",
    "dart": "void final const var return if else for in while class extends import true false null int String",
    "bash": "if then else fi for in do done echo function cd ls git python python3 pip mkdir npm npx node",
    "lua": "local function return end for in do if then else while true false nil",
    "css": "",
    "html": "",
    "text": "",
}
_BUILTINS = {
    "python": "print input len range int float str bool list dict set tuple type sum max min sorted enumerate zip open round abs isinstance super",
    "javascript": "console document window fetch Math JSON",
    "typescript": "console document window fetch Math JSON",
}
_LINE_COMMENT = {
    "python": "#", "ruby": "#", "bash": "#", "r": "#",
    "javascript": "//", "typescript": "//", "java": "//", "kotlin": "//", "c": "//",
    "cpp": "//", "csharp": "//", "swift": "//", "go": "//", "rust": "//", "dart": "//",
    "php": "//", "sql": "--", "lua": "--",
}
_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|.", re.S)


def _span(text, kind):
    text = escape(text).replace(" ", "&nbsp;")
    if kind == "plain":
        return text
    style = ""
    if kind == "com":
        return f'<font color="{GH["com"]}"><i>{text}</i></font>'
    return f'<font color="{GH[kind]}">{style}{text}</font>'


def highlight_line(line, lang):
    if lang in ("text", "output", ""):
        return escape(line.expandtabs(8)).replace(" ", "&nbsp;") or "&nbsp;"
    if lang == "html":
        return _highlight_html(line)
    kws = set(_KW.get(lang, "").split())
    builtins = set(_BUILTINS.get(lang, "").split())
    lc = _LINE_COMMENT.get(lang)
    out = []
    i = 0
    n = len(line)
    while i < n:
        ch = line[i]
        if lc and line.startswith(lc, i):
            out.append(_span(line[i:], "com"))
            break
        if lang == "css" and line.startswith("/*", i):
            end = line.find("*/", i + 2)
            end = n if end == -1 else end + 2
            out.append(_span(line[i:end], "com"))
            i = end
            continue
        if ch in "\"'`":
            j = i + 1
            while j < n and line[j] != ch:
                j += 2 if line[j] == "\\" else 1
            j = min(j + 1, n)
            # python f / string prefixes are tokenised as identifiers before this
            out.append(_span(line[i:j], "str"))
            i = j
            continue
        m = _TOKEN.match(line, i)
        tok = m.group(0)
        if tok[0].isdigit():
            kind = "num"
        elif tok[0].isalpha() or tok[0] == "_":
            nxt = line[m.end():m.end() + 1]
            if lang == "python" and tok in ("f", "r", "b", "rb", "fr") and nxt in "\"'":
                kind = "str"
            elif tok in kws or (lang == "sql" and tok.upper() in kws):
                kind = "kw"
            elif tok in builtins:
                kind = "fn"
            elif lang == "css":
                rest = line[m.end():].lstrip()
                kind = "prop" if rest.startswith(":") and line.strip().endswith(";") else "plain"
            elif nxt == "(":
                kind = "fn"
            else:
                kind = "plain"
        elif lang == "css" and tok in ".#" and m.end() < n and (line[m.end()].isalpha()):
            m2 = re.match(r"[.#][A-Za-z0-9_-]+", line[i:])
            tok = m2.group(0)
            out.append(_span(tok, "tag"))
            i += len(tok)
            continue
        elif lang == "python" and tok == "@":
            m2 = re.match(r"@[\w.]+", line[i:])
            tok = m2.group(0)
            kind = "fn"
        else:
            kind = "plain"
        out.append(_span(tok, kind))
        i += len(tok)
    return "".join(out) or "&nbsp;"


def _highlight_html(line):
    out = []
    i = 0
    n = len(line)
    in_tag = False
    while i < n:
        if line.startswith("<!--", i):
            end = line.find("-->", i)
            end = n if end == -1 else end + 3
            out.append(_span(line[i:end], "com"))
            i = end
            continue
        if not in_tag and line[i] == "<":
            m = re.match(r"</?[A-Za-z!][A-Za-z0-9-]*", line[i:])
            if m:
                out.append(_span(m.group(0), "tag"))
                i += len(m.group(0))
                in_tag = True
                continue
        if in_tag:
            if line[i] == ">" or line.startswith("/>", i):
                tok = "/>" if line.startswith("/>", i) else ">"
                out.append(_span(tok, "tag"))
                i += len(tok)
                in_tag = False
                continue
            if line[i] in "\"'":
                q = line[i]
                j = line.find(q, i + 1)
                j = n if j == -1 else j + 1
                out.append(_span(line[i:j], "str"))
                i = j
                continue
            m = re.match(r"[A-Za-z-]+", line[i:])
            if m:
                out.append(_span(m.group(0), "attr"))
                i += len(m.group(0))
                continue
        out.append(_span(line[i], "plain"))
        i += 1
    return "".join(out) or "&nbsp;"


LANG_LABELS = {
    "python": "PYTHON", "javascript": "JAVASCRIPT", "typescript": "TYPESCRIPT", "html": "HTML",
    "css": "CSS", "java": "JAVA", "kotlin": "KOTLIN", "c": "C", "cpp": "C++", "csharp": "C#",
    "swift": "SWIFT", "go": "GO", "rust": "RUST", "php": "PHP", "ruby": "RUBY", "sql": "SQL",
    "r": "R", "dart": "DART", "bash": "TERMINAL", "lua": "LUA", "text": "", "jsx": "JAVASCRIPT (REACT NATIVE)",
}


# --------------------------------------------------------------------------
# Custom flowables
# --------------------------------------------------------------------------
class TocMarker(Flowable):
    """Zero-size flowable that registers a TOC entry + PDF bookmark when drawn."""

    def __init__(self, text, level, key, part_name=None, part_color=None):
        super().__init__()
        self.text = text
        self.level = level
        self.key = key
        self.part_name = part_name
        self.part_color = part_color
        self.width = self.height = 0

    def wrap(self, *args):
        return (0, 0)

    def draw(self):
        pass


class PartBanner(Flowable):
    """Big coloured banner at the start of each part."""

    def __init__(self, number_label, title, subtitle, color):
        super().__init__()
        self.number_label = number_label
        self.title = title
        self.subtitle = subtitle
        self.color = colors.HexColor(color)
        self.height = 210

    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        return (avail_w, self.height)

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(self.color)
        c.roundRect(0, 0, self.width, self.height, 10, stroke=0, fill=1)
        # decorative circles
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.08))
        c.circle(self.width - 40, self.height - 30, 90, stroke=0, fill=1)
        c.circle(self.width - 120, 10, 50, stroke=0, fill=1)
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.85))
        c.setFont("Body-Bold", 12)
        c.drawString(26, self.height - 42, self.number_label.upper())
        c.setFillColor(colors.white)
        c.setFont("Body-Bold", 30)
        y = self.height - 84
        for line in _wrap_words(self.title, "Body-Bold", 30, self.width - 60):
            c.drawString(26, y, line)
            y -= 36
        c.setFont("Body", 12.5)
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.92))
        y -= 4
        for line in _wrap_words(self.subtitle, "Body", 12.5, self.width - 60):
            c.drawString(26, y, line)
            y -= 17
        c.restoreState()


def _wrap_words(text, font, size, width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


class LessonHeader(Flowable):
    """Lesson title: small coloured label, big title, coloured rule."""

    def __init__(self, label, title, color):
        super().__init__()
        self.label = label
        self.title = title
        self.color = colors.HexColor(color)

    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        self.lines = _wrap_words(self.title, "Body-Bold", 20, avail_w)
        self.height = 22 + 25 * len(self.lines) + 12
        return (avail_w, self.height)

    def draw(self):
        c = self.canv
        h = self.height
        c.saveState()
        if self.label:
            c.setFillColor(self.color)
            c.setFont("Body-Bold", 8.5)
            label_w = pdfmetrics.stringWidth(self.label.upper(), "Body-Bold", 8.5) + 14
            c.roundRect(0, h - 15, label_w, 14, 3, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.drawString(7, h - 11, self.label.upper())
        c.setFillColor(NAVY)
        c.setFont("Body-Bold", 20)
        y = h - 40
        for line in self.lines:
            c.drawString(0, y, line)
            y -= 25
        c.setStrokeColor(self.color)
        c.setLineWidth(2.2)
        c.line(0, 4, 60, 4)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.line(62, 4, self.width, 4)
        c.restoreState()


# --------------------------------------------------------------------------
# Document template
# --------------------------------------------------------------------------
class GuideDoc(BaseDocTemplate):
    def __init__(self, filename, title, **kw):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title=title,
            author="Learn to Code guide",
            subject="A step-by-step guide from complete beginner to developer",
            **kw,
        )
        self.current_part = ""
        self.current_color = PART_COLORS[0]
        frame = Frame(MARGIN_X, MARGIN_BOTTOM, CONTENT_W, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
                      id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover", leftPadding=0, rightPadding=0,
                            topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover),
            PageTemplate(id="normal", frames=[frame], onPageEnd=self._decorate),
        ])

    def beforeDocument(self):
        self.current_part = ""
        self.current_color = PART_COLORS[0]

    def _decorate(self, canv, doc):
        canv.saveState()
        page = canv.getPageNumber()
        color = colors.HexColor(self.current_color)
        # top band
        canv.setFillColor(color)
        canv.rect(0, PAGE_H - 5, PAGE_W, 5, stroke=0, fill=1)
        canv.setFont("Body", 8)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN_X, PAGE_H - 14 * mm, "LEARN TO CODE  ·  From zero to developer")
        if self.current_part:
            canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 14 * mm, self.current_part.upper())
        canv.setStrokeColor(RULE)
        canv.setLineWidth(0.6)
        canv.line(MARGIN_X, PAGE_H - 15.8 * mm, PAGE_W - MARGIN_X, PAGE_H - 15.8 * mm)
        # footer page number pill
        canv.setFillColor(color)
        canv.roundRect(PAGE_W / 2 - 14, 9 * mm, 28, 13, 6.5, stroke=0, fill=1)
        canv.setFillColor(colors.white)
        canv.setFont("Body-Bold", 8)
        canv.drawCentredString(PAGE_W / 2, 9 * mm + 4, str(page))
        canv.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, TocMarker):
            if flowable.part_name is not None:
                self.current_part = flowable.part_name
                self.current_color = flowable.part_color
            self.canv.bookmarkPage(flowable.key)
            self.canv.addOutlineEntry(flowable.text, flowable.key, level=flowable.level,
                                      closed=flowable.level > 0)
            self.notify("TOCEntry", (flowable.level, flowable.text, self.page, flowable.key))


def draw_cover(canv, doc):
    canv.saveState()
    # background gradient made of bands
    top = colors.HexColor("#0F172A")
    bottom = colors.HexColor("#1E3A5F")
    steps = 60
    for i in range(steps):
        t = i / (steps - 1)
        r = top.red + (bottom.red - top.red) * t
        g = top.green + (bottom.green - top.green) * t
        bl = top.blue + (bottom.blue - top.blue) * t
        canv.setFillColor(colors.Color(r, g, bl))
        canv.rect(0, PAGE_H - (i + 1) * PAGE_H / steps, PAGE_W, PAGE_H / steps + 1, stroke=0, fill=1)

    # colourful "code lines" decoration
    palette = PART_COLORS[:10]
    y = PAGE_H - 70
    widths = [180, 260, 140, 300, 220, 90, 240, 170, 280, 120, 210, 160]
    indents = [0, 30, 30, 60, 60, 30, 0, 30, 60, 60, 30, 0]
    for k, (w, ind) in enumerate(zip(widths, indents)):
        canv.setFillColor(colors.HexColor(palette[k % len(palette)]))
        canv.setFillAlpha(0.55)
        canv.roundRect(PAGE_W - 330 + ind, y - k * 17, w * 0.75, 7, 3.5, stroke=0, fill=1)
    canv.setFillAlpha(1)

    canv.setFillColor(colors.HexColor("#93C5FD"))
    canv.setFont("Mono", 13)
    canv.drawString(MARGIN_X + 4, PAGE_H * 0.58, '>>> print("Hello, world!")')
    canv.setFillColor(colors.white)
    canv.drawString(MARGIN_X + 4, PAGE_H * 0.58 - 20, "Hello, world!")

    canv.setFillColor(colors.white)
    canv.setFont("Body-Bold", 52)
    canv.drawString(MARGIN_X, PAGE_H * 0.46, "Learn to Code")
    canv.setFont("Body", 19)
    canv.setFillColor(colors.HexColor("#CBD5E1"))
    canv.drawString(MARGIN_X, PAGE_H * 0.46 - 34, "A step-by-step guide from complete beginner")
    canv.drawString(MARGIN_X, PAGE_H * 0.46 - 58, "to developer")

    canv.setStrokeColor(colors.HexColor("#3B82F6"))
    canv.setLineWidth(3)
    canv.line(MARGIN_X, PAGE_H * 0.46 - 80, MARGIN_X + 70, PAGE_H * 0.46 - 80)

    topics = [
        "Python from zero", "Websites: HTML, CSS, JavaScript", "Mobile, desktop & web apps",
        "Git, databases, APIs & the terminal", "20 programming languages explained",
        "Career paths, roadmap & 100+ exercises",
    ]
    canv.setFont("Body", 11.5)
    y = PAGE_H * 0.46 - 108
    for t in topics:
        canv.setFillColor(colors.HexColor("#60A5FA"))
        canv.circle(MARGIN_X + 4, y + 3.5, 2.6, stroke=0, fill=1)
        canv.setFillColor(colors.HexColor("#E2E8F0"))
        canv.drawString(MARGIN_X + 14, y, t)
        y -= 19

    canv.setFillColor(colors.HexColor("#94A3B8"))
    canv.setFont("Body", 10)
    canv.drawString(MARGIN_X, 22 * mm, "Start slow and small. Build up one step at a time.")
    canv.drawRightString(PAGE_W - MARGIN_X, 22 * mm, "Edition 1  ·  October 2026")
    canv.restoreState()


# --------------------------------------------------------------------------
# Builder: the API content modules use
# --------------------------------------------------------------------------
def _flatten(items):
    """Unpack nested KeepTogether groups (nesting them forces page breaks)."""
    flat = []
    for f in items:
        if isinstance(f, KeepTogether):
            flat.extend(_flatten(f._content))
        else:
            flat.append(f)
    return flat


class Builder:
    def __init__(self):
        self.story = []
        self.key_n = 0
        self.part_color = PART_COLORS[0]
        self.part_index = 0
        self.python_tests = []      # (code, expected_output) pairs
        self.python_blocks = []     # every python block, for syntax checks
        self.all_blocks = []        # (lang, code)
        self._last_python = None
        self.lesson_no = 0

    # ---- structure -------------------------------------------------------
    def _key(self):
        self.key_n += 1
        return f"k{self.key_n}"

    def part(self, label, title, subtitle, learn, color_index=None):
        if color_index is None:
            color_index = self.part_index
        self.part_index = color_index + 1
        self.part_color = PART_COLORS[color_index]
        self.story.append(NextPageTemplate("normal"))
        self.story.append(PageBreak())
        toc_text = f"{label}: {title}" if label else title
        self.story.append(TocMarker(toc_text, 0, self._key(), part_name=f"{label}  ·  {title}" if label else title,
                                    part_color=self.part_color))
        self.story.append(PartBanner(label, title, subtitle, self.part_color))
        self.story.append(Spacer(1, 18))
        if learn:
            self.h3("In this part you will learn")
            self.bullets(learn, check=True)

    def lesson(self, title, label=None, new_page=False, toc=True, level=1):
        if new_page:
            self.story.append(PageBreak())
        else:
            self.story.append(CondPageBreak(230))
        self.story.append(Spacer(1, 6))
        if toc:
            toc_title = f"{label} · {title}" if label else title
            marker = TocMarker(toc_title, level, self._key(),
                               part_name=title if level == 0 else None,
                               part_color=self.part_color if level == 0 else None)
            marker._kwn = True
            self.story.append(marker)
        header = LessonHeader(label or "", title, self.part_color)
        header._kwn = True
        self.story.append(header)
        self.story.append(Spacer(1, 10))

    def h3(self, text):
        self.story.append(CondPageBreak(80))
        para = Paragraph(fmt(text), H3)
        para._kwn = True
        self.story.append(para)

    def h4(self, text):
        self.story.append(CondPageBreak(60))
        para = Paragraph(fmt(text), H4)
        para._kwn = True
        self.story.append(para)

    def p(self, text, style=BODY, kwn=None):
        para = Paragraph(fmt(text), style)
        if kwn is None:
            kwn = text.rstrip().endswith(":")
        para._kwn = kwn
        self.story.append(para)

    def group(self, start):
        """Keep everything added since index `start` on one page."""
        items = _flatten(self.story[start:])
        del self.story[start:]
        self.story.append(KeepTogether(items))

    def finalize(self):
        """Keep headings and lead-in paragraphs together with what follows them."""
        out = []
        st = self.story
        i = 0
        while i < len(st):
            f = st[i]
            if not getattr(f, "_kwn", False):
                out.append(f)
                i += 1
                continue
            group = [f]
            j = i + 1
            while j < len(st) and (getattr(st[j], "_kwn", False) or isinstance(st[j], Spacer)):
                group.append(st[j])
                j += 1
            if j >= len(st):
                out.extend(group)
                break
            nxt = st[j]
            if isinstance(nxt, Table) and len(nxt._cellvalues) > 30:
                out.append(CondPageBreak(180))
                out.extend(group)
                out.append(nxt)
            else:
                out.append(KeepTogether(_flatten(group + [nxt])))
            i = j + 1
        self.story = out
        return out

    def small(self, text):
        self.p(text, SMALL)

    def space(self, h=6):
        self.story.append(Spacer(1, h))

    def pagebreak(self):
        self.story.append(PageBreak())

    def keep(self, h):
        self.story.append(CondPageBreak(h))

    def _bstyle(self, base, color, font):
        key = (base.name, color, font)
        cache = self.__dict__.setdefault("_bcache", {})
        if key not in cache:
            cache[key] = ParagraphStyle(f"{base.name}-{len(cache)}", parent=base,
                                        bulletColor=colors.HexColor(color), bulletFontName=font)
        return cache[key]

    def bullets(self, items, check=False):
        start = len(self.story)
        self._bullets(items, check)
        if check or len(items) <= 6:
            self.group(start)

    def _bullets(self, items, check=False):
        mark = "\u2713" if check else "\u2022"
        font = "Sym-Bold" if check else "Sym"
        for item in items:
            if isinstance(item, (list, tuple)):
                for sub in item:
                    self.story.append(Paragraph(fmt(sub), self._bstyle(BULLET2, self.part_color, "Sym"),
                                                bulletText="\u2013"))
            else:
                self.story.append(Paragraph(fmt(item), self._bstyle(BULLET, self.part_color, font),
                                            bulletText=mark))
        self.story.append(Spacer(1, 3))

    def steps(self, items, start=1):
        first = len(self.story)
        style = self._bstyle(NUMBERED, self.part_color, "Body-Bold")
        for k, item in enumerate(items, start=start):
            self.story.append(Paragraph(fmt(item), style, bulletText=f"{k}."))
        self.story.append(Spacer(1, 3))
        if len(items) <= 6:
            self.group(first)

    # ---- code ------------------------------------------------------------
    def code(self, src, lang="python", label=None, test=True, bad=False, keep=True):
        src = src.strip("\n")
        lines = src.split("\n")
        self.all_blocks.append((lang, src))
        if lang == "python":
            self.python_blocks.append((src, bad))
            if any(w in src for w in ("input(", "import random", "turtle", "tkinter",
                                       "requests", "flask", "pygame", "datetime", "date.today")):
                test = False
            self._last_python = src if (test and not bad) else None
        else:
            self._last_python = None
        hl_lang = "javascript" if lang == "jsx" else lang
        label = LANG_LABELS.get(lang, lang.upper()) if label is None else label
        rows = []
        if label:
            rows.append([Paragraph(label, CODE_LABEL)])
        for line in lines:
            rows.append([Paragraph(highlight_line(line, hl_lang), CODE_LINE)])
        t = Table(rows, colWidths=[CONTENT_W])
        style = [
            ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
            ("LINEBEFORE", (0, 0), (0, -1), 2.5, colors.HexColor(self.part_color)),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 0.4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0.4),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
        ]
        if label:
            style.append(("BOTTOMPADDING", (0, 0), (-1, 0), 3))
        t.setStyle(TableStyle(style))
        self._pending_code = t
        if keep and len(lines) <= 30:
            self.story.append(KeepTogether([t, Spacer(1, 7)]))
        else:
            self.story.append(t)
            self.story.append(Spacer(1, 7))

    def out(self, text, label="OUTPUT", test=True):
        text = text.strip("\n")
        if self._last_python is not None and test:
            self.python_tests.append((self._last_python, text))
        self._last_python = None
        rows = [[Paragraph(label, ParagraphStyle("ol", parent=CODE_LABEL, textColor=OUT_LABEL))]]
        for line in text.split("\n"):
            rows.append([Paragraph(highlight_line(line, "text"), OUT_LINE)])
        t = Table(rows, colWidths=[CONTENT_W])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), OUT_BG),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 0.4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0.4),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
        ]))
        # keep code + output together when both are short
        prev = self.story[-1] if self.story else None
        if isinstance(prev, KeepTogether) and len(text.split("\n")) <= 14:
            content = prev._content
            if len(content) == 2 and isinstance(content[0], Table):
                nrows = len(content[0]._cellvalues)
                if nrows + len(rows) <= 40:
                    self.story[-1] = KeepTogether([content[0], Spacer(1, 3), t, Spacer(1, 8)])
                    return
        self.story.append(KeepTogether([t, Spacer(1, 8)]))

    # ---- boxes -----------------------------------------------------------
    def box(self, kind, body, title=None, items=None, numbered=True):
        default_title, edge, bg = CALLOUTS[kind]
        title = title or default_title
        rows = [[Paragraph(f'<font color="{edge}">{escape(title).upper()}</font>',
                           ParagraphStyle("bt", parent=CALLOUT_TITLE, fontSize=8.5, leading=11))]]
        if body:
            paras = body if isinstance(body, (list, tuple)) else [body]
            for para in paras:
                rows.append([Paragraph(fmt(para), CALLOUT_BODY)])
        for k, item in enumerate(items or [], start=1):
            st = self._bstyle(CALLOUT_ITEM, edge, "Body-Bold" if numbered else "Sym")
            rows.append([Paragraph(fmt(item), st, bulletText=f"{k}." if numbered else "•")])
        t = Table(rows, colWidths=[CONTENT_W])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
            ("LINEBEFORE", (0, 0), (0, -1), 3.5, colors.HexColor(edge)),
            ("LEFTPADDING", (0, 0), (-1, -1), 13),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 1.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
        ]))
        if len(rows) <= 9:
            self.story.append(KeepTogether([Spacer(1, 3), t, Spacer(1, 9)]))
        else:
            self.story.extend([Spacer(1, 3), t, Spacer(1, 9)])
        self._last_python = None

    def key(self, body, title=None):
        self.box("key", body, title)

    def tip(self, body, title=None):
        self.box("tip", body, title)

    def warn(self, body, title=None):
        self.box("warn", body, title)

    def note(self, body, title=None):
        self.box("note", body, title)

    def real(self, body, title=None):
        self.box("real", body, title)

    def tryit(self, items, intro=None, title=None):
        self.box("try", intro or "", title=title or "Try it yourself  (answers in Appendix A)",
                 items=items)

    # ---- tables ----------------------------------------------------------
    def table(self, header, rows, widths=None, font_size=None, mono_cols=(), head_color=None):
        ncols = len(header) if header is not None else len(rows[0])
        widths = widths or [1] * ncols
        total = sum(widths)
        col_w = [CONTENT_W * w / total for w in widths]
        cell = CELL if font_size is None else ParagraphStyle("c2", parent=CELL, fontSize=font_size,
                                                             leading=font_size + 3)
        head = CELL_HEAD if font_size is None else ParagraphStyle(
            "h2c", parent=CELL_HEAD, fontSize=font_size, leading=font_size + 3)
        data = [] if header is None else [[Paragraph(fmt(h, code_color="#FDE68A"), head) for h in header]]
        for r in rows:
            row = []
            for ci, c in enumerate(r):
                txt = fmt(c) if ci not in mono_cols else \
                    f'<font name="Mono" size="{(font_size or 9) - 0.5}">{escape(c)}</font>'
                row.append(Paragraph(txt, cell))
            data.append(row)
        t = Table(data, colWidths=col_w, repeatRows=0 if header is None else 1)
        style = [] if header is None else [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(head_color or self.part_color))]
        style += [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE),
            ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ]
        first = 0 if header is None else 1
        if header is None:
            style.append(("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")))
        for ri in range(first, len(data)):
            if ri % 2 == (1 if header is None else 0) and header is not None:
                style.append(("BACKGROUND", (0, ri), (-1, ri), colors.HexColor("#F9FAFB")))
        t.setStyle(TableStyle(style))
        if len(rows) <= 12:
            self.story.append(KeepTogether([t, Spacer(1, 10)]))
        else:
            self.story.extend([t, Spacer(1, 10)])
        self._last_python = None

    def image(self, path, width, caption=None):
        from reportlab.lib.utils import ImageReader
        iw, ih = ImageReader(path).getSize()
        height = width * ih / iw
        img = Image(path, width=width, height=height)
        parts = [img]
        if caption:
            parts.append(Spacer(1, 4))
            parts.append(Paragraph(fmt(caption), ParagraphStyle(
                "cap", parent=SMALL, alignment=TA_CENTER, textColor=MUTED)))
        parts.append(Spacer(1, 10))
        self.story.append(KeepTogether(parts))

    def flow(self, flowable):
        self.story.append(flowable)

    # ---- output for tests ------------------------------------------------
    def dump_tests(self, path):
        with open(path, "w") as f:
            json.dump({
                "python_tests": self.python_tests,
                "python_blocks": self.python_blocks,
                "all_blocks": self.all_blocks,
            }, f, indent=1)


def make_toc():
    toc = TableOfContents()
    toc.dotsMinLevel = 1
    toc.levelStyles = [
        ParagraphStyle("toc0", fontName="Body-Bold", fontSize=11, leading=14.5, textColor=NAVY,
                       spaceBefore=7, leftIndent=0, firstLineIndent=0),
        ParagraphStyle("toc1", fontName="Body", fontSize=9.4, leading=12.4, textColor=INK,
                       leftIndent=14, firstLineIndent=0),
    ]
    return toc
