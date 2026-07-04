"""
live_sync.py
Modulo de sincronización automatica de resultados del Mundial 2026
desde la API publica de ESPN. Se ejecuta como tarea de fondo en FastAPI.

Cada 60 segundos consulta ESPN, actualiza el estado y score de cada partido
en la base de datos, y recalcula los puntos de todos los participantes
automaticamente cuando un partido termina.
"""

import asyncio
import httpx
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
import crud
import models

logger = logging.getLogger("live_sync")

# ── ESPN World Cup Scoreboard ──────────────────────────────────────────────────
ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

# Intervalo de sincronizacion (segundos)
SYNC_INTERVAL = 60

# Mapas de nombres de paises entre ESPN y nuestra DB (espanol <-> ingles)
# ESPN devuelve nombres en ingles, los normalizamos para hacer match con la DB
TEAM_NAME_MAP = {
    # Inglés -> Español (como estan en la DB)
    "Mexico": "México",
    "United States": "Estados Unidos",
    "USA": "Estados Unidos",
    "Canada": "Canadá",
    "Brazil": "Brasil",
    "Germany": "Alemania",
    "France": "Francia",
    "Spain": "España",
    "Portugal": "Portugal",
    "Argentina": "Argentina",
    "Colombia": "Colombia",
    "Ecuador": "Ecuador",
    "Uruguay": "Uruguay",
    "Chile": "Chile",
    "Peru": "Perú",
    "Paraguay": "Paraguay",
    "Bolivia": "Bolivia",
    "Venezuela": "Venezuela",
    "Japan": "Japón",
    "South Korea": "Corea del Sur",
    "Korea Republic": "Corea del Sur",
    "Australia": "Australia",
    "Iran": "Irán",
    "Saudi Arabia": "Arabia Saudita",
    "Qatar": "Catar",
    "Morocco": "Marruecos",
    "Senegal": "Senegal",
    "Nigeria": "Nigeria",
    "Egypt": "Egipto",
    "South Africa": "Sudáfrica",
    "Cameroon": "Camerún",
    "Ghana": "Ghana",
    "Netherlands": "Países Bajos",
    "England": "Inglaterra",
    "Belgium": "Bélgica",
    "Switzerland": "Suiza",
    "Croatia": "Croacia",
    "Serbia": "Serbia",
    "Poland": "Polonia",
    "Denmark": "Dinamarca",
    "Sweden": "Suecia",
    "Norway": "Noruega",
    "Turkey": "Türkiye",
    "Austria": "Austria",
    "Hungary": "Hungría",
    "Czech Republic": "República Checa",
    "Slovakia": "Eslovaquia",
    "Ukraine": "Ucrania",
    "New Zealand": "Nueva Zelanda",
    "Costa Rica": "Costa Rica",
    "Honduras": "Honduras",
    "Panama": "Panamá",
    "El Salvador": "El Salvador",
    "Jamaica": "Jamaica",
    "Haiti": "Haití",
    "Trinidad and Tobago": "Trinidad y Tobago",
    "Guatemala": "Guatemala",
    "Cuba": "Cuba",
    "Martinique": "Martinica",
    "Indonesia": "Indonesia",
    "Thailand": "Tailandia",
    "Vietnam": "Vietnam",
    "China": "China",
    "India": "India",
    "Uzbekistan": "Uzbekistán",
    "Kazakhstan": "Kazajistán",
    "Morocco": "Marruecos",
    "Algeria": "Argelia",
    "Tunisia": "Túnez",
    "Mali": "Malí",
    "Ivory Coast": "Costa de Marfil",
    "Côte d'Ivoire": "Costa de Marfil",
    "DR Congo": "RD Congo",
    "Tanzania": "Tanzania",
    "Zambia": "Zambia",
    "Zimbabwe": "Zimbabue",
    "Kenya": "Kenia",
    "Ethiopia": "Etiopía",
    "Iceland": "Islandia",
    "Romania": "Rumanía",
    "Albania": "Albania",
    "Slovenia": "Eslovenia",
    "Northern Ireland": "Irlanda del Norte",
    "Ireland": "Irlanda",
    "Scotland": "Escocia",
    "Wales": "Gales",
    "Greece": "Grecia",
    "Israel": "Israel",
    "Iraq": "Irak",
    "Bahrain": "Baréin",
    "Jordan": "Jordania",
    "Kuwait": "Kuwait",
    "Oman": "Omán",
    "Palestine": "Palestina",
    "Syria": "Siria",
    "Lebanon": "Líbano",
    "United Arab Emirates": "Emiratos Árabes Unidos",
    "UAE": "Emiratos Árabes Unidos",
    "Libya": "Libia",
    "Somalia": "Somalia",
    "Sudan": "Sudán",
    "Mozambique": "Mozambique",
    "Angola": "Angola",
    "Uganda": "Uganda",
    "Rwanda": "Ruanda",
    "Togo": "Togo",
    "Benin": "Benín",
    "Guinea": "Guinea",
    "Congo": "Congo",
    "Botswana": "Botsuana",
    "Namibia": "Namibia",
    "Equatorial Guinea": "Guinea Ecuatorial",
    "Gabon": "Gabón",
}

def normalize_team(name: str) -> str:
    """Normaliza el nombre de un equipo de ingles a espanol."""
    return TEAM_NAME_MAP.get(name, name)


def parse_espn_status(event: dict) -> tuple[str, int | None, int | None]:
    """
    Parsea el estado y el marcador de un evento ESPN.
    Devuelve: (status, home_score, away_score)
    status puede ser: 'scheduled', 'live', 'finished'
    """
    try:
        status_type = event.get("status", {}).get("type", {})
        completed = status_type.get("completed", False)
        state = status_type.get("state", "pre")  # 'pre', 'in', 'post'
        
        home_score = None
        away_score = None
        
        competitors = event.get("competitions", [{}])[0].get("competitors", [])
        for comp in competitors:
            score_str = comp.get("score", "")
            try:
                score_val = int(score_str) if score_str else None
            except (ValueError, TypeError):
                score_val = None
            
            if comp.get("homeAway") == "home":
                home_score = score_val
            elif comp.get("homeAway") == "away":
                away_score = score_val
        
        if completed or state == "post":
            db_status = "finished"
        elif state == "in":
            db_status = "live"
        else:
            db_status = "scheduled"
        
        return db_status, home_score, away_score
    except Exception as e:
        logger.warning(f"Error parsing ESPN event status: {e}")
        return "scheduled", None, None


async def fetch_espn_scores() -> list[dict]:
    """Obtiene los eventos del scoreboard de ESPN para el Mundial."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(ESPN_URL)
            if response.status_code != 200:
                logger.warning(f"ESPN API returned status {response.status_code}")
                return []
            
            data = response.json()
            events = data.get("events", [])
            logger.info(f"[LiveSync] ESPN returned {len(events)} events")
            return events
    except httpx.TimeoutException:
        logger.warning("[LiveSync] ESPN request timed out")
        return []
    except Exception as e:
        logger.error(f"[LiveSync] Error fetching ESPN scores: {e}")
        return []


def sync_scores_to_db(events: list[dict]):
    """
    Sincroniza los resultados de ESPN con la base de datos.
    Recalcula puntos automaticamente para los partidos terminados.
    """
    if not events:
        return
    
    db: Session = SessionLocal()
    recalculate_needed = False
    
    try:
        db_matches = db.query(models.Match).all()
        
        for event in events:
            try:
                # Nombre de los equipos segun ESPN
                competitors = event.get("competitions", [{}])[0].get("competitors", [])
                espn_home = None
                espn_away = None
                
                for comp in competitors:
                    team_name = comp.get("team", {}).get("displayName", "")
                    normalized = normalize_team(team_name)
                    if comp.get("homeAway") == "home":
                        espn_home = normalized
                    elif comp.get("homeAway") == "away":
                        espn_away = normalized
                
                if not espn_home or not espn_away:
                    continue
                
                # Buscar el partido en nuestra base de datos por equipos
                db_match = None
                for m in db_matches:
                    if (m.home_team == espn_home and m.away_team == espn_away):
                        db_match = m
                        break
                    # Intentar al reves por si estan intercambiados
                    if (m.home_team == espn_away and m.away_team == espn_home):
                        db_match = m
                        break
                
                if not db_match:
                    continue
                
                espn_status, espn_home_score, espn_away_score = parse_espn_status(event)
                
                # Parse penalty shootout scores and winner from competitors
                espn_home_penalties = None
                espn_away_penalties = None
                espn_penalties_winner = None
                
                for comp in competitors:
                    shootout_val = None
                    if "shootoutScore" in comp:
                        try:
                            shootout_val = int(comp["shootoutScore"])
                        except (ValueError, TypeError):
                            pass
                    
                    is_winner = comp.get("winner", False)
                    team_name = comp.get("team", {}).get("displayName", "")
                    normalized = normalize_team(team_name)
                    
                    if comp.get("homeAway") == "home":
                        espn_home_penalties = shootout_val
                        if is_winner:
                            espn_penalties_winner = normalized
                    elif comp.get("homeAway") == "away":
                        espn_away_penalties = shootout_val
                        if is_winner:
                            espn_penalties_winner = normalized

                # Solo actualizar si hay cambios reales
                status_changed = (db_match.status != espn_status)
                score_changed = (
                    db_match.home_score != espn_home_score or
                    db_match.away_score != espn_away_score
                )
                penalties_changed = (
                    db_match.home_penalties != espn_home_penalties or
                    db_match.away_penalties != espn_away_penalties or
                    db_match.penalties_winner != espn_penalties_winner
                )
                
                if status_changed or score_changed or penalties_changed:
                    old_status = db_match.status
                    
                    if espn_home_score is not None:
                        db_match.home_score = espn_home_score
                    if espn_away_score is not None:
                        db_match.away_score = espn_away_score
                    
                    db_match.home_penalties = espn_home_penalties
                    db_match.away_penalties = espn_away_penalties
                    db_match.penalties_winner = espn_penalties_winner
                    
                    if espn_status in ("live", "finished", "scheduled"):
                        db_match.status = espn_status
                    
                    db.commit()
                    
                    logger.info(
                        f"[LiveSync] Actualizado: {db_match.home_team} vs {db_match.away_team} "
                        f"| {espn_home_score}-{espn_away_score} (Pens: {espn_home_penalties}-{espn_away_penalties}, Winner: {espn_penalties_winner}) | {espn_status}"
                    )
                    
                    # Si el partido acabo, recalcular puntos y avanzar la llave
                    if espn_status == "finished" and old_status != "finished":
                        crud.recalculate_points_for_match(db, db_match.id)
                        crud.advance_bracket_winner(db, db_match.id)
                        recalculate_needed = True
                        logger.info(
                            f"[LiveSync] Partido terminado! Recalculando puntos y avanzando llave para match_id={db_match.id}"
                        )
            
            except Exception as e:
                logger.warning(f"[LiveSync] Error procesando evento ESPN: {e}")
                db.rollback()
                continue
        
        # Recalcular todos los puntos de usuarios si algun partido termino
        if recalculate_needed:
            crud.recalculate_all_user_points(db)
            logger.info("[LiveSync] Puntos de todos los usuarios recalculados exitosamente.")
    
    finally:
        db.close()


async def live_score_sync_loop():
    """
    Loop de fondo que sincroniza resultados ESPN cada SYNC_INTERVAL segundos.
    Se inicia al arrancar el servidor FastAPI.
    """
    logger.info("[LiveSync] Iniciando sincronizacion automatica de resultados ESPN...")
    
    while True:
        try:
            events = await fetch_espn_scores()
            if events:
                # Ejecutar la sincronizacion en el loop de eventos de asyncio
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, sync_scores_to_db, events)
        except Exception as e:
            logger.error(f"[LiveSync] Error en el loop de sincronizacion: {e}")
        
        await asyncio.sleep(SYNC_INTERVAL)
