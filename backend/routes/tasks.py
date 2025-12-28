from flask import Blueprint, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from extensions import db
from models import Task
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/api/tasks/add', methods=['POST'])
@login_required
def add_task():
    # Support both JSON and Form data for flexibility
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    name = data.get('name')
    description = data.get('description')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    label = data.get('label')
    is_routine = data.get('is_routine') == 'on' or data.get('is_routine') is True
    recurrence_type = data.get('recurrence_type', 'Daily')
    repeat_days = data.get('repeat_days')

    if not name or not start_time_str or not end_time_str or not label:
        if request.is_json:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        # flash("Missing required fields", "error") # Removed
        return redirect(url_for('dashboard.index'))

    try:
        today = datetime.now().date()
        today_str = today.strftime('%Y-%m-%d')
        
        # Parse times
        start_time = datetime.strptime(f"{today_str} {start_time_str}", '%Y-%m-%d %H:%M')
        end_time = datetime.strptime(f"{today_str} {end_time_str}", '%Y-%m-%d %H:%M')
        
        if end_time <= start_time:
            msg = 'End time must be after start time'
            if request.is_json:
                 return jsonify({'success': False, 'message': msg}), 400
            # flash(msg, "error") # Removed
            return redirect(url_for('dashboard.index'))

        task = Task(
            user_id=current_user.id,
            name=name,
            description=description,
            start_time=start_time,
            end_time=end_time,
            label=label,
            is_routine=is_routine,
            recurrence_type=recurrence_type,
            repeat_days=repeat_days,
            date_stamp=today
        )
        db.session.add(task)
        db.session.commit()
        
        # Success Feedback
        # flash(f"Hello {current_user.username}, this is your balance for today.", "success") # Removed per request
        
        if request.is_json:
             return jsonify({'success': True, 'message': 'Task added'})
        return redirect(url_for('dashboard.index'))
        
    except ValueError:
        msg = 'Invalid time format'
        if request.is_json:
            return jsonify({'success': False, 'message': msg}), 400
        # flash(msg, "error") # Removed
        return redirect(url_for('dashboard.index'))

@tasks_bp.route('/api/tasks/delete/<int:task_id>', methods=['POST', 'DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        if request.is_json:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        # flash("Unauthorized", "error") # Removed
        return redirect(url_for('dashboard.index'))
    
    db.session.delete(task)
    db.session.commit()
    
    # flash("Task deleted successfully", "success") # Removed
    
    if request.is_json:
        return jsonify({'success': True, 'message': 'Task deleted'})
    return redirect(url_for('dashboard.index'))

@tasks_bp.route('/api/tasks/edit/<int:task_id>', methods=['POST'])
@login_required
def edit_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        # flash("Unauthorized", "error") # Removed
        return redirect(url_for('dashboard.index'))
    
    # Support both JSON and Form data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    name = data.get('name')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    label = data.get('label')
    # Routine might be unchecked in form, so handle carefully
    is_routine = data.get('is_routine') == 'on' or data.get('is_routine') is True

    if name: task.name = name
    if label: task.label = label
    if is_routine is not None: task.is_routine = is_routine
    if data.get('recurrence_type'): task.recurrence_type = data.get('recurrence_type')
    if data.get('repeat_days'): task.repeat_days = data.get('repeat_days')
    
    if start_time_str and end_time_str:
        try:
            today_str = task.date_stamp.strftime('%Y-%m-%d')
            start_time = datetime.strptime(f"{today_str} {start_time_str}", '%Y-%m-%d %H:%M')
            end_time = datetime.strptime(f"{today_str} {end_time_str}", '%Y-%m-%d %H:%M')
            
            if end_time <= start_time:
                # flash("End time must be after start time", "error") # Removed
                return redirect(url_for('dashboard.index'))
                
            task.start_time = start_time
            task.end_time = end_time
        except ValueError:
            # flash("Invalid time format", "error") # Removed
            return redirect(url_for('dashboard.index'))

    if data.get('description'):
        task.description = data.get('description')

    db.session.commit()
    # flash("Task updated successfully", "success") # Removed
    return redirect(url_for('dashboard.index'))


@tasks_bp.route('/api/tasks/calendar', methods=['GET'])
@login_required
def calendar_events():
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    query = Task.query.filter(Task.user_id == current_user.id)
    
    if start_str and end_str:
        # FullCalendar sends ISO strings (e.g. 2023-12-01T00:00:00)
        # We need to parse dates
        start_date = datetime.fromisoformat(start_str.split('T')[0]).date()
        end_date = datetime.fromisoformat(end_str.split('T')[0]).date()
        query = query.filter(Task.date_stamp >= start_date, Task.date_stamp <= end_date)
        
    tasks = query.all()
    
    events = []
    for t in tasks:
        color = 'grey'
        if t.label == 'Good': color = '#D4AF37' # Gold
        elif t.label == 'Bad': color = '#cc4444' # Red
        elif t.is_routine: color = '#4488cc' # Blueish
        
        events.append({
            'title': f"{t.name} (${int((t.end_time - t.start_time).total_seconds())})",
            'start': t.start_time.isoformat(),
            'end': t.end_time.isoformat(),
            'color': color,
            'extendedProps': {
                'cost': int((t.end_time - t.start_time).total_seconds()),
                'label': t.label,
                'description': t.description
            }
        })
        
    return jsonify(events)
