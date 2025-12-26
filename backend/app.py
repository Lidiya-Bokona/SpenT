import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask
from flask_login import LoginManager
from config import Config
from extensions import db, login_manager
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.tasks import tasks_bp
from models import User

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.config.from_object(Config)

db.init_app(app)
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(tasks_bp)

@app.route("/")
def index():
    from flask import render_template
    return render_template("index.html")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
