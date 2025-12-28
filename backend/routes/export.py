from flask import Blueprint, send_file, jsonify
from flask_login import login_required, current_user
from models import Task
from utils import generate_pdf
from datetime import datetime

export_bp = Blueprint('export', __name__)

@export_bp.route('/api/export/pdf', methods=['GET'])
@login_required
def export_pdf():
    try:
        tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.date_stamp.desc(), Task.start_time).all()
        
        # Calculate totals for summary matching Dashboard logic
        now = datetime.now()
        today = now.date()
        start_of_day = datetime.combine(today, datetime.min.time())
        seconds_passed = (now - start_of_day).total_seconds()
        
        invested = 0
        for t in tasks:
            # Only count today's tasks for the "Today's Status" logic if we want to match dashboard exactly.
            # However, the export might be ALL tasks.
            # User Request: "Replace the logo on the exported PDF report... Dashboard Logic... Display these totals clearly".
            # If the PDF is a "Report", it usually implies a history. 
            # But the "Wasted" logic is very specific to "Today". 
            # Let's calculate "Today's" stats for the header, and list all tasks below.
            
            if t.date_stamp == today and t.label in ['Good', 'Neutral']:
                invested += (t.end_time - t.start_time).total_seconds()
        
        # Wasted (Today)
        wasted = max(0, seconds_passed - invested)
        remaining = max(0, 86400 - seconds_passed)
        
        pdf_file = generate_pdf(tasks, invested, wasted, remaining)
        
        if not pdf_file:
             return jsonify({'error': 'PDF generation failed. Ensure GTK/WeasyPrint is configured.'}), 500

        return send_file(
            pdf_file,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"spent_report_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
