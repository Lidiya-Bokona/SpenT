from flask import Blueprint, jsonify, request
import traceback
from flask_login import login_required, current_user
from models import Task, DailySummary
from datetime import datetime, timedelta
from sqlalchemy import func
from extensions import db

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/api/analytics/chart-data', methods=['GET'])
@login_required
def get_chart_data():
    range_val = request.args.get('range', '7d')
    days = 7
    if range_val == '1d': days = 1
    elif range_val == '30d': days = 30
    elif range_val == '365d': days = 365
    
    today = datetime.now().date()
    start_date = today - timedelta(days=days-1) # 7 days including today
    
    try:
        tasks = Task.query.filter(
            Task.user_id == current_user.id,
            Task.date_stamp >= start_date,
            Task.date_stamp <= today
        ).all()
        
        dates = []
        invested_data = []
        wasted_data = []
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            day_tasks = [t for t in tasks if t.date_stamp == current_date]
            
            day_invested = sum([(t.end_time - t.start_time).total_seconds() for t in day_tasks if t.label in ['Good', 'Neutral']])
            
            if current_date == today:
                now_seconds = (datetime.now() - datetime.combine(today, datetime.min.time())).total_seconds()
                day_wasted = max(0, now_seconds - day_invested)
            elif current_date > today:
                day_wasted = 0
                day_invested = 0
            else:
                 day_wasted = max(0, 86400 - day_invested)
                 
            fmt = '%b %d' if days > 7 else '%a'
            dates.append(current_date.strftime(fmt))
            invested_data.append(int(day_invested)) 
            wasted_data.append(int(day_wasted))
            
        return jsonify({
            'labels': dates,
            'invested': invested_data,
            'wasted': wasted_data
        })
    except Exception as e:
        print(f"Error in chart-data: {e}")
        traceback.print_exc()
        return jsonify({'labels': [], 'invested': [], 'wasted': []}), 500

@analytics_bp.route('/api/analytics/leaderboard', methods=['GET'])
@login_required
def get_leaderboard():
    try:
        range_val = request.args.get('range', '7d')
        days = 7
        if range_val == '1d': days = 1
        elif range_val == '30d': days = 30
        elif range_val == '365d': days = 365
        
        start_date = datetime.now().date() - timedelta(days=days-1)
        
        results = db.session.query(
            Task.name, 
            Task.label,
            func.sum(func.timestampdiff(func.SECOND, Task.start_time, Task.end_time))
        ).filter(
            Task.user_id == current_user.id,
            Task.date_stamp >= start_date
        ).group_by(Task.name, Task.label).order_by(func.sum(func.timestampdiff(func.SECOND, Task.start_time, Task.end_time)).desc()).all()
        
        assets = []
        liabilities = []
        
        for r in results:
            item = {'name': r[0], 'total': int(r[2])}
            if r[1] in ['Good', 'Neutral']:
                assets.append(item)
            else:
                liabilities.append(item)
                
        return jsonify({
            'assets': assets[:5], 
            'liabilities': liabilities[:5]
        })
    except Exception as e:
        print(f"Error in leaderboard: {e}")
        traceback.print_exc()
        return jsonify({'assets': [], 'liabilities': []}), 500

@analytics_bp.route('/api/analytics/summary', methods=['GET'])
@login_required
def get_summary_stats():
    try:
        range_val = request.args.get('range', 'lifetime')
        
        query = Task.query.filter(Task.user_id == current_user.id)
        
        if range_val != 'lifetime':
            days = 7
            if range_val == '1d': days = 1
            elif range_val == '30d': days = 30
            elif range_val == '365d': days = 365
            start_date = datetime.now().date() - timedelta(days=days-1)
            query = query.filter(Task.date_stamp >= start_date)
            
        tasks = query.all()
        
        total_invested = sum([(t.end_time - t.start_time).total_seconds() for t in tasks if t.label in ['Good', 'Neutral']])
        
        if range_val == 'lifetime':
            first_task = Task.query.filter_by(user_id=current_user.id).order_by(Task.date_stamp).first()
            start = first_task.date_stamp if first_task else datetime.now().date()
            days_count = (datetime.now().date() - start).days + 1
        else:
            days = 7
            if range_val == '1d': days = 1
            if range_val == '30d': days = 30
            elif range_val == '365d': days = 365
            start = datetime.now().date() - timedelta(days=days-1)
            days_count = days
        
        total_potential = days_count * 86400
        total_wasted = max(0, total_potential - total_invested) 
        
        avg_daily_investment = total_invested / days_count if days_count > 0 else 0
        
        # Calculate Today's Stats specifically
        today_date = datetime.now().date()
        today_tasks = Task.query.filter(Task.user_id == current_user.id, Task.date_stamp == today_date).all()
        
        today_invested = sum([(t.end_time - t.start_time).total_seconds() for t in today_tasks if t.label in ['Good', 'Neutral']])
        
        # Calculate today's wasted
        now_seconds = (datetime.now() - datetime.combine(today_date, datetime.min.time())).total_seconds()
        today_wasted = max(0, now_seconds - today_invested)
        
        today_count = len(today_tasks)

        return jsonify({
            'total_invested': int(total_invested),
            'total_wasted': int(total_wasted),
            'avg_daily_investment': int(avg_daily_investment),
            'total_tasks': len(tasks),
            'today_invested': int(today_invested),
            'today_wasted': int(today_wasted),
            'today_tasks': today_count
        })
    except Exception as e:
        print(f"Error in summary: {e}")
        traceback.print_exc()
        return jsonify({'total_invested': 0, 'total_wasted': 0, 'avg_daily_investment': 0, 'total_tasks': 0}), 500

@analytics_bp.route('/api/analytics/categories', methods=['GET'])
@login_required
def get_category_breakdown():
    try:
        range_val = request.args.get('range', '7d')
        days = 7
        if range_val == '1d': days = 1
        elif range_val == '30d': days = 30
        elif range_val == '365d': days = 365
        
        start_date = datetime.now().date() - timedelta(days=days-1)

        results = db.session.query(
            Task.label,
            func.sum(func.timestampdiff(func.SECOND, Task.start_time, Task.end_time))
        ).filter(
            Task.user_id == current_user.id,
            Task.date_stamp >= start_date
        ).group_by(Task.label).all()
        
        data = {'Good': 0, 'Neutral': 0, 'Bad': 0}
        for r in results:
            if r[0] in data:
                data[r[0]] = int(r[1])
                
        return jsonify(data)
    except Exception as e:
        print(f"Error in categories: {e}")
        return jsonify({'Good': 0, 'Neutral': 0, 'Bad': 0}), 500

@analytics_bp.route('/api/analytics/time-distribution', methods=['GET'])
@login_required
def get_time_distribution():
    try:
        range_val = request.args.get('range', '7d')
        days = 7
        if range_val == '1d': days = 1
        elif range_val == '30d': days = 30
        elif range_val == '365d': days = 365
        
        start_date = datetime.now().date() - timedelta(days=days-1)
        
        tasks = Task.query.filter(
            Task.user_id == current_user.id,
            Task.date_stamp >= start_date
        ).all()
        
        distribution = {i: 0 for i in range(24)}
        
        for task in tasks:
            if task.start_time:
                h = task.start_time.hour
                duration = (task.end_time.hour * 3600 + task.end_time.minute * 60) - (task.start_time.hour * 3600 + task.start_time.minute * 60)
                if duration < 0: duration += 86400
                distribution[h] += duration

        labels = [f"{i}:00" for i in range(24)]
        data = [distribution[i] for i in range(24)]
        
        return jsonify({
            'labels': labels,
            'data': data
        })
    except Exception as e:
        print(f"Error in time-distribution: {e}")
        return jsonify({'labels': [], 'data': []}), 500
