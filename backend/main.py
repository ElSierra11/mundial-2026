import crud
import models
import schemas
import auth
import live_sync
import asyncio
import os
from contextlib import asynccontextmanager
from database import SessionLocal, engine, get_db
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List

# Create DB tables
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(application):
    """Arranca el loop de sincronizacion ESPN al iniciar el servidor."""
    task = asyncio.create_task(live_sync.live_score_sync_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
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
                    match_time=datetime(2026, 6, 28, 18, 0),
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
                    match_time=datetime(2026, 6, 28, 21, 0),
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
                    match_time=datetime(2026, 6, 29, 15, 0),
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
                    match_time=datetime(2026, 6, 30, 18, 0),
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
                    match_time=datetime(2026, 6, 30, 21, 0),
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
                    match_time=datetime(2026, 7, 4, 18, 0),
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
                    match_time=datetime(2026, 7, 5, 18, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="México", 
                    away_team="Inglaterra", 
                    home_flag_url=f"{flag_url}/mx.png", 
                    away_flag_url=f"{flag_url}/gb.png",
                    match_time=datetime(2026, 7, 5, 21, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="Portugal", 
                    away_team="España", 
                    home_flag_url=f"{flag_url}/pt.png", 
                    away_flag_url=f"{flag_url}/es.png",
                    match_time=datetime(2026, 7, 6, 18, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                models.Match(
                    home_team="EE. UU.", 
                    away_team="Bélgica", 
                    home_flag_url=f"{flag_url}/us.png", 
                    away_flag_url=f"{flag_url}/be.png",
                    match_time=datetime(2026, 7, 6, 21, 0),
                    stage="Octavos de Final",
                    status="scheduled"
                ),
                
                # Final
                models.Match(
                    home_team="Finalista 1", 
                    away_team="Finalista 2", 
                    home_flag_url=f"{flag_url}/un.png", 
                    away_flag_url=f"{flag_url}/un.png",
                    match_time=datetime(2026, 7, 19, 20, 0),
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

            # ---- CUARTOS DE FINAL (4 partidos) ----
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

            # ---- GRAN FINAL ----
            models.Match(
                home_team="TBD", away_team="TBD", 
                home_flag_url=f"{flag_url}/un.png", away_flag_url=f"{flag_url}/un.png",
                match_time=datetime(2026, 7, 19, 20, 0), stage="Final",
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

