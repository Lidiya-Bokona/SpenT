from flask import Flask
from flask_login import LoginManager
from backend.config import Config
from backend.extensions import db, login_manager
from backend.routes.auth import auth_bp
# Add other blueprints like dashboard_bp, etc.

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    app.register_blueprint(auth_bp)

    @app.route('/health')
    def health():
        return {'status': 'ok'}, 200

    return app

app = create_app()
