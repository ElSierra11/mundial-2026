from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Google ID or generated ID
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    points = Column(Integer, default=0)
    is_admin = Column(Boolean, default=False)
    password_hash = Column(String, nullable=True)
    favorite_team = Column(String, nullable=True)
    champion_vote = Column(String, nullable=True)  # Team the user thinks will win the World Cup

    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_flag_url = Column(String, nullable=True)
    away_flag_url = Column(String, nullable=True)
    match_time = Column(DateTime, nullable=False)
    stage = Column(String, default="Fase de Grupos")  # 'Fase de Grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final'
    home_score = Column(Integer, nullable=True)  # Null if not played
    away_score = Column(Integer, nullable=True)  # Null if not played
    home_penalties = Column(Integer, nullable=True)
    away_penalties = Column(Integer, nullable=True)
    penalties_winner = Column(String, nullable=True)
    status = Column(String, default="scheduled")  # 'scheduled', 'live', 'finished'

    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    home_prediction = Column(Integer, nullable=False)
    away_prediction = Column(Integer, nullable=False)
    points_earned = Column(Integer, nullable=True)  # Null until match status is finished

    user = relationship("User", back_populates="predictions")
    match = relationship("Match", back_populates="predictions")

    __table_args__ = (
        UniqueConstraint("user_id", "match_id", name="uq_user_match_prediction"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, nullable=True)
    user_avatar = Column(String, nullable=True)
    text = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    user = relationship("User")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    owner = relationship("User")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    group = relationship("Group", back_populates="members")
    user = relationship("User")


