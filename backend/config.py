import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or "lidiyabokona"
    # Check for DATABASE_URL environment variable
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        # Handle Postgres fix for some providers
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        # Fallback to SQLite if no database is configured (prevents crash on deployment)
        # WARNING: Data will be lost on serverless (Vercel/Netlify) restarts!
        # Use /tmp for serverless write permissions
        SQLALCHEMY_DATABASE_URI = "sqlite:////tmp/spenT.db"
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
