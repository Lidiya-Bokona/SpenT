from sqlalchemy import create_engine, text

# Connection string from config.py
DATABASE_URI = "mysql+pymysql://root:lidiya@localhost/spent_db"

def fix_schema():
    try:
        engine = create_engine(DATABASE_URI)
        with engine.connect() as conn:
            print("Altering user table...")
            # Modify column to 255 chars
            conn.execute(text("ALTER TABLE user MODIFY COLUMN password_hash VARCHAR(255) NOT NULL"))
            conn.commit()
            print("SUCCESS: Password hash column expanded to 255.")
    except Exception as e:
        print(f"ERROR: Failed to update schema: {e}")

if __name__ == "__main__":
    fix_schema()
