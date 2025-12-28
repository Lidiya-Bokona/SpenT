from datetime import datetime, time
from extensions import db
from models import Task
from flask import render_template
import io
try:
    from weasyprint import HTML, CSS
except OSError:
    # Fallback if GTK not installed on Windows
    print("Warning: WeasyPrint dependencies missing. PDF export may fail.")

def generate_pdf(tasks, total_invested, total_wasted, remaining):
    html = render_template('pdf_template.html', tasks=tasks, invested=total_invested, wasted=total_wasted, remaining=remaining, date=datetime.now().date())
    # Basic styling
    css_string = '''
        @page { size: A4; margin: 1in; }
        body { font-family: 'Helvetica', sans-serif; color: #333; }
        
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
        
        /* Logo Styles */
        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
        }

        .analog-clock {
            width: 50px; height: 50px; 
            border: 3px solid #D4AF37; 
            border-radius: 50%; 
            position: relative; 
            display: inline-block; 
            background: #222;
        }
        
        .dollar-sign {
            position: absolute; top: 50%; left: 50%; 
            transform: translate(-50%, -50%); 
            color: #D4AF37; font-weight: bold; font-size: 24px;
            font-family: serif;
        }
        
        /* Static hands for PDF since no JS animation */
        .hand {
            position: absolute;
            background: #D4AF37;
            transform-origin: bottom center;
            left: 50%;
            bottom: 50%;
            border-radius: 2px;
        }
        
        .hour-hand {
            height: 14px;
            width: 3px;
            transform: rotate(45deg); /* Static time ~1:30 */
        }
        
        .minute-hand {
            height: 20px;
            width: 2px;
            transform: rotate(180deg);
        }
        
        h1 { margin: 10px 0 0; color: #222; font-size: 28px; }
        .date { color: #666; font-size: 0.9rem; margin-top: 5px; }
        
        .summary-box { 
            background: #fdfbf7; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            border: 1px solid #eee;
            border-left: 5px solid #D4AF37;
        }
        
        .metrics-table { width: 100%; text-align: center; margin-top: 10px; }
        .metrics-table th { background: none; color: #555; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; padding-bottom: 5px;}
        .metrics-table td { font-size: 1.5rem; font-weight: bold; padding: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; }
        th { background: #222; color: #D4AF37; padding: 12px; text-align: left; font-weight: 600; }
        td { border-bottom: 1px solid #eee; padding: 12px; color: #444; }
        
        .good { color: #2e7d32; }
        .bad { color: #c62828; }
        .neutral { color: #555; }
        tr.good td:nth-child(4) { color: #2e7d32; font-weight:bold; }
        tr.bad td:nth-child(4) { color: #c62828; font-weight:bold; }
    '''
    try:
        css = CSS(string=css_string)
        pdf = HTML(string=html).write_pdf(stylesheets=[css])
        return io.BytesIO(pdf)
    except:
        return None

def check_and_create_routines(user):
    today = datetime.now().date()
    # Check if user has ANY tasks for today
    existing_tasks = Task.query.filter_by(user_id=user.id, date_stamp=today).first()
    
    if existing_tasks:
        return False

    # Logic to fetch "Routine templates"
    # We look for the most recent instance of any task marked as is_routine=True
    # In a real app, we might have a separate Routine table. Here, we infer from history.
    
    # Get all distinct routine names for this user
    # This is a bit complex in pure SQLAlch without a Routine table, 
    # but let's just look at the last 30 days of tasks to find routines.
    
    # Simpler approach: Just define the defaults if it's a new user (no tasks ever), 
    # else duplicate yesterday's routines?
    # User asked for "Add repeat options... Ensure repeat logic is stored and reflected".
    # Since we added recurrence_type to the Task model, we can use that.
    
    # Find all tasks from the Past that are marked is_routine=True. 
    # To avoid duplicates, we group by name or just take the latest entry for each name.
    
    # Let's clean up: Find the LATEST task for each name that is_routine=True
    from sqlalchemy import func
    
    subquery = db.session.query(
        Task.name,
        func.max(Task.id).label('max_id')
    ).filter(
        Task.user_id == user.id,
        Task.is_routine == True
    ).group_by(Task.name).subquery()
    
    potential_routines = Task.query.join(
        subquery, 
        Task.id == subquery.c.max_id
    ).all()
    
    # If no routines found and no tasks exist at all, create defaults
    all_tasks_count = Task.query.filter_by(user_id=user.id).count()
    
    tasks_to_create = []
    
    if not potential_routines and all_tasks_count == 0:
        # Default Routines for new users
        today_str = today.strftime('%Y-%m-%d')
        defaults = [
            {'name': 'Sleep', 'start': '00:00', 'end': '08:00', 'label': 'Good', 'desc': 'Daily Rest', 'recurrence': 'Daily'},
            {'name': 'Breakfast', 'start': '08:30', 'end': '09:00', 'label': 'Neutral', 'desc': 'Morning Fuel', 'recurrence': 'Daily'},
            {'name': 'Lunch', 'start': '13:00', 'end': '14:00', 'label': 'Neutral', 'desc': 'Midday Refuel', 'recurrence': 'Daily'},
            {'name': 'Dinner', 'start': '19:00', 'end': '20:00', 'label': 'Neutral', 'desc': 'Evening Meal', 'recurrence': 'Daily'}
        ]
        
        for r in defaults:
            start_time = datetime.strptime(f"{today_str} {r['start']}", '%Y-%m-%d %H:%M')
            end_time = datetime.strptime(f"{today_str} {r['end']}", '%Y-%m-%d %H:%M')
            
            t = Task(
                user_id=user.id,
                name=r['name'],
                description=r['desc'],
                start_time=start_time,
                end_time=end_time,
                label=r['label'],
                is_routine=True,
                recurrence_type=r['recurrence'],
                date_stamp=today
            )
            tasks_to_create.append(t)
            
    else:
        # Process existing routines
        weekday_name = today.strftime('%a') # Mon, Tue...
        is_weekend = weekday_name in ['Sat', 'Sun']
        
        for rt in potential_routines:
            should_create = False
            
            if rt.recurrence_type == 'Daily':
                should_create = True
            elif rt.recurrence_type == 'Weekdays' and not is_weekend:
                should_create = True
            elif rt.recurrence_type == 'Weekends' and is_weekend:
                should_create = True
            elif rt.recurrence_type == 'Custom':
                if rt.repeat_days and weekday_name in rt.repeat_days:
                    should_create = True
            
            if should_create:
                # Calculate new times
                # Extract time of day from the routine task
                rt_start_time = rt.start_time.time()
                rt_end_time = rt.end_time.time()
                
                new_start = datetime.combine(today, rt_start_time)
                new_end = datetime.combine(today, rt_end_time)
                
                # Create Task
                new_task = Task(
                    user_id=user.id,
                    name=rt.name,
                    description=rt.description,
                    start_time=new_start,
                    end_time=new_end,
                    label=rt.label,
                    is_routine=True,
                    recurrence_type=rt.recurrence_type,
                    repeat_days=rt.repeat_days,
                    date_stamp=today
                )
                tasks_to_create.append(new_task)

    if tasks_to_create:
        db.session.add_all(tasks_to_create)
        db.session.commit()
        return True
        
    return False