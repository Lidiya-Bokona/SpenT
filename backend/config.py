import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or "lidiyabokona"
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or "mysql+pymysql://root:lidiya@localhost/spent_db"
    # Heroku/Netlify often use postgres:// which SQLAlchemy replaced with postgresql://
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
