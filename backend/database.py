from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./keiba.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Race(Base):
    __tablename__ = "races"
    id = Column(String, primary_key=True)  # e.g. "202506150101"
    date = Column(String, index=True)      # "2025-06-15"
    venue = Column(String)                  # "東京"
    race_number = Column(Integer)
    name = Column(String)
    distance = Column(Integer)
    track_type = Column(String)             # "芝" or "ダート"
    weather = Column(String)
    track_condition = Column(String)        # "良" "稍重" "重" "不良"
    start_time = Column(String)
    grade = Column(String)                  # "G1" "G2" "G3" ""
    horses = relationship("Horse", back_populates="race")


class Horse(Base):
    __tablename__ = "horses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(String, ForeignKey("races.id"))
    horse_id = Column(String, index=True)   # netkeiba horse ID
    name = Column(String)
    number = Column(Integer)                # 馬番
    frame = Column(Integer)                 # 枠番
    sex = Column(String)
    age = Column(Integer)
    weight = Column(Float)
    weight_diff = Column(Float)
    jockey = Column(String)
    trainer = Column(String)
    bloodline_sire = Column(String)
    bloodline_dam = Column(String)
    odds_win = Column(Float)                # 単勝オッズ
    odds_place = Column(Float)              # 複勝オッズ
    odds_updated_at = Column(DateTime)
    win_prob = Column(Float)                # AI予測勝率
    value_score = Column(Float)             # 期待値スコア (win_prob * odds - 1)
    predicted_rank = Column(Integer)        # AI予測順位
    jockey_win_rate = Column(Float)
    trainer_win_rate = Column(Float)
    past_results = Column(Text)             # JSON string
    race = relationship("Race", back_populates="horses")


class BetRecord(Base):
    __tablename__ = "bet_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(String)
    race_name = Column(String)
    race_date = Column(String)
    bet_type = Column(String)               # "単勝" "三連単" etc.
    horse_names = Column(String)            # comma-separated
    amount = Column(Integer)                # 賭け金（円）
    odds_at_bet = Column(Float)
    result = Column(String)                 # "win" "lose" null
    payout = Column(Integer)                # 払い戻し金額
    created_at = Column(DateTime, default=datetime.now)
    note = Column(Text)


class FavoriteHorse(Base):
    __tablename__ = "favorite_horses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    horse_id = Column(String, unique=True)
    name = Column(String)
    added_at = Column(DateTime, default=datetime.now)


class ModelFeedback(Base):
    __tablename__ = "model_feedback"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(String)
    horse_id = Column(String)
    predicted_rank = Column(Integer)
    actual_rank = Column(Integer)
    win_prob = Column(Float)
    odds = Column(Float)
    created_at = Column(DateTime, default=datetime.now)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
