from flask import Flask
from backend.config import Config
from backend.extensions import db, login_manager
from backend.routes.auth import auth_bp
# from backend.routes.dashboard import dashboard_bp  # Uncomment when ready

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    # app.register_blueprint(dashboard_bp)

    # Health check route
    @app.route('/health')
    def health():
        return {"status": "ok"}, 200

    return app

# Entry point for Gunicorn/Flask
app = create_app()
