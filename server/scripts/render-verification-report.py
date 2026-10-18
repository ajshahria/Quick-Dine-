"""Render the committed Markdown supplement without credentials or private data."""
from pathlib import Path
from html import escape
import re
import textwrap
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parents[2]
source = root / 'docs/VERIFICATION_RESULTS_2026-10-18.md'
output = root / 'output/pdf/QuickDine_Verification_Supplement_2026-10-18.pdf'
output.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyQA', fontName='Helvetica', fontSize=9.3, leading=13, spaceAfter=6, allowWidows=0, allowOrphans=0))
styles.add(ParagraphStyle(name='CellQA', fontName='Helvetica', fontSize=7.5, leading=10, spaceAfter=0))
styles.add(ParagraphStyle(name='TitleQA', fontName='Helvetica-Bold', fontSize=19, leading=24, spaceAfter=14))
styles.add(ParagraphStyle(name='HeadingQA', fontName='Helvetica-Bold', fontSize=12.5, leading=17, spaceBefore=12, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name='CodeQA', fontName='Courier', fontSize=7, leading=10, backColor=colors.HexColor('#F1F4F7'), borderPadding=7, spaceBefore=5, spaceAfter=9))

def inline(text):
    text = escape(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`(.*?)`', r'<font name="Courier">\1</font>', text)
    def link(match):
        label, url = match.groups()
        if not url.startswith('https://'):
            url = 'https://github.com/ajshahria/Quick-Dine-/blob/live-verifcation-completed/docs/' + url
        return f'<link href="{url}" color="#155B88">{label}</link>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)

story = []
lines = source.read_text(encoding='utf-8').splitlines()
i = 0
while i < len(lines):
    line = lines[i]
    if not line.strip():
        i += 1
        continue
    if line.startswith('```'):
        i += 1
        code = []
        while i < len(lines) and not lines[i].startswith('```'):
            code.extend(textwrap.wrap(lines[i], 92, break_long_words=True, break_on_hyphens=False) or [''])
            i += 1
        story.append(Preformatted('\n'.join(code), styles['CodeQA']))
        i += 1
        continue
    if line.startswith('|'):
        rows = []
        while i < len(lines) and lines[i].startswith('|'):
            cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r'[-:]+', c) for c in cells):
                rows.append([Paragraph(inline(c), styles['CellQA']) for c in cells])
            i += 1
        count = len(rows[0])
        width = A4[0] - 88
        if count == 4:
            widths = [98, 130, width-264, 36]
        elif count == 8:
            widths = [38, 59, 47, 38, 85, 47, 47, width-461]
        elif count == 7:
            widths = [40, 103, 52, 45, 88, 88, width-416]
        else:
            widths = [width/count] * count
        table = Table(rows, colWidths=widths, repeatRows=1, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5EDF3')),
            ('GRID', (0, 0), (-1, -1), .35, colors.HexColor('#BCCAD3')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F9FB')]),
        ]))
        story.extend([table, Spacer(1, 10)])
        continue
    if line.startswith('!['):
        match = re.match(r'!\[.*?\]\((.*?)\)', line)
        path = root / 'docs' / match.group(1)
        image = Image(str(path))
        scale = (A4[0]-88) / image.imageWidth
        image.drawWidth = image.imageWidth * scale
        image.drawHeight = image.imageHeight * scale
        story.extend([image, Spacer(1, 10)])
        i += 1
        continue
    if line.startswith('# '):
        story.append(Paragraph(inline(line[2:]), styles['TitleQA']))
        i += 1
        continue
    if line.startswith('## '):
        story.append(Paragraph(inline(line[3:]), styles['HeadingQA']))
        i += 1
        continue
    paragraph = [line]
    i += 1
    while i < len(lines) and lines[i].strip() and not lines[i].startswith(('#', '|', '```', '![', '- ')):
        paragraph.append(lines[i])
        i += 1
    body = ' '.join(paragraph)
    if body.startswith('- '):
        body = '&#8226; ' + inline(body[2:])
    else:
        body = inline(body)
    story.append(Paragraph(body, styles['BodyQA']))

def footer(canvas, doc):
    canvas.setStrokeColor(colors.HexColor('#BCCAD3'))
    canvas.line(44, 37, A4[0]-44, 37)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#526675'))
    canvas.drawString(44, 24, 'QuickDine | Verification supplement | 18 October 2026')
    canvas.drawRightString(A4[0]-44, 24, str(doc.page))

doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=44, rightMargin=44,
                        topMargin=42, bottomMargin=50,
                        title='QuickDine deployment and evaluation supplement', author='QuickDine')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(output)
