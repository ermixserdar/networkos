#!/usr/bin/env python3
"""Render docs/KULLANIM_KILAVUZU.md into the branded Turkish user-guide PDF.

The PDF used to be produced by hand, so it drifted from the Markdown it was made from.
This keeps the two in step: edit the Markdown, run this, commit both.

    python3 scripts/build-guide-pdf.py

Requires fpdf2. Colours are the app's own (app.json primaryColor, src/theme.ts).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "KULLANIM_KILAVUZU.md"
TARGET = ROOT / "docs" / "NetworkOS-Kullanim-Kilavuzu.pdf"
DATE = "Eylül 2026"

TEAL = (23, 63, 70)
CORAL = (240, 100, 79)
INK = (16, 47, 56)
MUTED = (100, 119, 123)
SAGE_TEXT = (184, 215, 210)
SAGE_BG = (227, 240, 237)
LINE = (225, 233, 231)
WHITE = (255, 255, 255)

# DejaVu first: it is what the original guide was set in, and it covers Turkish fully.
FONT_CANDIDATES = [
    ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Oblique.ttf"),
    ("Arial.ttf", "Arial Bold.ttf", "Arial Italic.ttf"),
]
FONT_DIRS = [Path("/System/Library/Fonts/Supplemental")]
try:
    import matplotlib

    FONT_DIRS.insert(
        0, Path(matplotlib.__file__).parent / "mpl-data" / "fonts" / "ttf"
    )
except ImportError:
    pass


def find_fonts() -> tuple[Path, Path, Path]:
    for regular, bold, italic in FONT_CANDIDATES:
        for directory in FONT_DIRS:
            if (directory / regular).exists() and (directory / bold).exists():
                return directory / regular, directory / bold, directory / italic
    sys.exit("No Unicode TTF found (looked for DejaVu Sans and Arial).")


def app_version() -> str:
    return json.loads((ROOT / "app.json").read_text(encoding="utf-8"))["expo"]["version"]


class Guide(FPDF):
    """A4 with a page number on every page except the cover and the contents."""

    COVER_PAGES = 2  # the cover and the contents carry no page number

    def __init__(self) -> None:
        super().__init__(format="A4", unit="mm")
        self.set_margins(18, 20, 18)
        self.set_auto_page_break(True, margin=18)

    def footer(self) -> None:
        if self.page_no() <= self.COVER_PAGES:
            return
        self.set_y(-14)
        self.set_font("Sans", "", 8.5)
        self.set_text_color(*MUTED)
        self.cell(0, 6, str(self.page_no()), align="C")


INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))", re.S)


def write_inline(pdf: Guide, text: str, size: float, color=INK) -> None:
    """Emit one paragraph, switching font per run so bold and code stay inline."""
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            pdf.set_font("Sans", "B", size)
            pdf.set_text_color(*TEAL)
            pdf.write(5.6, part[2:-2])
        elif part.startswith("`") and part.endswith("`"):
            pdf.set_font("Sans", "", size - 0.5)
            pdf.set_text_color(*TEAL)
            pdf.write(5.6, part[1:-1])
        elif part.startswith("["):
            label, _ = re.match(r"\[([^\]]+)\]\(([^)]+)\)", part).groups()
            pdf.set_font("Sans", "B", size)
            pdf.set_text_color(*TEAL)
            pdf.write(5.6, label)
        else:
            pdf.set_font("Sans", "", size)
            pdf.set_text_color(*color)
            pdf.write(5.6, part.replace("—", "—"))
    pdf.ln(5.6)


def cover(pdf: Guide, version: str) -> None:
    pdf.add_page()
    pdf.set_fill_color(*TEAL)
    pdf.rect(0, 0, 210, 297, style="F")

    pdf.set_xy(24, 46)
    pdf.set_font("Sans", "B", 12)
    pdf.set_text_color(*CORAL)
    pdf.cell(0, 8, "N E T W O R K O S")

    pdf.set_xy(24, 66)
    pdf.set_font("Sans", "B", 38)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 18, "Kullanım", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_x(24)
    pdf.cell(0, 18, "Kılavuzu")

    pdf.set_fill_color(*CORAL)
    pdf.rect(24, 110, 26, 1.4, style="F")

    pdf.set_xy(24, 118)
    pdf.set_font("Sans", "", 13)
    pdf.set_text_color(*SAGE_TEXT)
    pdf.multi_cell(115, 7, "Kişilerinizi ve ilişkilerinizi hatırlamanın özel, sakin yolu.", align="L")

    pdf.set_xy(24, 258)
    pdf.set_font("Sans", "", 10)
    pdf.set_text_color(127, 163, 160)
    pdf.cell(0, 6, f"Sürüm {version} • {DATE} • Türkçe")


def render_toc(pdf: Guide, entries: list[tuple[str, int]]) -> None:
    pdf.set_font("Sans", "B", 20)
    pdf.set_text_color(*TEAL)
    pdf.cell(0, 12, "İçindekiler", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)
    for title, page in entries:
        pdf.set_font("Sans", "", 11)
        pdf.set_text_color(*INK)
        number = str(page)
        width = pdf.w - pdf.l_margin - pdf.r_margin
        label_w = pdf.get_string_width(title) + 2
        number_w = pdf.get_string_width(number) + 2
        pdf.cell(label_w, 7, title)
        pdf.set_text_color(*MUTED)
        dots = "." * max(0, int((width - label_w - number_w) / pdf.get_string_width(".")))
        pdf.cell(width - label_w - number_w, 7, dots)
        pdf.set_text_color(*INK)
        pdf.cell(number_w, 7, number, align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def heading(pdf: Guide, text: str, level: int) -> None:
    pdf.ln(4 if level == 2 else 3)
    if level == 2 and pdf.get_y() > pdf.h - 45:
        pdf.add_page()
    pdf.set_font("Sans", "B", 15 if level == 2 else 11.5)
    pdf.set_text_color(*TEAL)
    pdf.multi_cell(0, 7, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    if level == 2:
        y = pdf.get_y() + 1
        pdf.set_draw_color(*CORAL)
        pdf.set_line_width(0.5)
        pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
        pdf.ln(3)
    else:
        pdf.ln(1)


def table(pdf: Guide, rows: list[list[str]]) -> None:
    pdf.ln(1)
    header, *body = rows
    widths = (38, 136)
    pdf.set_font("Sans", "B", 9.5)
    pdf.set_fill_color(*TEAL)
    pdf.set_text_color(*WHITE)
    for width, cell in zip(widths, header):
        pdf.cell(width, 8, " " + re.sub(r"\*\*", "", cell), fill=True)
    pdf.ln(8)
    pdf.set_text_color(*INK)
    for row in body:
        top = pdf.get_y()
        pdf.set_font("Sans", "B", 9.5)
        pdf.multi_cell(widths[0], 6, " " + re.sub(r"\*\*", "", row[0]), new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font("Sans", "", 9.5)
        pdf.multi_cell(widths[1], 6, " " + re.sub(r"\*\*", "", row[1]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        bottom = max(pdf.get_y(), top + 6)
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.line(pdf.l_margin, bottom, pdf.w - pdf.r_margin, bottom)
        pdf.set_y(bottom + 1)
    pdf.ln(3)


def quote(pdf: Guide, text: str) -> None:
    pdf.ln(2)
    top = pdf.get_y()
    pdf.set_fill_color(*SAGE_BG)
    pdf.set_x(pdf.l_margin + 4)
    pdf.set_font("Sans", "", 10)
    pdf.set_text_color(*INK)
    pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 4, 6, re.sub(r"\*\*", "", text), fill=True)
    pdf.set_fill_color(*CORAL)
    pdf.rect(pdf.l_margin, top, 1.5, pdf.get_y() - top, style="F")
    pdf.ln(3)


def bullet(pdf: Guide, text: str, marker: str) -> None:
    pdf.set_font("Sans", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.set_x(pdf.l_margin + 2)
    pdf.cell(5, 5.6, marker)
    pdf.set_left_margin(pdf.l_margin + 7)
    pdf.set_x(pdf.l_margin)
    write_inline(pdf, text, 10)
    pdf.set_left_margin(pdf.l_margin - 7)


def build() -> None:
    version = app_version()
    regular, bold, italic = find_fonts()

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    lines = lines[1:] if lines and lines[0].startswith("# ") else lines

    pdf = Guide()
    pdf.set_title("NetworkOS Kullanım Kılavuzu")
    pdf.set_author("NetworkOS")
    pdf.add_font("Sans", "", str(regular))
    pdf.add_font("Sans", "B", str(bold))
    if italic.exists():
        pdf.add_font("Sans", "I", str(italic))

    cover(pdf, version)

    # The contents page is reserved now and filled at the end, once the real page numbers exist.
    pdf.add_page()
    toc_page = pdf.page_no()

    pdf.add_page()
    entries: list[tuple[str, int]] = []
    ordered = 0
    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        index += 1
        if not line.strip():
            ordered = 0
            continue
        if line.startswith("## "):
            title = line[3:].strip()
            heading(pdf, title, 2)
            entries.append((title, pdf.page_no()))
        elif line.startswith("### "):
            heading(pdf, line[4:].strip(), 3)
        elif line.startswith("|"):
            rows = []
            index -= 1
            while index < len(lines) and lines[index].startswith("|"):
                cells = [c.strip() for c in lines[index].strip().strip("|").split("|")]
                if not all(set(c) <= set("-: ") for c in cells):
                    rows.append(cells)
                index += 1
            table(pdf, rows)
        elif line.startswith("> "):
            quote(pdf, line[2:].strip())
        elif line.startswith("- "):
            bullet(pdf, line[2:].strip(), "•")
        elif re.match(r"^\d+\.\s", line):
            ordered += 1
            bullet(pdf, re.sub(r"^\d+\.\s", "", line), f"{ordered}.")
        else:
            pdf.set_x(pdf.l_margin)
            write_inline(pdf, line.strip(), 10)
            pdf.ln(1.2)

    pdf.page = toc_page
    pdf.set_xy(pdf.l_margin, pdf.t_margin)
    render_toc(pdf, entries)
    pdf.page = pdf.pages_count

    pdf.output(str(TARGET))
    print(f"wrote {TARGET.relative_to(ROOT)} — sürüm {version}, {len(entries)} bölüm, {pdf.pages_count} sayfa")


if __name__ == "__main__":
    if not SOURCE.exists():
        sys.exit(f"missing {SOURCE}")
    build()
