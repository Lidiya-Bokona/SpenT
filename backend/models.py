from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

from extensions import db

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tasks = db.relationship('Task', backref='user', lazy=True)
    summaries = db.relationship('DailySummary', backref='user', lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    label = db.Column(db.Enum('Good', 'Neutral', 'Bad'), nullable=False)
    is_routine = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(50), default='Daily')
    repeat_days = db.Column(db.String(255))
    date_stamp = db.Column(db.Date, nullable=False)

class DailySummary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    invested_seconds = db.Column(db.Integer, default=0)
    wasted_seconds = db.Column(db.Integer, default=0)