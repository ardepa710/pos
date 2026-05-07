"""
Security Audit PDF Report Generator
POS — Punto de Venta
2026-05-07 v1
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        BaseDocTemplate,
        Frame,
        HRFlowable,
        PageBreak,
        PageTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
except ImportError:
    print("ERROR: reportlab not installed. Run: pip install reportlab", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent.parent
FINDINGS_FILE = ROOT / "scripts" / "audit-data" / "2026-05-07-v1-findings.json"
SCORES_FILE = ROOT / "scripts" / "audit-data" / "2026-05-07-v1-compliance-scores.json"
OUT_DIR = ROOT / "docs" / "security"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "2026-05-07-v1-security-audit.pdf"

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
with FINDINGS_FILE.open("r", encoding="utf-8") as f:
    findings_data = json.load(f)

with SCORES_FILE.open("r", encoding="utf-8") as f:
    scores_data = json.load(f)

FINDINGS = findings_data["findings"]
FRAMEWORKS = scores_data["frameworks"]
SUMMARY = scores_data["summary"]
RISK_SCORE = scores_data["overall_risk_score"]

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
DARK_BG = colors.HexColor("#0f172a")
CARD_BG = colors.HexColor("#1e293b")
ACCENT = colors.HexColor("#3b82f6")
SUCCESS = colors.HexColor("#22c55e")
WARNING = colors.HexColor("#f59e0b")
DANGER = colors.HexColor("#ef4444")
TEXT_PRIMARY = colors.HexColor("#f1f5f9")
TEXT_SECONDARY = colors.HexColor("#94a3b8")
BORDER = colors.HexColor("#334155")

SEV_COLORS = {
    "CRITICAL": colors.HexColor("#dc2626"),
    "HIGH": colors.HexColor("#ea580c"),
    "MEDIUM": colors.HexColor("#ca8a04"),
    "LOW": colors.HexColor("#2563eb"),
    "INFO": colors.HexColor("#6b7280"),
}

SEV_BG = {
    "CRITICAL": colors.HexColor("#1a0a0a"),
    "HIGH": colors.HexColor("#1a0d06"),
    "MEDIUM": colors.HexColor("#1a1400"),
    "LOW": colors.HexColor("#060d1a"),
    "INFO": colors.HexColor("#111318"),
}

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()

def S(name: str, **kw) -> ParagraphStyle:
    base = styles["Normal"]
    return ParagraphStyle(name, parent=base, **kw)

title_style    = S("Title2",    fontName="Helvetica-Bold",   fontSize=28, textColor=TEXT_PRIMARY,   spaceAfter=6,  leading=34)
subtitle_style = S("Subtitle",  fontName="Helvetica",        fontSize=13, textColor=TEXT_SECONDARY, spaceAfter=4,  leading=18)
h1_style       = S("H1",        fontName="Helvetica-Bold",   fontSize=18, textColor=TEXT_PRIMARY,   spaceBefore=12, spaceAfter=6, leading=22)
h2_style       = S("H2",        fontName="Helvetica-Bold",   fontSize=13, textColor=ACCENT,         spaceBefore=8,  spaceAfter=4, leading=17)
body_style     = S("Body2",     fontName="Helvetica",        fontSize=9,  textColor=TEXT_SECONDARY, spaceAfter=3,  leading=13)
bold_style     = S("Bold2",     fontName="Helvetica-Bold",   fontSize=9,  textColor=TEXT_PRIMARY,   spaceAfter=2,  leading=13)
small_style    = S("Small",     fontName="Helvetica",        fontSize=8,  textColor=TEXT_SECONDARY, spaceAfter=2,  leading=11)
code_style     = S("Code",      fontName="Courier",          fontSize=8,  textColor=colors.HexColor("#86efac"), spaceAfter=2, leading=11)
label_style    = S("Label",     fontName="Helvetica-Bold",   fontSize=7.5, textColor=TEXT_SECONDARY, leading=10)

# ---------------------------------------------------------------------------
# Page layout
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

def page_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Footer
    canvas.setFillColor(BORDER)
    canvas.rect(MARGIN, 10 * mm, PAGE_W - 2 * MARGIN, 0.5, fill=1, stroke=0)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(TEXT_SECONDARY)
    canvas.drawString(MARGIN, 7 * mm, "POS — Security Audit Report  |  2026-05-07 v1  |  CONFIDENTIAL")
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()

doc = BaseDocTemplate(
    str(OUT_FILE),
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN,  bottomMargin=20 * mm,
)
frame = Frame(MARGIN, 20 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 30 * mm, id="main")
template = PageTemplate(id="main", frames=[frame], onPage=page_background)
doc.addPageTemplates([template])

story = []

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6)

def spacer(h: float = 6) -> Spacer:
    return Spacer(1, h)

def badge_table(text: str, bg: object, fg: object = TEXT_PRIMARY) -> Table:
    t = Table([[Paragraph(text, ParagraphStyle("B", fontName="Helvetica-Bold", fontSize=8, textColor=fg, leading=10))]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def section_header(title: str) -> list:
    return [spacer(14), Paragraph(title, h1_style), hr(), spacer(4)]

# ---------------------------------------------------------------------------
# PAGE 1 — COVER
# ---------------------------------------------------------------------------
story.append(spacer(30))
story.append(Paragraph("Security Audit Report", title_style))
story.append(Paragraph("POS — Punto de Venta", subtitle_style))
story.append(spacer(8))

# Risk score card
risk_color = SUCCESS if RISK_SCORE >= 90 else (WARNING if RISK_SCORE >= 70 else DANGER)
risk_label = "GREEN" if RISK_SCORE >= 90 else ("YELLOW" if RISK_SCORE >= 70 else "RED")

cover_data = [
    [Paragraph("Project", label_style), Paragraph("POS — Punto de Venta", bold_style)],
    [Paragraph("Date", label_style), Paragraph("2026-05-07", body_style)],
    [Paragraph("Version", label_style), Paragraph("V2026.05.07-005", body_style)],
    [Paragraph("Auditor", label_style), Paragraph("Claude Code (automated)", body_style)],
    [Paragraph("Scope", label_style), Paragraph("Auth & Access Control · Privacy Boundaries · API Security · Data Integrity · Production Hygiene", body_style)],
]
cover_table = Table(cover_data, colWidths=[45 * mm, 110 * mm])
cover_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(cover_table)
story.append(spacer(20))

# Risk Score badge
risk_data = [[
    Paragraph("RISK SCORE", ParagraphStyle("RL", fontName="Helvetica-Bold", fontSize=9, textColor=TEXT_SECONDARY, leading=13)),
    Paragraph(f"{RISK_SCORE}/100", ParagraphStyle("RV", fontName="Helvetica-Bold", fontSize=36, textColor=risk_color, leading=40)),
    Paragraph(f"● {risk_label}", ParagraphStyle("RB", fontName="Helvetica-Bold", fontSize=12, textColor=risk_color, leading=15)),
]]
risk_table = Table(risk_data, colWidths=[40 * mm, 60 * mm, 55 * mm])
risk_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
    ("BOX", (0, 0), (-1, -1), 1, risk_color),
    ("TOPPADDING", (0, 0), (-1, -1), 14),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ("LEFTPADDING", (0, 0), (-1, -1), 16),
    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(risk_table)
story.append(spacer(20))

# Finding counts
sev_header = [
    Paragraph("CRITICAL", ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9, textColor=SEV_COLORS["CRITICAL"], leading=12)),
    Paragraph("HIGH", ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9, textColor=SEV_COLORS["HIGH"], leading=12)),
    Paragraph("MEDIUM", ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9, textColor=SEV_COLORS["MEDIUM"], leading=12)),
    Paragraph("LOW", ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9, textColor=SEV_COLORS["LOW"], leading=12)),
    Paragraph("INFO", ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9, textColor=SEV_COLORS["INFO"], leading=12)),
]
sev_values = [
    Paragraph(str(SUMMARY["critical"]), ParagraphStyle("V", fontName="Helvetica-Bold", fontSize=28, textColor=SEV_COLORS["CRITICAL"], leading=32)),
    Paragraph(str(SUMMARY["high"]), ParagraphStyle("V", fontName="Helvetica-Bold", fontSize=28, textColor=SEV_COLORS["HIGH"], leading=32)),
    Paragraph(str(SUMMARY["medium"]), ParagraphStyle("V", fontName="Helvetica-Bold", fontSize=28, textColor=SEV_COLORS["MEDIUM"], leading=32)),
    Paragraph(str(SUMMARY["low"]), ParagraphStyle("V", fontName="Helvetica-Bold", fontSize=28, textColor=SEV_COLORS["LOW"], leading=32)),
    Paragraph(str(SUMMARY["info"]), ParagraphStyle("V", fontName="Helvetica-Bold", fontSize=28, textColor=SEV_COLORS["INFO"], leading=32)),
]
counts_table = Table([sev_header, sev_values], colWidths=[31 * mm] * 5)
counts_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(counts_table)
story.append(spacer(16))

# Executive summary
story.append(Paragraph("Executive Summary", h2_style))
story.append(Paragraph(
    "The POS system demonstrates solid foundational security practices: all endpoints are "
    "authenticated, input is validated via Pydantic models on every route, passwords are hashed "
    "with bcrypt, SQL injection is prevented via SQLAlchemy parameterized queries, and sensitive "
    "fields are excluded from API responses. The main risk areas are operational: rate limiting is "
    "completely absent (enabling brute-force attacks), audit logs cover sales and purchases but not "
    "user or settings mutations, and the default admin password is a known weak credential. "
    "For a single-location offline POS deployed on a trusted LAN, risk is moderate. For any "
    "internet-facing or multi-tenant deployment, the missing rate limiting and audit gaps must be "
    "addressed before go-live.",
    body_style,
))

story.append(PageBreak())

# ---------------------------------------------------------------------------
# PAGE 2 — COMPLIANCE SCORES
# ---------------------------------------------------------------------------
story += section_header("Compliance Framework Scores")
story.append(Paragraph(
    "Scored for reference. HIPAA and CMMC are not in scope for this personal project. "
    "ISO 27001:2022 and SOC2 TSC scored as baseline security posture indicators.",
    small_style,
))
story.append(spacer(8))

fw_names = {"soc2": "SOC2 TSC", "hipaa": "HIPAA", "cmmc": "CMMC L2", "iso27001": "ISO 27001:2022"}
fw_totals = {"soc2": 28, "hipaa": 18, "cmmc": 22, "iso27001": 24}

fw_header = [Paragraph(n, bold_style) for n in ["Framework", "Score", "Percentage", "Status"]]
fw_rows = [fw_header]
for key, label in fw_names.items():
    fw = FRAMEWORKS[key]
    pct = fw["percentage"]
    color = SUCCESS if pct >= 70 else (WARNING if pct >= 50 else DANGER)
    status = "✓ PASS" if pct >= 70 else ("△ NEEDS WORK" if pct >= 50 else "✗ FAILING")
    fw_rows.append([
        Paragraph(label, body_style),
        Paragraph(f"{fw['raw_score']:.1f}/{fw_totals[key]}", body_style),
        Paragraph(f"{pct:.1f}%", ParagraphStyle("P", fontName="Helvetica-Bold", fontSize=9, textColor=color, leading=12)),
        Paragraph(status, ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=8, textColor=color, leading=12)),
    ])

fw_table = Table(fw_rows, colWidths=[50 * mm, 35 * mm, 35 * mm, 35 * mm])
fw_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_PRIMARY),
    ("BACKGROUND", (0, 1), (-1, -1), CARD_BG),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, colors.HexColor("#253347")]),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(fw_table)
story.append(spacer(12))

# Per-framework detail bars
story.append(Paragraph("Scoring Details by Framework", h2_style))
story.append(spacer(4))

for key, label in fw_names.items():
    fw = FRAMEWORKS[key]
    story.append(Paragraph(label, bold_style))
    ctrl_rows = [[
        Paragraph("Control ID", label_style),
        Paragraph("Description", label_style),
        Paragraph("Score", label_style),
    ]]
    for ctrl in fw["scored_controls"]:
        sc = ctrl["score"]
        sc_color = SUCCESS if sc == 1.0 else (WARNING if sc == 0.5 else DANGER)
        sc_text = "Complete" if sc == 1.0 else ("Partial" if sc == 0.5 else "Absent")
        ctrl_rows.append([
            Paragraph(ctrl["id"], code_style),
            Paragraph(ctrl["description"], small_style),
            Paragraph(sc_text, ParagraphStyle("SC", fontName="Helvetica-Bold", fontSize=7.5, textColor=sc_color, leading=10)),
        ])
    ctrl_table = Table(ctrl_rows, colWidths=[42 * mm, 90 * mm, 23 * mm])
    ctrl_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a2535")),
        ("BACKGROUND", (0, 1), (-1, -1), CARD_BG),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, colors.HexColor("#253347")]),
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ctrl_table)
    story.append(spacer(8))

story.append(PageBreak())

# ---------------------------------------------------------------------------
# PAGES 3+ — FINDINGS
# ---------------------------------------------------------------------------
story += section_header("Security Findings")

for sev_level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
    level_findings = [f for f in FINDINGS if f["severity"] == sev_level]
    if not level_findings:
        continue

    sev_color = SEV_COLORS[sev_level]
    story.append(Paragraph(f"{'🔴' if sev_level == 'CRITICAL' else '🟠' if sev_level == 'HIGH' else '🟡' if sev_level == 'MEDIUM' else '🔵' if sev_level == 'LOW' else 'ℹ️'} {sev_level}", h2_style))

    for finding in level_findings:
        card_data = [
            [Paragraph(f"[{finding['id']}] {finding['title']}", ParagraphStyle(
                "FT", fontName="Helvetica-Bold", fontSize=10, textColor=sev_color, leading=13,
            ))],
            [Paragraph(f"<b>What:</b> {finding['what']}", body_style)],
            [Paragraph(f"<b>Location:</b> <font face='Courier' size='8'>{finding['file']}</font>", body_style)],
            [Paragraph(f"<b>Risk:</b> {finding['why']}", body_style)],
            [Paragraph(f"<b>Fix:</b> {finding['fix']}", body_style)],
        ]
        ctrl = finding["controls"]
        ctrl_str = "  ".join(
            f"<b>{fw.upper()}:</b> {', '.join(v) if v else '—'}"
            for fw, v in ctrl.items()
        )
        card_data.append([Paragraph(ctrl_str, small_style)])

        card_table = Table(card_data, colWidths=[155 * mm])
        card_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SEV_BG.get(sev_level, CARD_BG)),
            ("BOX", (0, 0), (-1, -1), 1.5, sev_color),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, sev_color),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(card_table)
        story.append(spacer(8))

story.append(PageBreak())

# ---------------------------------------------------------------------------
# PAGE — REMEDIATION PRIORITY
# ---------------------------------------------------------------------------
story += section_header("Remediation Priority")
story.append(Paragraph("Address findings in this order:", body_style))
story.append(spacer(6))

priority_items = [
    ("1", "HIGH", "F001", "Add slowapi rate limiting to auth + write endpoints", "~2 hours"),
    ("2", "HIGH", "F002", "Add audit log entries to user_service and settings_service", "~3 hours"),
    ("3", "MEDIUM", "F003", "Remove default admin password from config.py; force first-login change", "~1 hour"),
    ("4", "MEDIUM", "F006", "Add CSP header to Caddyfile", "~30 min"),
    ("5", "MEDIUM", "F004", "Reduce JWT expiry to 60 min; add refresh token flow", "~4 hours"),
    ("6", "MEDIUM", "F005", "Validate logo_url domain in business settings + size limit in Print Bridge", "~1 hour"),
    ("7", "MEDIUM", "F007", "Add tenant_id filter to all service queries", "~2 hours"),
    ("8", "LOW", "F009", "Add backend/.env.test to .gitignore", "~10 min"),
    ("9", "LOW", "F010", "Add security headers to next.config.ts", "~30 min"),
    ("10", "LOW", "F008", "Set SQLAlchemy echo=False; add DEBUG_SQL env var", "~15 min"),
]

prio_header = [
    Paragraph("#", label_style),
    Paragraph("Severity", label_style),
    Paragraph("Finding", label_style),
    Paragraph("Action", label_style),
    Paragraph("Effort", label_style),
]
prio_rows = [prio_header]
for num, sev, fid, action, effort in priority_items:
    prio_rows.append([
        Paragraph(num, bold_style),
        Paragraph(sev, ParagraphStyle("SV", fontName="Helvetica-Bold", fontSize=8.5, textColor=SEV_COLORS[sev], leading=11)),
        Paragraph(fid, code_style),
        Paragraph(action, small_style),
        Paragraph(effort, small_style),
    ])

prio_table = Table(prio_rows, colWidths=[10 * mm, 22 * mm, 15 * mm, 82 * mm, 26 * mm])
prio_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_PRIMARY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, colors.HexColor("#253347")]),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(prio_table)
story.append(spacer(12))

# Confirmed positives
story.append(Paragraph("Confirmed Security Controls ✅", h2_style))
positives = [
    "bcrypt password hashing (passlib) — no plain-text or MD5 passwords",
    "Pydantic validation on ALL API routes — no unvalidated user input reaches the DB",
    "SQLAlchemy parameterized queries throughout — zero SQL injection surface",
    "Sensitive fields excluded from API responses (password hashes, internal IDs)",
    "3-tier RBAC enforced on every route: cashier / supervisor / admin",
    "JWT authentication required on all endpoints except /health and /api/v1/branding",
    "FastAPI docs_url / redoc_url disabled in production (ENV=production)",
    "Docker images use pinned versions (not :latest)",
    "Non-root users in all Docker containers (appuser, nextjs)",
    "Structured logging (structlog) — no credentials or PII in logs",
    "Docker Compose isolates services on internal network — DB not exposed externally",
    ".env excluded from git (.gitignore verified)",
    "Audit logs present for all sales, purchases, returns, and gift card operations",
    "Soft deletes (deleted_at) consistently used — no hard data deletion",
    "UUID primary keys — no sequential ID enumeration possible",
]
for pos in positives:
    story.append(Paragraph(f"• {pos}", body_style))

# ---------------------------------------------------------------------------
# Build PDF
# ---------------------------------------------------------------------------
doc.build(story)
print(f"PDF generated: {OUT_FILE}")
