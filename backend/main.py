from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional, List
import asyncio
import json
import logging
import os
import pathlib

from database import (
    create_tables, get_db,
    Race, Horse, BetRecord, FavoriteHorse, ModelFeedback,
)
from scraper import fetch_race_list, fetch_race_detail, fetch_odds, fetch_available_dates
from predictor import predict_race, train_from_feedback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Keiba AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_tables()
    asyncio.create_task(_odds_refresh_loop())


# ─── Race endpoints ───────────────────────────────────────────────

@app.get("/api/available-dates")
async def get_available_dates():
    """Return list of race dates currently shown on netkeiba."""
    try:
        dates = await fetch_available_dates()
        return {"dates": dates}
    except Exception as e:
        logger.warning(f"fetch_available_dates failed: {e}")
        return {"dates": []}


@app.get("/api/races")
async def get_races(date_str: Optional[str] = None, db: Session = Depends(get_db)):
    """
    date_str: YYYYMMDD  (defaults to today)
    Returns race list from DB (cached). If empty, scrapes and saves.
    """
    if not date_str:
        date_str = datetime.now().strftime("%Y%m%d")

    fmt_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    races = db.query(Race).filter(Race.date == fmt_date).all()

    if not races:
        try:
            scraped = await fetch_race_list(date_str)
            for r in scraped:
                race = Race(**r)
                db.merge(race)
            db.commit()
            races = db.query(Race).filter(Race.date == fmt_date).all()
        except Exception as e:
            logger.warning(f"Scraping failed: {e}")

    return [_race_to_dict(r) for r in sorted(races, key=lambda x: (x.venue, x.race_number))]


@app.get("/api/races/{race_id}")
async def get_race_detail(race_id: str, db: Session = Depends(get_db)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    horses = db.query(Horse).filter(Horse.race_id == race_id).order_by(Horse.predicted_rank).all()

    if not horses:
        # Scrape and predict
        try:
            detail = await fetch_race_detail(race_id)
            race.weather = detail["weather"]
            race.track_condition = detail["track_condition"]

            predicted = predict_race(detail["horses"])
            for h in predicted:
                horse = Horse(race_id=race_id, **{
                    k: v for k, v in h.items()
                    if k in Horse.__table__.columns.keys()
                })
                horse.odds_updated_at = datetime.now()
                db.add(horse)
            db.commit()
            horses = db.query(Horse).filter(Horse.race_id == race_id).order_by(Horse.predicted_rank).all()
        except Exception as e:
            logger.warning(f"Race detail scraping failed: {e}")

    return {
        **_race_to_dict(race),
        "horses": [_horse_to_dict(h) for h in horses],
    }


@app.post("/api/races/{race_id}/refresh-odds")
async def refresh_race_odds(race_id: str, db: Session = Depends(get_db)):
    await _update_odds(race_id, db)
    return {"status": "ok"}


# ─── Today's top predictions ──────────────────────────────────────

@app.get("/api/predictions/today")
async def get_today_predictions(db: Session = Depends(get_db)):
    """Return top value bets across all races today."""
    date_str = datetime.now().strftime("%Y%m%d")
    fmt_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

    races = db.query(Race).filter(Race.date == fmt_date).all()
    result = []
    for race in races:
        horses = db.query(Horse).filter(
            Horse.race_id == race.id,
            Horse.value_score > 0,
        ).order_by(Horse.value_score.desc()).limit(3).all()

        if horses:
            result.append({
                "race": _race_to_dict(race),
                "value_picks": [_horse_to_dict(h) for h in horses],
            })

    return result


# ─── Bet records ─────────────────────────────────────────────────

@app.get("/api/bets")
async def get_bets(db: Session = Depends(get_db)):
    bets = db.query(BetRecord).order_by(BetRecord.created_at.desc()).all()
    return [_bet_to_dict(b) for b in bets]


@app.post("/api/bets")
async def create_bet(payload: dict, background: BackgroundTasks, db: Session = Depends(get_db)):
    bet = BetRecord(
        race_id=payload.get("race_id", ""),
        race_name=payload.get("race_name", ""),
        race_date=payload.get("race_date", ""),
        bet_type=payload.get("bet_type", "単勝"),
        horse_names=payload.get("horse_names", ""),
        amount=payload.get("amount", 0),
        odds_at_bet=payload.get("odds_at_bet", 0.0),
        note=payload.get("note", ""),
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return _bet_to_dict(bet)


@app.patch("/api/bets/{bet_id}/result")
async def update_bet_result(
    bet_id: int,
    payload: dict,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    bet = db.query(BetRecord).filter(BetRecord.id == bet_id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    bet.result = payload.get("result")
    bet.payout = payload.get("payout", 0)
    db.commit()

    # Record feedback for model retraining
    background.add_task(_record_feedback_and_train, bet.race_id, payload, db)
    return _bet_to_dict(bet)


# ─── Favorite horses ──────────────────────────────────────────────

@app.get("/api/favorites")
async def get_favorites(db: Session = Depends(get_db)):
    favs = db.query(FavoriteHorse).all()
    return [{"id": f.id, "horse_id": f.horse_id, "name": f.name, "added_at": str(f.added_at)} for f in favs]


@app.post("/api/favorites")
async def add_favorite(payload: dict, db: Session = Depends(get_db)):
    existing = db.query(FavoriteHorse).filter(FavoriteHorse.horse_id == payload["horse_id"]).first()
    if existing:
        return {"id": existing.id, "horse_id": existing.horse_id, "name": existing.name}

    fav = FavoriteHorse(horse_id=payload["horse_id"], name=payload["name"])
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"id": fav.id, "horse_id": fav.horse_id, "name": fav.name}


@app.delete("/api/favorites/{horse_id}")
async def remove_favorite(horse_id: str, db: Session = Depends(get_db)):
    db.query(FavoriteHorse).filter(FavoriteHorse.horse_id == horse_id).delete()
    db.commit()
    return {"status": "ok"}


@app.get("/api/favorites/races")
async def get_favorite_races(db: Session = Depends(get_db)):
    """Return upcoming races for all favorited horses."""
    favs = db.query(FavoriteHorse).all()
    fav_ids = {f.horse_id for f in favs}

    today = datetime.now().strftime("%Y-%m-%d")
    horses = db.query(Horse).filter(Horse.horse_id.in_(fav_ids)).all()

    result = []
    for h in horses:
        race = db.query(Race).filter(Race.id == h.race_id, Race.date >= today).first()
        if race:
            result.append({"horse": _horse_to_dict(h), "race": _race_to_dict(race)})
    return result


# ─── Stats for MyPage ─────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    bets = db.query(BetRecord).all()
    total_bets = len(bets)
    total_amount = sum(b.amount for b in bets)
    total_payout = sum(b.payout or 0 for b in bets)
    wins = sum(1 for b in bets if b.result == "win")
    win_rate = wins / total_bets if total_bets > 0 else 0
    roi = (total_payout - total_amount) / total_amount if total_amount > 0 else 0

    return {
        "total_bets": total_bets,
        "wins": wins,
        "win_rate": round(win_rate * 100, 1),
        "total_amount": total_amount,
        "total_payout": total_payout,
        "profit_loss": total_payout - total_amount,
        "roi": round(roi * 100, 1),
    }


# ─── Background helpers ───────────────────────────────────────────

async def _odds_refresh_loop():
    """Update odds every hour for today's races."""
    while True:
        await asyncio.sleep(3600)
        db = next(get_db())
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            races = db.query(Race).filter(Race.date == today).all()
            for race in races:
                await _update_odds(race.id, db)
        except Exception as e:
            logger.error(f"Odds refresh error: {e}")
        finally:
            db.close()


async def _update_odds(race_id: str, db: Session):
    try:
        odds_map = await fetch_odds(race_id)
        horses = db.query(Horse).filter(Horse.race_id == race_id).all()
        for h in horses:
            key = str(h.number)
            if key in odds_map:
                h.odds_win = odds_map[key]
                h.odds_updated_at = datetime.now()
                # Recalculate value score
                if h.win_prob and h.odds_win:
                    h.value_score = round(h.win_prob * h.odds_win - 1.0, 3)
        db.commit()
    except Exception as e:
        logger.warning(f"Odds update failed for {race_id}: {e}")


async def _record_feedback_and_train(race_id: str, payload: dict, db: Session):
    try:
        horses = db.query(Horse).filter(Horse.race_id == race_id).all()
        for h in horses:
            fb = ModelFeedback(
                race_id=race_id,
                horse_id=h.horse_id,
                predicted_rank=h.predicted_rank,
                actual_rank=payload.get("actual_rank"),
                win_prob=h.win_prob,
                odds=h.odds_win,
            )
            db.add(fb)
        db.commit()

        records = db.query(ModelFeedback).all()
        feedback_list = [
            {
                "odds_win": r.odds,
                "win_prob": r.win_prob,
                "actual_rank": r.actual_rank,
            }
            for r in records if r.actual_rank is not None
        ]
        if train_from_feedback(feedback_list):
            logger.info("Model retrained successfully")
    except Exception as e:
        logger.error(f"Feedback recording failed: {e}")


# ─── AI Advisor ───────────────────────────────────────────────────

def _load_system_prompt() -> str:
    prompt_path = pathlib.Path(__file__).parent.parent / "docs" / "system_prompt.md"
    if prompt_path.exists():
        return prompt_path.read_text(encoding="utf-8")
    return "あなたは競馬予想トレーナーAIです。ユーザーの予想力向上をサポートしてください。"


@app.post("/api/ai-advisor/chat")
async def ai_advisor_chat(payload: dict):
    """
    payload: { messages: [{role, content}], race_context?: {...} }
    Returns streaming or single response from Claude.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY が設定されていません。.env ファイルに追加してください。"
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = _load_system_prompt()
        race_context = payload.get("race_context")
        if race_context:
            system_prompt += f"\n\n## 現在のレース情報\n{json.dumps(race_context, ensure_ascii=False, indent=2)}"

        messages = payload.get("messages", [])
        if not messages:
            raise HTTPException(status_code=400, detail="messages is required")

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
        return {"content": response.content[0].text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI advisor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Serializers ──────────────────────────────────────────────────

def _race_to_dict(r: Race) -> dict:
    return {
        "id": r.id,
        "date": r.date,
        "venue": r.venue,
        "race_number": r.race_number,
        "name": r.name,
        "distance": r.distance,
        "track_type": r.track_type,
        "weather": r.weather,
        "track_condition": r.track_condition,
        "start_time": r.start_time,
        "grade": r.grade,
    }


def _horse_to_dict(h: Horse) -> dict:
    return {
        "id": h.id,
        "horse_id": h.horse_id,
        "name": h.name,
        "number": h.number,
        "frame": h.frame,
        "sex": h.sex,
        "age": h.age,
        "weight": h.weight,
        "weight_diff": h.weight_diff,
        "jockey": h.jockey,
        "trainer": h.trainer,
        "bloodline_sire": h.bloodline_sire,
        "bloodline_dam": h.bloodline_dam,
        "odds_win": h.odds_win,
        "odds_place": h.odds_place,
        "odds_updated_at": str(h.odds_updated_at) if h.odds_updated_at else None,
        "win_prob": h.win_prob,
        "value_score": h.value_score,
        "predicted_rank": h.predicted_rank,
        "jockey_win_rate": h.jockey_win_rate,
        "trainer_win_rate": h.trainer_win_rate,
        "past_results": json.loads(h.past_results or "[]"),
    }


def _bet_to_dict(b: BetRecord) -> dict:
    return {
        "id": b.id,
        "race_id": b.race_id,
        "race_name": b.race_name,
        "race_date": b.race_date,
        "bet_type": b.bet_type,
        "horse_names": b.horse_names,
        "amount": b.amount,
        "odds_at_bet": b.odds_at_bet,
        "result": b.result,
        "payout": b.payout,
        "created_at": str(b.created_at),
        "note": b.note,
    }
