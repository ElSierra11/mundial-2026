import crud
import models
import schemas
import auth
import live_sync
import asyncio
import os
# Load local .env file manually on startup if present
if os.path.exists(".env"):
    print("[BACKEND] Loading environment variables from .env file...")
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()
from contextlib import asynccontextmanager
from database import SessionLocal, engine, get_db
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List

# Run automatic migrations for new database columns
def run_migrations():
    from sqlalchemy import text
    from database import SessionLocal
    import crud
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT home_penalties FROM matches LIMIT 1"))
    except Exception:
        print("[MIGRATION] Columns do not exist. Altering matches table...")
        try:
            with engine.begin() as trans_conn:
                trans_conn.execute(text("ALTER TABLE matches ADD COLUMN home_penalties INTEGER"))
                trans_conn.execute(text("ALTER TABLE matches ADD COLUMN away_penalties INTEGER"))
                trans_conn.execute(text("ALTER TABLE matches ADD COLUMN penalties_winner VARCHAR"))
            print("[MIGRATION] Database columns added successfully!")
        except Exception as e:
            print(f"[MIGRATION ERROR] Failed to run migration: {e}")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT favorite_team FROM users LIMIT 1"))
    except Exception:
        print("[MIGRATION] Column favorite_team does not exist. Altering users table...")
        try:
            with engine.begin() as trans_conn:
                trans_conn.execute(text("ALTER TABLE users ADD COLUMN favorite_team VARCHAR"))
            print("[MIGRATION] Users table updated successfully with favorite_team!")
        except Exception as e:
            print(f"[MIGRATION ERROR] Failed to run users favorite_team migration: {e}")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT champion_vote FROM users LIMIT 1"))
    except Exception:
        print("[MIGRATION] Column champion_vote does not exist. Altering users table...")
        try:
            with engine.begin() as trans_conn:
                trans_conn.execute(text("ALTER TABLE users ADD COLUMN champion_vote VARCHAR"))
            print("[MIGRATION] Users table updated successfully with champion_vote!")
        except Exception as e:
            print(f"[MIGRATION ERROR] Failed to run users champion_vote migration: {e}")


    # Self-healing loop: Make sure all finished matches are advanced in the bracket
    try:
        db = SessionLocal()
        finished = db.query(models.Match).filter(models.Match.status == "finished").all()
        print(f"[MIGRATION] Found {len(finished)} finished matches to check for bracket advancement.")
        for m in finished:
            crud.advance_bracket_winner(db, m.id)
            crud.recalculate_points_for_match(db, m.id)
        db.close()
        print("[MIGRATION] Bracket advancement verification complete!")
    except Exception as e:
        print(f"[MIGRATION ERROR] Failed to run self-healing check: {e}")

run_migrations()

# Create DB tables
models.Base.metadata.create_all(bind=engine)

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SENT_REMINDERS = set()  # set of (user_id, match_id) to avoid spamming

def send_reminder_email(to_email: str, display_name: str, match_desc: str, kickoff_str: str, interval: int, has_predicted: bool):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://mundial-2026-zeta-sand.vercel.app")
    
    # Format time label
    time_label = f"{interval} minutos" if interval < 60 else f"{int(interval/60)} hora" if interval == 60 else f"{int(interval/60)} horas"
    
    if has_predicted:
        subject = f"⚽ ¡Faltan {time_label} para el partido {match_desc}!"
        status_text = "Tu predicción ya está guardada. ¡Prepárate para vivir el partido!"
        button_text = "Ver Clasificación / Llave"
    else:
        subject = f"⚠️ ¡Solo faltan {time_label} para {match_desc}! Ingresa tu pronóstico"
        status_text = "Aún no has guardado tu predicción para este partido. ¡Ingresa tu marcador ahora para no perder valiosos puntos!"
        button_text = "Ingresar Pronóstico"
        
    html = f"""
    <html>
      <body style="font-family: sans-serif; background-color: #05070a; color: #f3f4f6; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #0c0f16; border: 1px solid #e5c158; border-radius: 16px; padding: 24px; text-align: center;">
          <h2 style="color: #e5c158; margin-bottom: 8px;">🏆 Resultados Mundialistas</h2>
          <p style="font-size: 15px; color: #f3f4f6;">Hola <strong>{display_name}</strong>,</p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
            Te recordamos que el partido <strong>{match_desc}</strong> comienza en <strong>{time_label}</strong> (a las {kickoff_str} hora Colombia).
          </p>
          <p style="font-size: 14px; color: #e5c158; font-weight: bold; line-height: 1.5; margin: 16px 0 24px;">
            {status_text}
          </p>
          <a href="{frontend_url}" style="background-color: #e5c158; color: #05070a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">
            {button_text}
          </a>
          <p style="font-size: 11px; color: #475569; margin-top: 24px;">
            Enlace de la app: <a href="{frontend_url}" style="color: #e5c158; text-decoration: underline;">{frontend_url}</a>
          </p>
        </div>
      </body>
    </html>
    """
    
    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[EMAIL MOCK] To: {to_email} | Subject: {subject} | Body: {match_desc} in {time_label}. Predicted: {has_predicted}")
        return True
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Polla Mundial 2026 <{smtp_from}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"[EMAIL SUCCESS] Sent to {to_email} for match {match_desc} ({time_label} reminder)")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False

async def send_email_reminders_loop():
    print("[REMINDERS] Email reminders background loop started (1 minute check interval).")
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            # Matches starting in the next 130 minutes (2 hours + buffer)
            upcoming = db.query(models.Match).filter(
                models.Match.status == "scheduled",
                models.Match.match_time > now,
                models.Match.match_time <= now + timedelta(minutes=130)
            ).all()
            
            if upcoming:
                users = db.query(models.User).all()
                for match in upcoming:
                    match_desc = f"{match.home_team} vs {match.away_team}"
                    cot_time = match.match_time - timedelta(hours=5)
                    kickoff_str = cot_time.strftime("%I:%M %p")
                    
                    diff_mins = int((match.match_time - now).total_seconds() / 60)
                    target_intervals = [120, 60, 30, 15, 10]
                    
                    for interval in target_intervals:
                        # Trigger if remaining minutes are within a 2-minute window of the target interval
                        if interval - 2 <= diff_mins <= interval:
                            for user in users:
                                reminder_key = (user.id, match.id, interval)
                                if reminder_key in SENT_REMINDERS:
                                    continue
                                    
                                if user.email:
                                    pred = db.query(models.Prediction).filter_by(user_id=user.id, match_id=match.id).first()
                                    has_predicted = pred is not None
                                    send_reminder_email(
                                        to_email=user.email,
                                        display_name=user.display_name or "Mundialista",
                                        match_desc=match_desc,
                                        kickoff_str=kickoff_str,
                                        interval=interval,
                                        has_predicted=has_predicted
                                    )
                                    SENT_REMINDERS.add(reminder_key)
            db.close()
        except Exception as e:
            print(f"[REMINDERS ERROR] Error in reminder loop: {e}")
            
        await asyncio.sleep(60)  # Check every 1 minute to avoid missing intervals

@asynccontextmanager
async def lifespan(application):
    """Arranca los loops de sincronización y recordatorios al iniciar el servidor."""
    task_sync = asyncio.create_task(live_sync.live_score_sync_loop())
    task_emails = asyncio.create_task(send_email_reminders_loop())
    yield
    task_sync.cancel()
    task_emails.cancel()
    try:
        await asyncio.gather(task_sync, task_emails, return_exceptions=True)
    except Exception:
        pass

app = FastAPI(title="Mundial Polla API", version="1.0.0", lifespan=lifespan)

# CORS: allow local dev + production Vercel frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database with matches if empty
def seed_database():
    db = SessionLocal()
    try:
        if db.query(models.Match).count() == 0:
            print("Seeding matches database with real World Cup 2026 matches...")
            
            flag_url = "https://flagcdn.com/w160"
            
            matches = [
                # Fase de Grupos / Round of 32 (Finished / Played)
                models.Match(
                    home_team="México", 
                    away_team="Ecuador", 
                    home_flag_url=f"{flag_url}/mx.png", 
                    away_flag_url=f"{flag_url}/ec.png",
                    match_time=datetime(2026, 6, 30, 22, 0),
                    stage="Fase de Grupos",
                    home_score=2,
                    away_score=0,
                    status="finished"
                ),
                models.Match(
                    home_team="Francia", 
                    away_team="Suecia", 
                    home_flag_url=f"{flag_url}/fr.png", 
                    away_flag_url=f"{flag_url}/se.png",
                    match_time=datetime(2026, 7, 1, 1, 0),
                    stage="Fase de Grupos",
                    home_score=3,
                    away_score=0,
                    status="finished"
                ),
                models.Match(
                    home_team="Noruega", 
                    away_team="Costa de Marfil", 
                    home_flag_url=f"{flag_url}/no.png", 
                    away_flag_url=f"{flag_url}/ci.png",
                    match_time=datetime(2026, 6, 30, 22, 0),
                    stage="Fase de Grupos",
                    home_score=2,
                    away_score=1,
                    status="finished"
                ),
                models.Match(
                    home_team="Brasil", 
                    away_team="Japón", 
                    home_flag_url=f"{flag_url}/br.png", 
                    away_flag_url=f"{flag_url}/jp.png",
                    match_time=datetime(2026, 6, 29, 19, 0),
                    stage="Fase de Grupos",
                    home_score=2,
                    away_score=1,
                    status="finished"
                ),
                models.Match(
                    home_team="Canadá", 
                    away_team="Sudáfrica", 
                    home_flag_url=f"{flag_url}/ca.png", 
                    away_flag_url=f"{flag_url}/za.png",
                    match_time=datetime(2026, 6, 28, 19, 0),
                    stage="Fase de Grupos",
                    home_score=1,
                    away_score=0,
                    status="finished"
                ),
                
                # Octavos de Final (Upcoming)
                models.Match(
                    home_team="Canadá", 
                    away_team="Marruecos", 
                    home_flag_url=f"{flag_url}/ca.png", 
                    away_flag_url=f"{flag_url}/ma.png",
                    match_time=datetime(2026, 7, 4, 17, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="Paraguay", 
                    away_team="Francia", 
                    home_flag_url=f"{flag_url}/py.png", 
                    away_flag_url=f"{flag_url}/fr.png",
                    match_time=datetime(2026, 7, 4, 21, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="Brasil", 
                    away_team="Noruega", 
                    home_flag_url=f"{flag_url}/br.png", 
                    away_flag_url=f"{flag_url}/no.png",
                    match_time=datetime(2026, 7, 5, 20, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="México", 
                    away_team="Inglaterra", 
                    home_flag_url=f"{flag_url}/mx.png", 
                    away_flag_url=f"{flag_url}/gb.png",
                    match_time=datetime(2026, 7, 6, 0, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="Portugal", 
                    away_team="España", 
                    home_flag_url=f"{flag_url}/pt.png", 
                    away_flag_url=f"{flag_url}/es.png",
                    match_time=datetime(2026, 7, 6, 19, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="EE. UU.", 
                    away_team="Bélgica", 
                    home_flag_url=f"{flag_url}/us.png", 
                    away_flag_url=f"{flag_url}/be.png",
                    match_time=datetime(2026, 7, 7, 0, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                
                # Final
                models.Match(
                    home_team="Finalista 1", 
                    away_team="Finalista 2", 
                    home_flag_url=f"{flag_url}/un.png", 
                    away_flag_url=f"{flag_url}/un.png",
                    match_time=datetime(2026, 7, 19, 19, 0),
                    stage="Final",
                    status="scheduled"
                ),
            ]
            
            db.add_all(matches)
            db.commit()
            print(f"Database seeded with {len(matches)} real 2026 matches.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

seed_database()

# ENDPOINTS

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/auth/google")
def google_auth(request: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    # Verify Google token
    user_info = auth.verify_google_token(request.token)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google no válido"
        )
        
    google_id = user_info["sub"]
    email = user_info["email"]
    display_name = user_info["name"] or request.name
    avatar_url = user_info["picture"] or request.picture

    # Check if user exists
    db_user = crud.get_user(db, google_id)
    if not db_user:
        # Create user
        user_in = schemas.UserCreate(
            id=google_id,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url
        )
        db_user = crud.create_user(db, user_in)
    else:
        # Update details if needed
        db_user.display_name = display_name or db_user.display_name
        db_user.avatar_url = avatar_url or db_user.avatar_url
        db.commit()
        db.refresh(db_user)

    # Issue JWT token
    access_token = auth.create_access_token(
        data={"id": db_user.id, "email": db_user.email, "is_admin": db_user.is_admin}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "display_name": db_user.display_name,
            "avatar_url": db_user.avatar_url,
            "points": db_user.points,
            "is_admin": db_user.is_admin
        }
    }


import urllib.parse

@app.post("/api/auth/register")
def register_with_email(request: schemas.EmailRegisterRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )
    
    hashed_pwd = auth.get_password_hash(request.password)
    user_id = f"email_{request.email.replace('@', '_').replace('.', '_')}"
    
    encoded_name = urllib.parse.quote(request.display_name)
    avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={encoded_name}"
    
    db_user = models.User(
        id=user_id,
        email=request.email,
        display_name=request.display_name,
        avatar_url=avatar_url,
        password_hash=hashed_pwd,
        points=0,
        is_admin=False
    )
    
    # Make first user admin
    if db.query(models.User).count() == 0:
        db_user.is_admin = True
        
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Issue JWT token
    access_token = auth.create_access_token(
        data={"id": db_user.id, "email": db_user.email, "is_admin": db_user.is_admin}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "display_name": db_user.display_name,
            "avatar_url": db_user.avatar_url,
            "points": db_user.points,
            "is_admin": db_user.is_admin
        }
    }


@app.post("/api/auth/login")
def login_with_email(request: schemas.EmailLoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if not db_user or not db_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    
    # Verify password
    if not auth.verify_password(request.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
        
    # Issue JWT token
    access_token = auth.create_access_token(
        data={"id": db_user.id, "email": db_user.email, "is_admin": db_user.is_admin}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "display_name": db_user.display_name,
            "avatar_url": db_user.avatar_url,
            "points": db_user.points,
            "is_admin": db_user.is_admin
        }
    }


@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_current_user_profile(
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    db_user = crud.get_user(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user

@app.put("/api/users/me", response_model=schemas.UserResponse)
def update_current_user_profile(
    user_update: schemas.UserUpdate,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    db_user = crud.get_user(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if user_update.display_name is not None:
        db_user.display_name = user_update.display_name.strip()
    if user_update.avatar_url is not None:
        db_user.avatar_url = user_update.avatar_url.strip()
    if user_update.password is not None and user_update.password.strip() != "":
        db_user.password_hash = auth.get_password_hash(user_update.password)
    if user_update.favorite_team is not None:
        db_user.favorite_team = user_update.favorite_team.strip()
        
    db.commit()
    db.refresh(db_user)
    
    # Update avatar and display name in messages if user has posted messages
    db.query(models.Message).filter(models.Message.user_id == db_user.id).update({
        models.Message.user_name: db_user.display_name,
        models.Message.user_avatar: db_user.avatar_url
    })
    db.commit()
    
    return db_user

@app.get("/api/users/{user_id}/predictions", response_model=List[schemas.PredictionResponse])
def read_other_user_predictions(
    user_id: str,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    predictions = crud.get_predictions_by_user(db, user_id)
    
    # Filter predictions: only show predictions for matches that are live, finished or already started
    visible_predictions = []
    now = datetime.utcnow()
    for pred in predictions:
        match = pred.match
        if match and (match.status in ("live", "finished") or match.match_time <= now):
            visible_predictions.append(pred)
            
    return visible_predictions

@app.get("/api/users/leaderboard", response_model=List[schemas.UserLeaderboard])
def get_leaderboard(db: Session = Depends(get_db)):
    return crud.get_users_leaderboard(db)

@app.get("/api/matches", response_model=List[schemas.MatchResponse])
def read_matches(db: Session = Depends(get_db)):
    return crud.get_matches(db)

@app.get("/api/predictions", response_model=List[schemas.PredictionResponse])
def read_user_predictions(
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    predictions = crud.get_predictions_by_user(db, current_user.id)
    # Include match inside each prediction response (Pydantic will map it)
    return predictions

@app.post("/api/predictions", response_model=schemas.PredictionResponse)
def save_prediction(
    prediction: schemas.PredictionCreate,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    try:
        db_pred = crud.create_or_update_prediction(db, current_user.id, prediction)
        if not db_pred:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
        return db_pred
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/matches/{match_id}/ai-preview")
def get_match_ai_preview(
    match_id: int,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    home = match.home_team
    away = match.away_team
    
    # Standard heuristic forecast fallback
    import random
    # Deterministic seed using match ID and team names
    random.seed(match_id + len(home) * 13 + len(away) * 17)
    
    home_strength = 35 + (random.randint(0, 45))
    away_strength = 100 - home_strength
    
    if abs(home_strength - away_strength) < 10:
        home_win_chance = 35
        draw_chance = 30
        away_win_chance = 35
    else:
        home_win_chance = max(20, min(70, home_strength - 10))
        away_win_chance = max(20, min(70, away_strength - 10))
        draw_chance = 100 - home_win_chance - away_win_chance

    # Generate heuristic response text
    analysis = (
        f"Análisis táctico para {home} vs {away}. Ambos equipos se preparan para un encuentro decisivo "
        f"en esta fase del torneo. Se espera que {home} proponga un juego directo de posesión rápida, "
        f"mientras que {away} podría contragolpear con transiciones veloces. "
        f"Estadísticamente, el favoritismo se inclina ligeramente hacia el equipo que controle el mediocampo."
    )
    predicted_score = f"{random.randint(1, 3)} - {random.randint(0, 2)}"
    
    # If API key exists, call Gemini API
    if api_key:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        prompt = (
            f"Actúa como un experto analista deportivo de fútbol para la Copa Mundial de la FIFA 2026. "
            f"Analiza el próximo enfrentamiento entre {home} y {away}. "
            f"Proporciona un breve análisis táctico de 3 o 4 oraciones en español. "
            f"Al final, incluye obligatoriamente una sugerencia de marcador exacto en el formato "
            f"'Marcador sugerido: X - Y'. Mantén un tono emocionante y profesional."
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 300
            }
        }
        try:
            r = httpx.post(url, json=payload, timeout=8.0)
            if r.status_code == 200:
                data = r.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                # Parse suggested score if present
                import re
                score_match = re.search(r"Marcador sugerido:\s*(\d+)\s*-\s*(\d+)", text_response, re.IGNORECASE)
                if score_match:
                    predicted_score = f"{score_match.group(1)} - {score_match.group(2)}"
                analysis = text_response
        except Exception as e:
            print(f"[GEMINI ERROR] Request failed, using statistical fallback: {e}")
            
    return {
        "analysis": analysis,
        "predicted_score": predicted_score,
        "home_win_pct": home_win_chance,
        "draw_pct": draw_chance,
        "away_win_pct": away_win_chance
    }


@app.get("/api/chat", response_model=List[schemas.MessageResponse])
def get_chat(
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    messages = crud.get_chat_messages(db)
    response = []
    for msg in messages:
        is_admin = False
        if msg.user:
            is_admin = msg.user.is_admin
        else:
            db_u = crud.get_user(db, msg.user_id)
            if db_u:
                is_admin = db_u.is_admin
                
        response.append(
            schemas.MessageResponse(
                id=msg.id,
                user_id=msg.user_id,
                user_name=msg.user_name,
                user_avatar=msg.user_avatar,
                text=msg.text,
                timestamp=msg.timestamp,
                is_admin=is_admin
            )
        )
    return response


@app.post("/api/chat", response_model=schemas.MessageResponse)
def send_message(
    message: schemas.MessageCreate,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    db_user = crud.get_user(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    db_msg = crud.create_chat_message(
        db,
        text=message.text,
        user_id=db_user.id,
        user_name=db_user.display_name or "Usuario",
        user_avatar=db_user.avatar_url
    )
    
    return schemas.MessageResponse(
        id=db_msg.id,
        user_id=db_msg.user_id,
        user_name=db_msg.user_name,
        user_avatar=db_msg.user_avatar,
        text=db_msg.text,
        timestamp=db_msg.timestamp,
        is_admin=db_user.is_admin
    )


# ADMIN ENDPOINTS


@app.post("/api/admin/matches", response_model=schemas.MatchResponse)
def add_match(
    match: schemas.MatchCreate,
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    return crud.create_match(db, match)

@app.put("/api/admin/matches/{match_id}/score", response_model=schemas.MatchResponse)
def update_match_score(
    match_id: int,
    score_update: schemas.MatchUpdate,
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    if score_update.status == "finished" and (score_update.home_score is None or score_update.away_score is None):
        raise HTTPException(
            status_code=400, 
            detail="Los goles de local y visitante son obligatorios para finalizar el partido."
        )
    
    updated_match = crud.update_match_results(
        db, 
        match_id, 
        score_update.home_score, 
        score_update.away_score, 
        score_update.status,
        score_update.home_team,
        score_update.away_team,
        score_update.home_penalties,
        score_update.away_penalties,
        score_update.penalties_winner
    )
    
    if not updated_match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
        
    # Auto-advance and recalculate points if finished
    if score_update.status == "finished":
        crud.recalculate_points_for_match(db, match_id)
        crud.advance_bracket_winner(db, match_id)
        db.refresh(updated_match)
        
    return updated_match

@app.post("/api/admin/recalculate")
def trigger_recalculate_all(
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    # Recalculate each match that is finished
    finished_matches = db.query(models.Match).filter(models.Match.status == "finished").all()
    for m in finished_matches:
        crud.recalculate_points_for_match(db, m.id)
    # Update total points of users
    crud.recalculate_all_user_points(db)
    return {"message": "Puntajes de todos los usuarios actualizados correctamente."}


@app.post("/api/admin/test-email-reminders")
def test_email_reminders(
    hours_ahead: int = 24,
    dry_run: bool = True,
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    """
    Prueba el sistema de recordatorios de correo.
    - hours_ahead: ventana de tiempo hacia adelante (default 24h para pruebas)
    - dry_run: si True, solo simula sin enviar correos reales (ignora SENT_REMINDERS)
    Retorna un reporte detallado de los correos que se enviarían/enviaron.
    """
    now = datetime.utcnow()
    upcoming = db.query(models.Match).filter(
        models.Match.status == "scheduled",
        models.Match.match_time > now,
        models.Match.match_time <= now + timedelta(hours=hours_ahead)
    ).all()

    users = db.query(models.User).all()
    report = {
        "checked_at_utc": now.isoformat(),
        "window_hours": hours_ahead,
        "dry_run": dry_run,
        "matches_found": len(upcoming),
        "reminders_sent": [],
        "reminders_skipped": [],
    }

    for match in upcoming:
        match_desc = f"{match.home_team} vs {match.away_team}"
        cot_time = match.match_time - timedelta(hours=5)
        kickoff_str = cot_time.strftime("%I:%M %p")
        match_info = {
            "match_id": match.id,
            "match": match_desc,
            "kickoff_cot": kickoff_str,
            "stage": match.stage,
        }

        for user in users:
            key = (user.id, match.id)
            already_sent = key in SENT_REMINDERS

            pred = db.query(models.Prediction).filter_by(user_id=user.id, match_id=match.id).first()
            has_prediction = pred is not None

            if has_prediction:
                report["reminders_skipped"].append({
                    **match_info,
                    "user": user.display_name or user.email,
                    "reason": "Ya tiene predicción guardada"
                })
                continue

            if already_sent and not dry_run:
                report["reminders_skipped"].append({
                    **match_info,
                    "user": user.display_name or user.email,
                    "reason": "Recordatorio ya enviado anteriormente"
                })
                continue

            # Send or simulate
            entry = {
                **match_info,
                "user": user.display_name or user.email,
                "email": user.email,
            }

            if dry_run:
                entry["status"] = "simulado (dry_run=True)"
            else:
                success = send_reminder_email(user.email, user.display_name or "Usuario", match_desc, kickoff_str)
                SENT_REMINDERS.add(key)
                entry["status"] = "enviado" if success else "error al enviar"

            report["reminders_sent"].append(entry)

    report["summary"] = (
        f"{len(report['reminders_sent'])} recordatorios {'simulados' if dry_run else 'enviados'}, "
        f"{len(report['reminders_skipped'])} omitidos "
        f"({len(upcoming)} partidos en las próximas {hours_ahead}h)"
    )
    return report


@app.post("/api/admin/reset_db")
def reset_database(
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    try:
        # Clear predictions and matches tables, resetting the auto-increment
        # ID counter too. This is required for the bracket auto-advance logic
        # in crud.py, which assumes fixed IDs: Ronda de 32=1-16, Octavos=17-24,
        # Cuartos=25-28, Semifinal=29-30, 3er Puesto=31, Final=32.
        # (Using .delete() alone leaves the Postgres sequence advanced, which
        # desincroniza los IDs esperados por la llave del torneo.)
        if db.bind.dialect.name == "sqlite":
            db.execute(text("DELETE FROM predictions"))
            db.execute(text("DELETE FROM matches"))
            db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('predictions', 'matches')"))
        else:
            db.execute(text("TRUNCATE TABLE predictions, matches RESTART IDENTITY CASCADE"))
        db.commit()
        
        flag_url = "https://flagcdn.com/w160"
        
        matches = [
            # ---- RONDA DE 32 (Dieciseisavos - 16 partidos reales) ----
            # Llave Izquierda (Lado A)
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
                home_score=1, away_score=1, status="finished" # Marruecos clasifica por penales
            ),
            models.Match(
                home_team="Alemania", away_team="Paraguay", 
                home_flag_url=f"{flag_url}/de.png", away_flag_url=f"{flag_url}/py.png",
                match_time=datetime(2026, 6, 29, 21, 0), stage="Ronda de 32",
                home_score=1, away_score=1, status="finished" # Paraguay clasifica por penales
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

            # Llave Derecha (Lado B)
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

            # ---- OCTAVOS DE FINAL (8 partidos) ----
            models.Match(
                home_team="Canadá", away_team="Marruecos", 
                home_flag_url=f"{flag_url}/ca.png", away_flag_url=f"{flag_url}/ma.png",
                match_time=datetime(2026, 7, 4, 17, 0), stage="Octavos de Final",
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
                match_time=datetime(2026, 7, 5, 20, 0), stage="Octavos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="México", away_team="Inglaterra", 
                home_flag_url=f"{flag_url}/mx.png", away_flag_url=f"{flag_url}/gb.png",
                match_time=datetime(2026, 7, 6, 0, 0), stage="Octavos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="Portugal", away_team="España", 
                home_flag_url=f"{flag_url}/pt.png", away_flag_url=f"{flag_url}/es.png",
                match_time=datetime(2026, 7, 6, 19, 0), stage="Octavos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="EE. UU.", away_team="Bélgica", 
                home_flag_url=f"{flag_url}/us.png", away_flag_url=f"{flag_url}/be.png",
                match_time=datetime(2026, 7, 7, 0, 0), stage="Octavos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="Argentina / Cabo Verde", away_team="Australia / Egipto", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 7, 16, 0), stage="Octavos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="Suiza / Argelia", away_team="Colombia / Ghana", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 7, 20, 0), stage="Octavos de Final",
                status="scheduled"
            ),

            # ---- CUARTOS DE FINAL (4 partidos) ----
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 9, 20, 0), stage="Cuartos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 10, 19, 0), stage="Cuartos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 11, 21, 0), stage="Cuartos de Final",
                status="scheduled"
            ),
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 12, 1, 0), stage="Cuartos de Final",
                status="scheduled"
            ),

            # ---- SEMIFINALES ----
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 15, 0, 0), stage="Semifinal",
                status="scheduled"
            ),
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 16, 0, 0), stage="Semifinal",
                status="scheduled"
            ),

            # ---- TERCER PUESTO ----
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 18, 19, 0), stage="3er Puesto",
                status="scheduled"
            ),

            # ---- GRAN FINAL ----
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 19, 19, 0), stage="Final",
                status="scheduled"
            ),
        ]
        
        db.add_all(matches)
        db.commit()
        
        # Reset user points
        crud.recalculate_all_user_points(db)
        
        return {"message": "Base de datos reiniciada con partidos reales del Mundial 2026."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al reiniciar la base de datos: {str(e)}")


@app.get("/api/admin/users", response_model=list[schemas.UserResponse])
def admin_get_all_users(
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    return crud.get_all_users(db)


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: str,
    admin: schemas.TokenData = Depends(auth.get_admin_user_token),
    db: Session = Depends(get_db)
):
    if admin.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminarte a ti mismo."
        )
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado."
        )
    return {"message": "Usuario eliminado exitosamente."}


# --- PREMIUM FEATURES ENDPOINTS ---

@app.get("/api/matches/{match_id}/stats", response_model=schemas.MatchStatsResponse)
def get_match_community_stats(match_id: int, db: Session = Depends(get_db)):
    preds = db.query(models.Prediction).filter(models.Prediction.match_id == match_id).all()
    total = len(preds)
    
    if total == 0:
        return schemas.MatchStatsResponse(
            total_predictions=0,
            home_win_pct=0,
            away_win_pct=0,
            draw_pct=0,
            avg_home_prediction=0.0,
            avg_away_prediction=0.0
        )
        
    home_wins = sum(1 for p in preds if p.home_prediction > p.away_prediction)
    away_wins = sum(1 for p in preds if p.away_prediction > p.home_prediction)
    draws = sum(1 for p in preds if p.home_prediction == p.away_prediction)
    
    avg_home = sum(p.home_prediction for p in preds) / total
    avg_away = sum(p.away_prediction for p in preds) / total
    
    return schemas.MatchStatsResponse(
        total_predictions=total,
        home_win_pct=int((home_wins / total) * 100),
        away_win_pct=int((away_wins / total) * 100),
        draw_pct=int((draws / total) * 100),
        avg_home_prediction=round(avg_home, 1),
        avg_away_prediction=round(avg_away, 1)
    )


@app.get("/api/matches/{match_id}/predictions", response_model=schemas.MatchPredictionsResponse)
def get_match_predictions(
    match_id: int,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Returns all user predictions for a match.
    Predictions are only visible when the match is locked (live or finished).
    """
    db_match = crud.get_match(db, match_id)
    if not db_match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    is_locked = db_match.status in ("live", "finished")

    if not is_locked:
        # Return empty list while predictions are still open
        return schemas.MatchPredictionsResponse(
            match_id=match_id,
            is_locked=False,
            predictions=[]
        )

    preds = db.query(models.Prediction).filter(models.Prediction.match_id == match_id).all()

    result = []
    for pred in preds:
        user = crud.get_user(db, pred.user_id)
        result.append(schemas.MatchPredictionItem(
            user_id=pred.user_id,
            display_name=user.display_name if user else "Usuario",
            avatar_url=user.avatar_url if user else None,
            home_prediction=pred.home_prediction,
            away_prediction=pred.away_prediction,
            points_earned=pred.points_earned
        ))

    # Sort: exact score first, then outcome correct, then wrong, then by points desc
    def sort_key(p):
        if p.points_earned == 3:
            return 0
        elif p.points_earned == 1:
            return 1
        elif p.points_earned == 0:
            return 2
        return 3

    result.sort(key=sort_key)

    return schemas.MatchPredictionsResponse(
        match_id=match_id,
        is_locked=True,
        predictions=result
    )


@app.post("/api/groups", response_model=schemas.GroupResponse)
def create_new_group(
    group: schemas.GroupCreate,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    return crud.create_group(db, group.name, current_user.id)


@app.post("/api/groups/join", response_model=schemas.GroupResponse)
def join_existing_group(
    join_req: schemas.JoinGroupRequest,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    try:
        return crud.join_group(db, join_req.code, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/users/me/groups", response_model=List[schemas.GroupResponse])
def get_my_groups(
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    return crud.get_user_groups(db, current_user.id)


@app.get("/api/groups/{group_id}/leaderboard", response_model=List[schemas.UserLeaderboard])
def get_group_board(
    group_id: int,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    # Verify user is a member of the group
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="No eres miembro de este grupo.")
        
    return crud.get_group_leaderboard(db, group_id)


# ─── Champion Poll Endpoints ───────────────────────────────────────────────────

@app.get("/api/champion-votes")
def get_champion_votes(
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Returns the champion poll results: votes aggregated by team,
    plus the current user's vote and a list of voters per team.
    """
    # Auto-migrate: add column if DB doesn't have it yet
    try:
        db.execute(text("SELECT champion_vote FROM users LIMIT 1"))
    except Exception:
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN champion_vote VARCHAR"))
            db.commit()
        except Exception:
            pass

    users = db.query(models.User).all()
    total_votes = sum(1 for u in users if u.champion_vote)

    # Aggregate votes per team
    tally = {}
    for u in users:
        if not u.champion_vote:
            continue
        team = u.champion_vote
        if team not in tally:
            tally[team] = {"team": team, "votes": 0, "voters": []}
        tally[team]["votes"] += 1
        tally[team]["voters"].append({
            "display_name": u.display_name or "Usuario",
            "avatar_url": u.avatar_url,
        })

    results = sorted(tally.values(), key=lambda x: -x["votes"])

    # Add percentage
    for r in results:
        r["pct"] = round((r["votes"] / total_votes) * 100) if total_votes > 0 else 0

    # Find current user's vote
    my_vote = None
    for u in users:
        if u.id == current_user.id:
            my_vote = u.champion_vote
            break

    return {
        "total_votes": total_votes,
        "my_vote": my_vote,
        "results": results,
    }


@app.post("/api/champion-vote")
def cast_champion_vote(
    payload: dict,
    current_user: schemas.TokenData = Depends(auth.get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Cast or update the current user's champion vote.
    Body: { "team": "Argentina" }
    """
    team = payload.get("team", "").strip()
    if not team:
        raise HTTPException(status_code=400, detail="Debes especificar un equipo.")

    db_user = crud.get_user(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    db_user.champion_vote = team
    db.commit()
    db.refresh(db_user)

    return {"message": f"Voto registrado: {team}", "team": team}
