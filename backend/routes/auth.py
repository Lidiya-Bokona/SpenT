from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db, login_manager
from backend.models import User

auth_bp = Blueprint('auth', __name__)

# 🔑 User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    return render_template('landing.html')

@auth_bp.route('/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'username': current_user.username})
    return jsonify({'authenticated': False}), 401

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method != 'POST':
        return render_template('auth/signup.html')

    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
    else:
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

    if password != confirm_password:
        msg = 'Passwords do not match'
        if request.is_json:
            return jsonify({'success': False, 'message': msg}), 400
        flash(msg, 'error')
        return render_template('auth/signup.html')

    import re
    if len(password) < 8 or not re.search(r"[a-zA-Z]", password) or not re.search(r"\d", password):
        msg = 'Password must be at least 8 chars and contain letters and numbers'
        if request.is_json:
            return jsonify({'success': False, 'message': msg}), 400
        flash(msg, 'error')
        return render_template('auth/signup.html')

    if User.query.filter_by(email=email).first():
        msg = 'Email already exists'
        if request.is_json:
            return jsonify({'success': False, 'message': msg}), 400
        flash(msg, 'error')
        return render_template('auth/signup.html')

    user = User(username=username, email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    flash('Account created! Please log in.', 'success')

    if request.is_json:
        return jsonify({'success': True, 'message': 'Account created'})

    return redirect(url_for('auth.login'))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method != 'POST':
        return render_template('auth/login.html')

    if request.is_json:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
    else:
        email = request.form.get('email')
        password = request.form.get('password')

    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        if request.is_json:
            return jsonify({'success': True, 'message': 'Logged in successfully'})
        return redirect(url_for('dashboard.index'))

    msg = 'Invalid credentials'
    if request.is_json:
        return jsonify({'success': False, 'message': msg}), 401

    flash(msg, 'error')
    return render_template('auth/login.html')

@auth_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    logout_user()
    if request.method == 'GET':
        return redirect(url_for('auth.login'))
    return jsonify({'success': True, 'message': 'Logged out'})
