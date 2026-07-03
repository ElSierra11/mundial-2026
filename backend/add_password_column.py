import sqlite3

conn = sqlite3.connect("worldcup.db")
cursor = conn.cursor()

try:
    print("Altering 'users' table to add 'password_hash' column...")
    cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    conn.commit()
    print("SUCCESS: Column 'password_hash' added to 'users' table!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("INFO: Column 'password_hash' already exists.")
    else:
        print("Error altering table:", e)
except Exception as e:
    print("Unexpected error:", e)
finally:
    conn.close()
