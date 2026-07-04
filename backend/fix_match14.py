import sqlite3

conn = sqlite3.connect('worldcup.db')
c = conn.cursor()

c.execute("UPDATE matches SET home_score=0, away_score=0, status='finished' WHERE id=14")
conn.commit()

row = c.execute('SELECT id, home_team, away_team, home_score, away_score, status FROM matches WHERE id=14').fetchone()
print("Updated match 14:", row)
conn.close()
