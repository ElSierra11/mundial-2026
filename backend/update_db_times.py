import sys
import os
from datetime import datetime
from database import SessionLocal
import models

def update_times():
    db = SessionLocal()
    try:
        # Match mappings
        correct_times = {
            25: datetime(2026, 7, 9, 20, 0),    # Francia vs Marruecos
            26: datetime(2026, 7, 11, 21, 0),   # Noruega vs Inglaterra
            27: datetime(2026, 7, 10, 19, 0),   # España vs Bélgica
            28: datetime(2026, 7, 12, 1, 0)     # Argentina vs Suiza
        }
        
        updated_count = 0
        for match_id, new_time in correct_times.items():
            match = db.query(models.Match).filter(models.Match.id == match_id).first()
            if match:
                old_time = match.match_time
                match.match_time = new_time
                print(f"Updating Match ID {match_id}: {match.home_team} vs {match.away_team} | {old_time} -> {new_time}")
                updated_count += 1
            else:
                print(f"Match ID {match_id} not found in database.")
                
        if updated_count > 0:
            db.commit()
            print(f"Successfully updated {updated_count} matches in the database.")
        else:
            print("No matches updated.")
    except Exception as e:
        db.rollback()
        print("Error during update:", e)
    finally:
        db.close()

if __name__ == "__main__":
    update_times()
