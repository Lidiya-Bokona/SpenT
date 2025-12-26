from weasyprint import HTML, CSS
from flask import render_template
import io

def generate_pdf(tasks):
    html = render_template('pdf_template.html', tasks=tasks)
    css = CSS(string='body { font-family: Arial; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #000; padding: 8px; }')
    pdf = HTML(string=html).write_pdf(stylesheets=[css])
    return io.BytesIO(pdf)