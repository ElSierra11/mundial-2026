from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from datetime import datetime

# User operations
def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        favorite_team=user.favorite_team,
        points=0,
        is_admin=(user.email == "alejosierra656@gmail.com")
    )
        
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_users_leaderboard(db: Session):
    users = db.query(models.User).order_by(models.User.points.desc()).all()
    # Add ranking numbers (taking into account ties)
    ranked_users = []
    current_rank = 1
    previous_points = None
    for i, user in enumerate(users):
        if previous_points is not None and user.points < previous_points:
            current_rank = i + 1
        previous_points = user.points
        
        user_dict = {
            "id": user.id,
            "display_name": user.display_name or user.email.split("@")[0],
            "avatar_url": user.avatar_url,
            "points": user.points,
            "rank": current_rank,
            "favorite_team": user.favorite_team
        }
        ranked_users.append(user_dict)
    return ranked_users

# Match operations
def get_matches(db: Session):
    return db.query(models.Match).order_by(models.Match.match_time.asc()).all()

def get_match(db: Session, match_id: int):
    return db.query(models.Match).filter(models.Match.id == match_id).first()

def create_match(db: Session, match: schemas.MatchCreate):
    db_match = models.Match(
        home_team=match.home_team,
        away_team=match.away_team,
        home_flag_url=match.home_flag_url,
        away_flag_url=match.away_flag_url,
        match_time=match.match_time,
        stage=match.stage,
        status="scheduled"
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    return db_match

def guess_flag_url(team_name: str) -> str:
    if not team_name:
        return None
    name = team_name.lower().strip()
    
    # Spanish name to country code dictionary
    country_codes = {
        "méxico": "mx", "mexico": "mx",
        "ecuador": "ec",
        "francia": "fr",
        "suecia": "se",
        "noruega": "no",
        "costa de marfil": "ci",
        "costa de marfil": "ci",
        "brasil": "br",
        "japón": "jp", "japon": "jp",
        "canadá": "ca", "canada": "ca",
        "sudáfrica": "za", "sudafrica": "za",
        "marruecos": "ma",
        "paraguay": "py",
        "alemania": "de",
        "inglaterra": "gb-eng", "england": "gb-eng",
        "españa": "es", "espana": "es",
        "portugal": "pt",
        "ee. uu.": "us", "estados unidos": "us", "ee.uu.": "us", "usa": "us",
        "bélgica": "be", "belgica": "be",
        "suiza": "ch",
        "argelia": "dz",
        "australia": "au",
        "egipto": "eg",
        "argentina": "ar",
        "cabo verde": "cv",
        "colombia": "co",
        "ghana": "gh",
        "senegal": "sn",
        "países bajos": "nl", "paises bajos": "nl", "holanda": "nl",
        "croacia": "hr",
        "r. d. congo": "cd", "congo": "cd", "r.d. congo": "cd"
    }
    
    code = country_codes.get(name, "un")  # default to "un" (United Nations) flag if not found
    return f"https://flagcdn.com/w160/{code}.png"

# ─── Bracket auto-advance ───────────────────────────────────────────────────
# Propagates the winner (and, for the 3rd place match, the loser) of a
# finished knockout match into the following round's match slot.
#
# This assumes the fixed match ID layout created by /api/admin/reset_db and
# reset_db_2026.py:
#   Ronda de 32   = ids 1-16
#   Octavos       = ids 17-24
#   Cuartos       = ids 25-28
#   Semifinal     = ids 29-30
#   3er Puesto    = id 31
#   Final         = id 32
#
# Format: source_match_id -> [(target_match_id, "home"|"away", "winner"|"loser"), ...]
BRACKET_ADVANCE_MAP = {
    1: [(17, "home", "winner")],
    2: [(17, "away", "winner")],
    3: [(18, "home", "winner")],
    4: [(18, "away", "winner")],
    5: [(19, "home", "winner")],
    6: [(19, "away", "winner")],
    7: [(20, "home", "winner")],
    8: [(20, "away", "winner")],
    9: [(22, "home", "winner")],
    10: [(22, "away", "winner")],
    11: [(21, "away", "winner")],
    12: [(21, "home", "winner")],
    13: [(24, "home", "winner")],
    14: [(23, "away", "winner")],
    15: [(23, "home", "winner")],
    16: [(24, "away", "winner")],
    17: [(25, "home", "winner")],
    18: [(25, "away", "winner")],
    19: [(26, "home", "winner")],
    20: [(26, "away", "winner")],
    21: [(27, "home", "winner")],
    22: [(27, "away", "winner")],
    23: [(28, "home", "winner")],
    24: [(28, "away", "winner")],
    25: [(29, "home", "winner")],
    26: [(29, "away", "winner")],
    27: [(30, "home", "winner")],
    28: [(30, "away", "winner")],
    29: [(32, "home", "winner"), (31, "home", "loser")],
    30: [(32, "away", "winner"), (31, "away", "loser")],
}


def _match_outcome(db_match, side: str):
    """
    Returns (team_name, flag_url) for the winner/loser of a finished match.
    Returns None if the match isn't finished, has no score yet, or ended in
    a scoreline draw without penalties_winner yet.
    """
    if db_match.status != "finished":
        return None
    if db_match.home_score is None or db_match.away_score is None:
        return None
    if db_match.home_score == db_match.away_score:
        if db_match.penalties_winner:
            home_won = (db_match.penalties_winner == db_match.home_team)
        else:
            return None  # Decided by penalties — needs winner to advance
    else:
        home_won = db_match.home_score > db_match.away_score

    if side == "winner":
        return (db_match.home_team, db_match.home_flag_url) if home_won else (db_match.away_team, db_match.away_flag_url)
    else:
        return (db_match.away_team, db_match.away_flag_url) if home_won else (db_match.home_team, db_match.home_flag_url)


def advance_bracket_winner(db: Session, match_id: int):
    """Pushes the outcome of a finished knockout match into whatever match(es)
    depend on it, so the next round shows the real team name instead of a
    placeholder like 'Argentina / Cabo Verde'."""
    targets = BRACKET_ADVANCE_MAP.get(match_id)
    if not targets:
        return

    db_match = get_match(db, match_id)
    if not db_match:
        return

    changed = False
    for target_id, slot, side in targets:
        outcome = _match_outcome(db_match, side)
        if not outcome:
            continue
        team_name, flag_url = outcome

        target_match = get_match(db, target_id)
        if not target_match:
            continue

        if slot == "home":
            target_match.home_team = team_name
            target_match.home_flag_url = flag_url
        else:
            target_match.away_team = team_name
            target_match.away_flag_url = flag_url
        changed = True

    if changed:
        db.commit()


def update_match_results(db: Session, match_id: int, home_score: int, away_score: int, status: str, home_team: str = None, away_team: str = None, home_penalties: int = None, away_penalties: int = None, penalties_winner: str = None):
    db_match = get_match(db, match_id)
    if not db_match:
        return None
    
    if home_score is not None:
        db_match.home_score = home_score
    if away_score is not None:
        db_match.away_score = away_score
    if home_penalties is not None:
        db_match.home_penalties = home_penalties
    if away_penalties is not None:
        db_match.away_penalties = away_penalties
    if penalties_winner is not None:
        db_match.penalties_winner = penalties_winner
    if status is not None:
        db_match.status = status
    if home_team is not None:
        db_match.home_team = home_team
        db_match.home_flag_url = guess_flag_url(home_team)
    if away_team is not None:
        db_match.away_team = away_team
        db_match.away_flag_url = guess_flag_url(away_team)
        
    db.commit()
    db.refresh(db_match)
    
    # Trigger score recalculation
    recalculate_points_for_match(db, match_id)
    recalculate_all_user_points(db)

    # Auto-advance the winner (and loser, for the 3rd place match) into
    # whichever next-round match depends on this one.
    advance_bracket_winner(db, match_id)
    
    return db_match

# Prediction operations
def get_predictions_by_user(db: Session, user_id: str):
    return db.query(models.Prediction).filter(models.Prediction.user_id == user_id).all()

def get_prediction_by_user_and_match(db: Session, user_id: str, match_id: int):
    return db.query(models.Prediction).filter(
        models.Prediction.user_id == user_id,
        models.Prediction.match_id == match_id
    ).first()

def create_or_update_prediction(db: Session, user_id: str, prediction: schemas.PredictionCreate):
    # Check if match is finished or already started to prevent late predictions
    db_match = get_match(db, prediction.match_id)
    if not db_match:
        return None
    
    # In production, check if match has started:
    # if db_match.match_time < datetime.utcnow() or db_match.status in ['live', 'finished']:
    if db_match.status in ["live", "finished"]:
        # Do not allow modifying predictions
        raise Exception("El partido ya ha comenzado o finalizado.")

    db_prediction = get_prediction_by_user_and_match(db, user_id, prediction.match_id)
    if db_prediction:
        db_prediction.home_prediction = prediction.home_prediction
        db_prediction.away_prediction = prediction.away_prediction
    else:
        db_prediction = models.Prediction(
            user_id=user_id,
            match_id=prediction.match_id,
            home_prediction=prediction.home_prediction,
            away_prediction=prediction.away_prediction
        )
        db.add(db_prediction)
        
    db.commit()
    db.refresh(db_prediction)
    return db_prediction

# Point calculation logic
def recalculate_points_for_match(db: Session, match_id: int):
    db_match = get_match(db, match_id)
    if not db_match or db_match.status != "finished" or db_match.home_score is None or db_match.away_score is None:
        # Reset prediction points if match is not finished
        predictions = db.query(models.Prediction).filter(models.Prediction.match_id == match_id).all()
        for pred in predictions:
            pred.points_earned = None
        db.commit()
        return

    predictions = db.query(models.Prediction).filter(models.Prediction.match_id == match_id).all()
    actual_home = db_match.home_score
    actual_away = db_match.away_score
    
    # Actual outcome: 1 = home win, 2 = away win, 0 = draw
    actual_outcome = 1 if actual_home > actual_away else (2 if actual_away > actual_home else 0)

    for pred in predictions:
        pred_home = pred.home_prediction
        pred_away = pred.away_prediction
        pred_outcome = 1 if pred_home > pred_away else (2 if pred_away > pred_home else 0)
        
        if pred_home == actual_home and pred_away == actual_away:
            # Exact score: 3 points
            pred.points_earned = 3
        elif pred_outcome == actual_outcome:
            # Correct winner/draw, wrong score: 1 point
            pred.points_earned = 1
        else:
            # Wrong winner/draw: 0 points
            pred.points_earned = 0
            
    db.commit()

def recalculate_all_user_points(db: Session):
    # Set all users' points to 0
    db.query(models.User).update({models.User.points: 0})
    db.commit()
    
    # Calculate sum of points_earned for each user from finished predictions
    user_points = db.query(
        models.Prediction.user_id,
        func.sum(models.Prediction.points_earned).label("total_points")
    ).filter(models.Prediction.points_earned != None).group_by(models.Prediction.user_id).all()
    
    # Update each user with their total points
    for up in user_points:
        user = get_user(db, up.user_id)
        if user:
            user.points = int(up.total_points or 0)
            
    db.commit()


def get_chat_messages(db: Session, limit: int = 50):
    return db.query(models.Message).order_by(models.Message.timestamp.asc()).limit(limit).all()


def create_chat_message(db: Session, text: str, user_id: str, user_name: str, user_avatar: str):
    db_msg = models.Message(
        user_id=user_id,
        user_name=user_name,
        user_avatar=user_avatar,
        text=text,
        timestamp=datetime.utcnow()
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


# Group / League operations
def create_group(db: Session, name: str, owner_id: str):
    import random
    import string
    
    # Generate unique 6-character code
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # Ensure uniqueness
        if not db.query(models.Group).filter(models.Group.code == code).first():
            break
            
    db_group = models.Group(
        name=name,
        code=code,
        owner_id=owner_id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add creator as first member
    db_member = models.GroupMember(
        group_id=db_group.id,
        user_id=owner_id
    )
    db.add(db_member)
    db.commit()
    
    return db_group


def join_group(db: Session, code: str, user_id: str):
    db_group = db.query(models.Group).filter(models.Group.code == code.upper().strip()).first()
    if not db_group:
        raise ValueError("Grupo no encontrado con el código proporcionado.")
        
    # Check if already a member
    already_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == db_group.id,
        models.GroupMember.user_id == user_id
    ).first()
    
    if not already_member:
        db_member = models.GroupMember(
            group_id=db_group.id,
            user_id=user_id
        )
        db.add(db_member)
        db.commit()
        
    return db_group


def get_user_groups(db: Session, user_id: str):
    return db.query(models.Group).join(models.GroupMember).filter(models.GroupMember.user_id == user_id).all()


def get_group_leaderboard(db: Session, group_id: int):
    # Get all users who are members of this group, ordered by points desc
    members = db.query(models.User).join(models.GroupMember).filter(models.GroupMember.group_id == group_id).order_by(models.User.points.desc()).all()
    
    ranked_members = []
    current_rank = 1
    previous_points = None
    
    for i, user in enumerate(members):
        if previous_points is not None and user.points < previous_points:
            current_rank = i + 1
        previous_points = user.points
        
        user_dict = {
            "id": user.id,
            "display_name": user.display_name or user.email.split("@")[0],
            "avatar_url": user.avatar_url,
            "points": user.points,
            "rank": current_rank,
            "favorite_team": user.favorite_team
        }
        ranked_members.append(user_dict)
        
    return ranked_members


