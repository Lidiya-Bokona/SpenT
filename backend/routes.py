from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Task  # ✅ removed "backend." prefix
from datetime import datetime

app = Blueprint('app', __name__)

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])
        user = User(username=username, email=email, password_hash=password)
        db.session.add(user)
        db.session.commit()
        flash('Account created!')
        return redirect(url_for('app.login'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(email=request.form['email']).first()
        if user and check_password_hash(user.password_hash, request.form['password']):
            login_user(user)
            return redirect(url_for('app.dashboard'))
        flash('Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('app.landing'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Calculate remaining time in the day
    now = datetime.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seconds_passed = (now - start_of_day).total_seconds()
    remaining = 86400 - seconds_passed

    # Example: fetch tasks for current user
    tasks = Task.query.filter_by(user_id=current_user.id).all()

    return render_template(
        'dashboard.html',
        remaining=remaining,
        tasks=tasks
    )
