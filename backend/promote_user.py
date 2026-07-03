import sqlite3

conn = sqlite3.connect("worldcup.db")
cursor = conn.cursor()

try:
    # Update is_admin to 1 (True) for your Google email
    cursor.execute("UPDATE users SET is_admin = 1 WHERE email = ?", ("alejosierra656@gmail.com",))
    conn.commit()
    print("PROMOTION SUCCESSFUL: alejosierra656@gmail.com is now an admin!")
    
    # Verify the results
    cursor.execute("SELECT id, email, display_name, is_admin FROM users")
    users = cursor.fetchall()
    print("\nCURRENT STATUS:")
    for user in users:
        print(f"Email: {user[1]}, Name: {user[2]}, Admin: {user[3]}")
except Exception as e:
    print("Error updating database:", e)
finally:
    conn.close()
