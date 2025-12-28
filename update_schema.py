from sqlalchemy import create_engine, text

# Connection string manually or from config if imports work, but manual is safer here
DATABASE_URI = "mysql+pymysql://root:lidiya@localhost/spent_db"

def update_schema():
    engine = create_engine(DATABASE_URI)
    with engine.connect() as conn:
        try:
            print("Adding recurrence_type column...")
            conn.execute(text("ALTER TABLE task ADD COLUMN recurrence_type VARCHAR(50) DEFAULT 'Daily'"))
            print("Added recurrence_type.")
        except Exception as e:
            print(f"recurrence_type might exist or error: {e}")

        try:
            print("Adding repeat_days column...")
            conn.execute(text("ALTER TABLE task ADD COLUMN repeat_days VARCHAR(255)"))
            print("Added repeat_days.")
        except Exception as e:
            print(f"repeat_days might exist or error: {e}")
            
        conn.commit()
        print("Schema update complete.")

if __name__ == "__main__":
    update_schema()
