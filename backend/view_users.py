import sqlite3

conn = sqlite3.connect("worldcup.db")
cursor = conn.cursor()

# Get users table info
try:
    cursor.execute("SELECT id, email, display_name, is_admin, points FROM users")
    users = cursor.fetchall()
    print("USERS IN DATABASE:")
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Name: {user[2]}, Admin: {user[3]}, Points: {user[4]}")
except Exception as e:
    print("Error querying database:", e)
finally:
    conn.close()
