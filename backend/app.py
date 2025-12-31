import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask
from flask_cors import CORS

# Absolute imports (CRITICAL for Gunicorn)
from backend.config import Config
from backend.extensions import db, login_manager
from backend.routes.auth import auth_bp
from backend.routes.dashboard import dashboard_bp
from backend.routes.tasks import tasks_bp
from backend.routes.analytics import analytics_bp
from backend.models import User


def create_app():
    app = Flask(
        __name__,
        template_folder="../frontend/templates",
        static_folder="../frontend/static"
    )

    app.config.from_object(Config)

    # Enable CORS
    CORS(app, supports_credentials=True)

    # Init extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(analytics_bp)

    return app


# Gunicorn entry point
app = create_app()


# Local development ONLY
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
