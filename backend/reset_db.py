from app import app
from extensions import db

with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Creating all tables...")
    db.create_all()
    print("Database wiped and recreated successfully.")
