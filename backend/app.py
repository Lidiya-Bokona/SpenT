import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask
from flask_login import LoginManager
from flask_cors import CORS
from config import Config
from extensions import db, login_manager
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.tasks import tasks_bp
from routes.analytics import analytics_bp
from routes.export import export_bp
from models import User

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.config.from_object(Config)

# Enable CORS for all routes, allowing credentials (cookies)
CORS(app, supports_credentials=True)

db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(export_bp)

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
