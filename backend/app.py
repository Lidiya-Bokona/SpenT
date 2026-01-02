from flask import Flask, jsonify
from backend.extensions import db, login_manager
from backend.routes.auth import auth_bp
from backend.models import User

app = Flask(__name__)

# Config from environment variables
import os
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init extensions
db.init_app(app)
login_manager.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/")

# Health check route
@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Optional: create tables automatically on first run
@app.before_first_request
def create_tables():
    db.create_all()
