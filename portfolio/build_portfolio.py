from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Portfolio_Haolei_Xu_MSc_AIDM.pdf"
LINKS_FILE = ROOT / "portfolio" / "links.json"
HERO_PNG = ROOT / "docs" / "images" / "portfolio-hero.png"
HERO_JPG = ROOT / "tmp" / "pdfs" / "portfolio-hero.jpg"

PAGE_W, PAGE_H = A4
MARGIN = 44

INK = HexColor("#111827")
MUTED = HexColor("#5F6B7A")
BLUE = HexColor("#2563EB")
BLUE_DARK = HexColor("#1D4ED8")
BLUE_PALE = HexColor("#EFF6FF")
LINE = HexColor("#D7DEE8")
PAPER = HexColor("#FFFFFF")
SOFT = HexColor("#F7F9FC")
GREEN = HexColor("#0F766E")
AMBER = HexColor("#B45309")


def load_links() -> dict[str, str]:
    data = json.loads(LINKS_FILE.read_text(encoding="utf-8"))
    return {
        "github_url": str(data.get("github_url", "")).strip(),
        "video_url": str(data.get("video_url", "")).strip(),
    }


def prepare_hero() -> None:
    HERO_JPG.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(HERO_PNG) as image:
        image = image.convert("RGB")
        max_width = 1900
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        image.save(HERO_JPG, "JPEG", quality=84, optimize=True, progressive=True)


def wrap_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font: str = "Helvetica",
    size: float = 9.4,
    leading: float = 13.2,
    color: Color = INK,
) -> float:
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    for line in wrap_lines(text, font, size, width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    pdf: canvas.Canvas,
    items: Iterable[str],
    x: float,
    y: float,
    width: float,
    *,
    size: float = 9.2,
    leading: float = 12.4,
) -> float:
    for item in items:
        pdf.setFillColor(BLUE)
        pdf.circle(x + 3, y + 3, 1.8, fill=1, stroke=0)
        lines = wrap_lines(item, "Helvetica", size, width - 17)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica", size)
        for index, line in enumerate(lines):
            pdf.drawString(x + 14, y - index * leading, line)
        y -= max(1, len(lines)) * leading + 4
    return y


def section_label(pdf: canvas.Canvas, number: str, label: str, y: float) -> None:
    pdf.setFillColor(BLUE)
    pdf.roundRect(MARGIN, y - 2, 25, 16, 4, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(MARGIN + 12.5, y + 3, number)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 8.3)
    pdf.drawString(MARGIN + 34, y + 3, label.upper())


def page_header(pdf: canvas.Canvas, page_number: int, title: str, subtitle: str) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(BLUE)
    pdf.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(MARGIN, PAGE_H - 31, "HAOLEI XU  /  MSc AI AND DIGITAL MEDIA")
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 31, f"0{page_number}")
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(MARGIN, PAGE_H - 66, title)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(MARGIN, PAGE_H - 83, subtitle)
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN, PAGE_H - 96, PAGE_W - MARGIN, PAGE_H - 96)


def draw_footer(pdf: canvas.Canvas) -> None:
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN, 31, PAGE_W - MARGIN, 31)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7.7)
    pdf.drawString(MARGIN, 18, "Independent project portfolio  |  Haolei Xu  |  1583081820@qq.com")


def draw_draft_watermark(pdf: canvas.Canvas) -> None:
    pdf.saveState()
    width = 124
    x = PAGE_W - MARGIN - width
    y = 38
    pdf.setFillColor(HexColor("#FFF7ED"))
    pdf.setStrokeColor(HexColor("#FDBA74"))
    pdf.roundRect(x, y, width, 18, 5, fill=1, stroke=1)
    pdf.setFillColor(AMBER)
    pdf.setFont("Helvetica-Bold", 7.5)
    pdf.drawCentredString(x + width / 2, y + 6, "DRAFT / LINKS PENDING")
    pdf.restoreState()


def link_card(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    label: str,
    url: str,
    short: str,
) -> None:
    height = 62
    pdf.setFillColor(BLUE_PALE if url else SOFT)
    pdf.setStrokeColor(BLUE if url else LINE)
    pdf.roundRect(x, y - height, width, height, 9, fill=1, stroke=1)
    pdf.setFillColor(BLUE if url else MUTED)
    pdf.setFont("Helvetica-Bold", 9.5)
    pdf.drawString(x + 14, y - 20, label.upper())
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 11.5)
    pdf.drawString(x + 14, y - 39, short if url else "Publication link pending")
    pdf.setFillColor(BLUE if url else MUTED)
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(x + width - 14, y - 52, "OPEN LINK" if url else "ADD URL")
    if url:
        pdf.linkURL(url, (x, y - height, x + width, y), relative=0, thickness=0)


def cover_page(pdf: canvas.Canvas, links: dict[str, str], draft: bool) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(BLUE)
    pdf.rect(0, 0, 12, PAGE_H, fill=1, stroke=0)

    pdf.setStrokeColor(HexColor("#E5EAF1"))
    for offset in (0, 36, 72):
        pdf.line(PAGE_W - 150 + offset, PAGE_H, PAGE_W, PAGE_H - 150 + offset)

    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(MARGIN, PAGE_H - 58, "PORTFOLIO  /  INDEPENDENT PROJECT  /  2026")

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 27)
    pdf.drawString(MARGIN, PAGE_H - 113, "Portfolio for MSc in")
    pdf.drawString(MARGIN, PAGE_H - 147, "AI and Digital Media")

    pdf.setFillColor(BLUE)
    pdf.roundRect(MARGIN, PAGE_H - 191, 43, 5, 2.5, fill=1, stroke=0)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 18.5)
    pdf.drawString(MARGIN, PAGE_H - 236, "Shanghai 3D Visualized Travel")
    pdf.drawString(MARGIN, PAGE_H - 261, "Planning Intelligent Agent")

    y = PAGE_H - 292
    y = draw_paragraph(
        pdf,
        "A full-stack intelligent travel-planning experience combining grounded generation, tool-using agents and interactive geospatial storytelling.",
        MARGIN,
        y,
        PAGE_W - 2 * MARGIN,
        size=10.5,
        leading=15,
        color=MUTED,
    )

    pdf.setFillColor(SOFT)
    pdf.roundRect(MARGIN, y - 82, PAGE_W - 2 * MARGIN, 63, 10, fill=1, stroke=0)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(MARGIN + 15, y - 38, "CANDIDATE")
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(MARGIN + 15, y - 57, "Haolei Xu")
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9.5)
    pdf.drawString(MARGIN + 125, y - 57, "1583081820@qq.com")
    pdf.linkURL("mailto:1583081820@qq.com", (MARGIN + 122, y - 65, MARGIN + 260, y - 46), relative=0, thickness=0)

    card_y = y - 116
    gap = 14
    card_w = (PAGE_W - 2 * MARGIN - gap) / 2
    link_card(pdf, MARGIN, card_y, card_w, "GitHub repository", links["github_url"], "View source and setup")
    link_card(pdf, MARGIN + card_w + gap, card_y, card_w, "Demo video", links["video_url"], "Watch full demonstration")

    note_y = card_y - 102
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 10.5)
    pdf.drawString(MARGIN, note_y, "One project. Three proofs of capability.")
    draw_paragraph(
        pdf,
        "This portfolio distils the product rationale and engineering evidence. The public repository provides reproducible implementation details, while the video shows the end-to-end interaction and visual experience.",
        MARGIN,
        note_y - 22,
        PAGE_W - 2 * MARGIN,
        size=9.5,
        leading=14,
        color=MUTED,
    )

    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(MARGIN, 42, "HKBU  /  MASTER OF SCIENCE IN AI AND DIGITAL MEDIA")
    if draft:
        draw_draft_watermark(pdf)
    pdf.showPage()


def project_page(pdf: canvas.Canvas, draft: bool) -> None:
    page_header(pdf, 2, "Project rationale and solution", "Grounded AI planning meets an interactive spatial interface")
    y = PAGE_H - 124
    section_label(pdf, "01", "Project background", y)
    y -= 24
    y = draw_paragraph(
        pdf,
        "Generic travel assistants can produce fluent itineraries without strong grounding, while conventional list-based planners make spatial relationships difficult to understand. This project connects retrieval and live tools to a visual map so users can move from intent to an explorable plan in one workflow.",
        MARGIN,
        y,
        PAGE_W - 2 * MARGIN,
        size=9.5,
        leading=13.5,
        color=INK,
    )

    y -= 7
    col_gap = 16
    col_w = (PAGE_W - 2 * MARGIN - col_gap) / 2
    box_top = y
    box_h = 144
    for x in (MARGIN, MARGIN + col_w + col_gap):
        pdf.setFillColor(SOFT)
        pdf.setStrokeColor(LINE)
        pdf.roundRect(x, box_top - box_h, col_w, box_h, 9, fill=1, stroke=1)

    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(MARGIN + 14, box_top - 22, "AI & AGENT")
    draw_bullets(
        pdf,
        [
            "FAISS-based RAG grounds answers and itinerary generation in a local travel knowledge base.",
            "Heuristic Fast/Agent routing escalates complex requests and falls back after 15 seconds.",
            "A four-tool LangChain agent covers place search, routes, knowledge retrieval and weather.",
        ],
        MARGIN + 12,
        box_top - 44,
        col_w - 24,
        size=8.5,
        leading=11,
    )

    right_x = MARGIN + col_w + col_gap
    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(right_x + 14, box_top - 22, "DIGITAL MEDIA VISUALIZATION")
    draw_bullets(
        pdf,
        [
            "MapLibre GL renders a tilted interactive map with layered markers and route visualization.",
            "React Three Fiber supplies supporting visual effects rather than the core map renderer.",
            "A guided onboarding flow turns user preferences into a spatial planning prompt.",
        ],
        right_x + 12,
        box_top - 44,
        col_w - 24,
        size=8.5,
        leading=11,
    )

    image_top = box_top - box_h - 19
    image_w = PAGE_W - 2 * MARGIN
    image_h = 250
    image = ImageReader(str(HERO_JPG))
    pdf.setFillColor(HexColor("#080B14"))
    pdf.roundRect(MARGIN, image_top - image_h, image_w, image_h, 8, fill=1, stroke=0)
    pdf.saveState()
    clip = pdf.beginPath()
    clip.roundRect(MARGIN, image_top - image_h, image_w, image_h, 8)
    pdf.clipPath(clip, stroke=0, fill=0)
    pdf.drawImage(image, MARGIN, image_top - image_h, image_w, image_h, preserveAspectRatio=True, anchor="c", mask="auto")
    pdf.restoreState()
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Oblique", 7.5)
    pdf.drawString(MARGIN, image_top - image_h - 12, "Fresh capture from the rebuilt public version: map markers, planning modes and itinerary workspace.")

    metrics_y = image_top - image_h - 42
    section_label(pdf, "02", "Verified results", metrics_y)
    metrics_y -= 29
    labels = [
        ("3", "conversation modes", "Chat / Fast / Agent"),
        ("4", "agent tools", "search / route / RAG / weather"),
        ("15s", "fallback guard", "Agent to Fast recovery"),
        ("4/4", "base tests", "routing and health checks"),
    ]
    gap = 8
    metric_w = (PAGE_W - 2 * MARGIN - gap * 3) / 4
    for index, (value, label, detail) in enumerate(labels):
        x = MARGIN + index * (metric_w + gap)
        pdf.setFillColor(BLUE_PALE)
        pdf.roundRect(x, metrics_y - 52, metric_w, 52, 7, fill=1, stroke=0)
        pdf.setFillColor(BLUE_DARK)
        pdf.setFont("Helvetica-Bold", 15)
        pdf.drawString(x + 10, metrics_y - 19, value)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 7.5)
        pdf.drawString(x + 10, metrics_y - 33, label)
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica", 6.5)
        pdf.drawString(x + 10, metrics_y - 44, detail)

    draw_footer(pdf)
    if draft:
        draw_draft_watermark(pdf)
    pdf.showPage()


def arrow(pdf: canvas.Canvas, x1: float, y: float, x2: float) -> None:
    pdf.setStrokeColor(BLUE)
    pdf.setLineWidth(1.4)
    pdf.line(x1, y, x2 - 5, y)
    pdf.setFillColor(BLUE)
    pdf.setStrokeColor(BLUE)
    path = pdf.beginPath()
    path.moveTo(x2, y)
    path.lineTo(x2 - 7, y + 4)
    path.lineTo(x2 - 7, y - 4)
    path.close()
    pdf.drawPath(path, fill=1, stroke=0)


def architecture_box(pdf: canvas.Canvas, x: float, y: float, width: float, title: str, detail: str) -> None:
    pdf.setFillColor(SOFT)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x, y, width, 70, 8, fill=1, stroke=1)
    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 8.2)
    pdf.drawString(x + 11, y + 48, title)
    detail_y = y + 31
    for line in detail.splitlines():
        detail_y = draw_paragraph(pdf, line, x + 11, detail_y, width - 22, size=7.4, leading=9.5, color=INK)


def evidence_page(pdf: canvas.Canvas, draft: bool) -> None:
    page_header(pdf, 3, "Architecture and engineering evidence", "A compact implementation designed for inspectability and reproducibility")
    y = PAGE_H - 124
    section_label(pdf, "03", "System architecture", y)

    architecture_y = y - 112
    gap = 12
    box_w = (PAGE_W - 2 * MARGIN - gap * 3) / 4
    boxes = [
        ("INTERFACE", "React + MapLibre GL\nR3F visual effects"),
        ("API", "FastAPI\n3 chat modes"),
        ("INTELLIGENCE", "FAISS RAG\nLangChain agent"),
        ("SERVICES", "Amap + LLM\nexternal providers"),
    ]
    for index, (title, detail) in enumerate(boxes):
        x = MARGIN + index * (box_w + gap)
        architecture_box(pdf, x, architecture_y, box_w, title, detail)
        if index < len(boxes) - 1:
            arrow(pdf, x + box_w + 2, architecture_y + 35, x + box_w + gap - 2)

    support_y = architecture_y - 46
    support_w = 118
    center = PAGE_W / 2
    pdf.setFillColor(BLUE_PALE)
    pdf.setStrokeColor(HexColor("#BFDBFE"))
    pdf.roundRect(center - support_w - 7, support_y, support_w, 29, 7, fill=1, stroke=1)
    pdf.roundRect(center + 7, support_y, support_w, 29, 7, fill=1, stroke=1)
    pdf.setFillColor(BLUE_DARK)
    pdf.setFont("Helvetica-Bold", 8.5)
    pdf.drawCentredString(center - support_w / 2 - 7, support_y + 10, "MySQL  /  structured data")
    pdf.drawCentredString(center + support_w / 2 + 7, support_y + 10, "Redis  /  session memory")
    pdf.setStrokeColor(BLUE)
    pdf.line(center, architecture_y, center, support_y + 29)

    content_top = support_y - 29
    col_gap = 22
    col_w = (PAGE_W - 2 * MARGIN - col_gap) / 2
    left_x = MARGIN
    right_x = MARGIN + col_w + col_gap

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(left_x, content_top, "Independent contribution")
    left_y = draw_bullets(
        pdf,
        [
            "Designed the product flow from preference capture to map-based itinerary review.",
            "Implemented the React interface, map visualization and FastAPI integration.",
            "Built and integrated the RAG pipeline, routing heuristic and four-tool agent.",
            "Prepared Docker services, security configuration and public release documentation.",
        ],
        left_x,
        content_top - 25,
        col_w,
        size=8.8,
        leading=11.8,
    )

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(right_x, content_top, "Engineering evidence")
    right_y = draw_bullets(
        pdf,
        [
            "Frontend type-check and production build pass after resolving 17 TypeScript errors.",
            "Python syntax compilation and four focused routing/health tests pass.",
            "Docker Compose configuration validates with FAISS, MySQL, Redis, FastAPI, React and Nginx.",
            "Browser bundles are checked to contain no model-service credential or Authorization header.",
        ],
        right_x,
        content_top - 25,
        col_w,
        size=8.8,
        leading=11.8,
    )

    reflection_top = min(left_y, right_y) - 12
    pdf.setFillColor(HexColor("#0F172A"))
    pdf.roundRect(MARGIN, reflection_top - 112, PAGE_W - 2 * MARGIN, 112, 10, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#93C5FD"))
    pdf.setFont("Helvetica-Bold", 8.5)
    pdf.drawString(MARGIN + 16, reflection_top - 21, "TECHNICAL REFLECTION")
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(MARGIN + 16, reflection_top - 44, "Designing for useful uncertainty")
    draw_paragraph(
        pdf,
        "The central lesson was that an intelligent interface should expose uncertainty through system behaviour, not marketing language. The implementation therefore separates a fast grounded path from a tool-using path, applies a bounded fallback, and keeps provider credentials behind the API boundary. The map then turns generated text into an inspectable spatial object that users can review and adjust.",
        MARGIN + 16,
        reflection_top - 65,
        PAGE_W - 2 * MARGIN - 32,
        size=8.6,
        leading=12,
        color=HexColor("#D7E0EA"),
    )

    skills_y = reflection_top - 141
    section_label(pdf, "04", "Core skills", skills_y)
    skill_rows = [
        "Applied AI   RAG / tool calling / prompt design / fallback strategies",
        "Engineering  FastAPI / React / TypeScript / MySQL / Redis / Docker / Nginx",
        "Visual media MapLibre GL / interaction design / spatial storytelling / R3F",
    ]
    skills_y -= 27
    for row in skill_rows:
        pdf.setFillColor(SOFT)
        pdf.roundRect(MARGIN, skills_y - 25, PAGE_W - 2 * MARGIN, 25, 6, fill=1, stroke=0)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica", 8.4)
        pdf.drawString(MARGIN + 12, skills_y - 16, row)
        skills_y -= 32

    draw_footer(pdf)
    if draft:
        draw_draft_watermark(pdf)
    pdf.showPage()


def build() -> None:
    links = load_links()
    draft = not (links["github_url"] and links["video_url"])
    prepare_hero()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("Portfolio for MSc in AI and Digital Media - Haolei Xu")
    pdf.setAuthor("Haolei Xu")
    pdf.setSubject("Shanghai 3D Visualized Travel Planning Intelligent Agent")
    cover_page(pdf, links, draft)
    project_page(pdf, draft)
    evidence_page(pdf, draft)
    pdf.save()
    print(f"Created {OUTPUT}")
    print(f"Draft mode: {draft}")


if __name__ == "__main__":
    build()
