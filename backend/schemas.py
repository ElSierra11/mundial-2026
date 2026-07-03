from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    id: str  # Google ID or custom id

class UserResponse(UserBase):
    id: str
    points: int
    is_admin: bool

    class Config:
        from_attributes = True

class UserLeaderboard(BaseModel):
    display_name: Optional[str]
    avatar_url: Optional[str]
    points: int
    rank: Optional[int] = None

    class Config:
        from_attributes = True

# Match schemas
class MatchBase(BaseModel):
    home_team: str
    away_team: str
    home_flag_url: Optional[str] = None
    away_flag_url: Optional[str] = None
    match_time: datetime
    stage: str

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None  # 'scheduled', 'live', 'finished'
    home_team: Optional[str] = None
    away_team: Optional[str] = None

class MatchResponse(MatchBase):
    id: int
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str

    class Config:
        from_attributes = True

# Prediction schemas
class PredictionBase(BaseModel):
    match_id: int
    home_prediction: int
    away_prediction: int

class PredictionCreate(PredictionBase):
    pass

class PredictionResponse(PredictionBase):
    id: int
    user_id: str
    points_earned: Optional[int] = None
    match: Optional[MatchResponse] = None

    class Config:
        from_attributes = True

# Auth schemas
class TokenData(BaseModel):
    id: str
    email: str
    is_admin: bool

class GoogleLoginRequest(BaseModel):
    token: str  # Google ID Token or Access Token
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


# Message schemas
class MessageBase(BaseModel):
    text: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    user_id: str
    user_name: Optional[str]
    user_avatar: Optional[str]
    timestamp: datetime
    is_admin: bool = False

    class Config:
        from_attributes = True


# Group / League schemas
class GroupCreate(BaseModel):
    name: str

class GroupResponse(BaseModel):
    id: int
    name: str
    code: str
    owner_id: str

    class Config:
        from_attributes = True

class JoinGroupRequest(BaseModel):
    code: str

# Match community stats schema
class MatchStatsResponse(BaseModel):
    total_predictions: int
    home_win_pct: int
    away_win_pct: int
    draw_pct: int
    avg_home_prediction: float
    avg_away_prediction: float


class EmailRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str


