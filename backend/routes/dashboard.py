from flask import Blueprint, jsonify, render_template
from flask_login import login_required, current_user
from models import Task
from datetime import datetime
from utils import check_and_create_routines

dashboard_bp = Blueprint('dashboard', __name__)

def get_stats(user):
    # Auto-generate routines if first visit today (idempotent)
    check_and_create_routines(user)
    
    now = datetime.now()
    today = now.date()
    start_of_day = datetime.combine(today, datetime.min.time())
    seconds_passed = (now - start_of_day).total_seconds()
    
    # 1. Start with flat 86400
    # 2. Remaining = 86400 - seconds_passed (Time left in the day)
    remaining = max(0, 86400 - seconds_passed)

    tasks = Task.query.filter_by(user_id=user.id, date_stamp=today).order_by(Task.start_time).all()
    
    invested = 0
    # Explicitly calculate tracked 'Bad' time just for analytics, 
    # but for the main equation, Wasted = Passed - Invested.
    
    for t in tasks:
        duration = (t.end_time - t.start_time).total_seconds()
        if t.label in ['Good', 'Neutral']:
            invested += duration
            
    # Wasted includes "Bad" tasks AND empty gaps (untracked time)
    # So Wasted = (Time Passed So Far) - (Invested Time)
    wasted = max(0, seconds_passed - invested)
    
    return {
        'remaining': int(remaining),
        'invested': int(invested),
        'wasted': int(wasted),
        'tasks': tasks
    }

@dashboard_bp.route('/dashboard')
@login_required
def index():
    stats = get_stats(current_user)
    return render_template('dashboard.html', **stats)

@dashboard_bp.route('/calendar')
@login_required
def calendar_view():
    return render_template('calendar.html')

@dashboard_bp.route('/analytics')
@login_required
def analytics_view():
    return render_template('analytics.html')

@dashboard_bp.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    stats = get_stats(current_user)
    
    tasks_data = [{
        'id': t.id,
        'name': t.name,
        'start_time': t.start_time.strftime('%H:%M'),
        'end_time': t.end_time.strftime('%H:%M'),
        'label': t.label,
        'cost': int((t.end_time - t.start_time).total_seconds()),
        'description': t.description,
        'is_routine': t.is_routine,
        'recurrence_type': t.recurrence_type,
        'repeat_days': t.repeat_days
    } for t in stats['tasks']]

    return jsonify({
        'remaining': stats['remaining'],
        'invested': stats['invested'],
        'wasted': stats['wasted'],
        'tasks': tasks_data
    })
