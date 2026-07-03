from database import SessionLocal, engine
import models
from datetime import datetime

# Clear existing matches and predictions
db = SessionLocal()
try:
    print("Clearing matches and predictions tables...")
    db.query(models.Prediction).delete()
    db.query(models.Match).delete()
    db.commit()

    print("Seeding database with the official FIFA World Cup 2026 matches...")
    flag_url = "https://flagcdn.com/w160"
    
    matches = [
        # ---- RONDA DE 32 (Dieciseisavos) ----
        models.Match(
            home_team="Canadá", away_team="Sudáfrica", 
            home_flag_url=f"{flag_url}/ca.png", away_flag_url=f"{flag_url}/za.png",
            match_time=datetime(2026, 6, 28, 15, 0), stage="Ronda de 32",
            home_score=1, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Países Bajos", away_team="Marruecos", 
            home_flag_url=f"{flag_url}/nl.png", away_flag_url=f"{flag_url}/ma.png",
            match_time=datetime(2026, 6, 29, 18, 0), stage="Ronda de 32",
            home_score=1, away_score=1, status="finished"
        ),
        models.Match(
            home_team="Alemania", away_team="Paraguay", 
            home_flag_url=f"{flag_url}/de.png", away_flag_url=f"{flag_url}/py.png",
            match_time=datetime(2026, 6, 29, 21, 0), stage="Ronda de 32",
            home_score=1, away_score=1, status="finished"
        ),
        models.Match(
            home_team="Francia", away_team="Suecia", 
            home_flag_url=f"{flag_url}/fr.png", away_flag_url=f"{flag_url}/se.png",
            match_time=datetime(2026, 6, 30, 21, 0), stage="Ronda de 32",
            home_score=3, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Brasil", away_team="Japón", 
            home_flag_url=f"{flag_url}/br.png", away_flag_url=f"{flag_url}/jp.png",
            match_time=datetime(2026, 6, 29, 15, 0), stage="Ronda de 32",
            home_score=2, away_score=1, status="finished"
        ),
        models.Match(
            home_team="Noruega", away_team="Costa de Marfil", 
            home_flag_url=f"{flag_url}/no.png", away_flag_url=f"{flag_url}/ci.png",
            match_time=datetime(2026, 6, 30, 18, 0), stage="Ronda de 32",
            home_score=2, away_score=1, status="finished"
        ),
        models.Match(
            home_team="México", away_team="Ecuador", 
            home_flag_url=f"{flag_url}/mx.png", away_flag_url=f"{flag_url}/ec.png",
            match_time=datetime(2026, 6, 30, 18, 0), stage="Ronda de 32",
            home_score=2, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Inglaterra", away_team="R. D. Congo", 
            home_flag_url=f"{flag_url}/gb.png", away_flag_url=f"{flag_url}/cd.png",
            match_time=datetime(2026, 7, 1, 15, 0), stage="Ronda de 32",
            home_score=2, away_score=1, status="finished"
        ),
        models.Match(
            home_team="EE. UU.", away_team="Bosnia y Herz.", 
            home_flag_url=f"{flag_url}/us.png", away_flag_url=f"{flag_url}/ba.png",
            match_time=datetime(2026, 7, 1, 21, 0), stage="Ronda de 32",
            home_score=2, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Bélgica", away_team="Senegal", 
            home_flag_url=f"{flag_url}/be.png", away_flag_url=f"{flag_url}/sn.png",
            match_time=datetime(2026, 7, 1, 18, 0), stage="Ronda de 32",
            home_score=3, away_score=2, status="finished"
        ),
        models.Match(
            home_team="España", away_team="Austria", 
            home_flag_url=f"{flag_url}/es.png", away_flag_url=f"{flag_url}/at.png",
            match_time=datetime(2026, 7, 2, 15, 0), stage="Ronda de 32",
            home_score=3, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Portugal", away_team="Croacia", 
            home_flag_url=f"{flag_url}/pt.png", away_flag_url=f"{flag_url}/hr.png",
            match_time=datetime(2026, 7, 2, 18, 0), stage="Ronda de 32",
            home_score=2, away_score=1, status="finished"
        ),
        models.Match(
            home_team="Suiza", away_team="Argelia", 
            home_flag_url=f"{flag_url}/ch.png", away_flag_url=f"{flag_url}/dz.png",
            match_time=datetime(2026, 7, 2, 18, 0), stage="Ronda de 32",
            home_score=1, away_score=0, status="finished"
        ),
        models.Match(
            home_team="Australia", away_team="Egipto", 
            home_flag_url=f"{flag_url}/au.png", away_flag_url=f"{flag_url}/eg.png",
            match_time=datetime(2026, 7, 3, 15, 0), stage="Ronda de 32",
            status="scheduled"
        ),
        models.Match(
            home_team="Argentina", away_team="Cabo Verde", 
            home_flag_url=f"{flag_url}/ar.png", away_flag_url=f"{flag_url}/cv.png",
            match_time=datetime(2026, 7, 3, 21, 0), stage="Ronda de 32",
            status="scheduled"
        ),
        models.Match(
            home_team="Colombia", away_team="Ghana", 
            home_flag_url=f"{flag_url}/co.png", away_flag_url=f"{flag_url}/gh.png",
            match_time=datetime(2026, 7, 3, 21, 0), stage="Ronda de 32",
            status="scheduled"
        ),

        # ---- OCTAVOS DE FINAL ----
        models.Match(
            home_team="Canadá", away_team="Marruecos", 
            home_flag_url=f"{flag_url}/ca.png", away_flag_url=f"{flag_url}/ma.png",
            match_time=datetime(2026, 7, 4, 18, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="Paraguay", away_team="Francia", 
            home_flag_url=f"{flag_url}/py.png", away_flag_url=f"{flag_url}/fr.png",
            match_time=datetime(2026, 7, 4, 21, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="Brasil", away_team="Noruega", 
            home_flag_url=f"{flag_url}/br.png", away_flag_url=f"{flag_url}/no.png",
            match_time=datetime(2026, 7, 5, 18, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="México", away_team="Inglaterra", 
            home_flag_url=f"{flag_url}/mx.png", away_flag_url=f"{flag_url}/gb.png",
            match_time=datetime(2026, 7, 5, 21, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="Portugal", away_team="España", 
            home_flag_url=f"{flag_url}/pt.png", away_flag_url=f"{flag_url}/es.png",
            match_time=datetime(2026, 7, 6, 18, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="EE. UU.", away_team="Bélgica", 
            home_flag_url=f"{flag_url}/us.png", away_flag_url=f"{flag_url}/be.png",
            match_time=datetime(2026, 7, 6, 21, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="Argentina / Cabo Verde", away_team="Australia / Egipto", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 7, 18, 0), stage="Octavos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="Suiza / Argelia", away_team="Colombia / Ghana", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 7, 21, 0), stage="Octavos de Final",
            status="scheduled"
        ),

        # ---- CUARTOS DE FINAL ----
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 11, 20, 0), stage="Cuartos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 12, 20, 0), stage="Cuartos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 13, 20, 0), stage="Cuartos de Final",
            status="scheduled"
        ),
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 14, 20, 0), stage="Cuartos de Final",
            status="scheduled"
        ),

        # ---- SEMIFINALES ----
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 15, 20, 0), stage="Semifinal",
            status="scheduled"
        ),
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 16, 20, 0), stage="Semifinal",
            status="scheduled"
        ),

        # ---- TERCER PUESTO ----
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 18, 20, 0), stage="3er Puesto",
            status="scheduled"
        ),

        # ---- FINAL ----
        models.Match(
            home_team="TBD", away_team="TBD", 
            home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
            match_time=datetime(2026, 7, 19, 20, 0), stage="Final",
            status="scheduled"
        )
    ]
    
    db.add_all(matches)
    db.commit()
    print("Database successfully re-seeded with 2026 World Cup matches!")
except Exception as e:
    print("Error during re-seeding:", e)
finally:
    db.close()
