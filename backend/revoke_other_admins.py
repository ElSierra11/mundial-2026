import sqlite3

conn = sqlite3.connect("worldcup.db")
cursor = conn.cursor()

try:
    # Revoke admin privileges for anyone who is not you
    cursor.execute("UPDATE users SET is_admin = 0 WHERE email != ?", ("alejosierra656@gmail.com",))
    conn.commit()
    print("Database admin privileges cleaned! Only alejosierra656@gmail.com has admin status.")
    
    # Confirm
    cursor.execute("SELECT email, display_name, is_admin FROM users WHERE is_admin = 1")
    admins = cursor.fetchall()
    print("\nAdmins in DB:")
    for admin in admins:
        print(f"Email: {admin[0]}, Name: {admin[1]}, Admin: {admin[2]}")
except Exception as e:
    print("Error cleaning admin privileges in database:", e)
finally:
    conn.close()
