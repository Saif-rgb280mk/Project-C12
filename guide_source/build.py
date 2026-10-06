"""Build the "Learn to Code" PDF.

Usage:  python3 build.py [output.pdf]
"""

import importlib
import os
import sys

from reportlab.platypus import NextPageTemplate, PageBreak, Spacer

from engine import Builder, GuideDoc, LessonHeader, TocMarker, make_toc

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(os.path.dirname(HERE), "Learn-to-Code-Complete-Guide.pdf")

MODULES = [
    "c00_front",
    "c01_welcome",
    "c02_tools",
    "c03_python1",
    "c04_python2",
    "c05_python3",
    "c06_essentials",
    "c07_web",
    "c08_apps",
    "c09_languages",
    "c10_path",
    "c11_appendix",
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    b = Builder()
    # cover page (drawn entirely by the page template)
    b.flow(Spacer(1, 1))
    b.flow(NextPageTemplate("normal"))
    b.flow(PageBreak())
    # table of contents
    b.flow(LessonHeader("Contents", "Table of contents", "#1E3A5F"))
    b.flow(Spacer(1, 8))
    b.flow(make_toc())
    b.flow(PageBreak())

    for name in MODULES:
        if not os.path.exists(os.path.join(HERE, name + ".py")):
            print("skipping missing module", name)
            continue
        importlib.import_module(name).build(b)

    b.finalize()
    doc = GuideDoc(out, title="Learn to Code: A Step-by-Step Guide from Beginner to Developer")
    doc.multiBuild(b.story)
    b.dump_tests(os.path.join(HERE, "build_blocks.json"))
    print("wrote", out, "pages:", doc.page)


if __name__ == "__main__":
    main()
