import numpy as np
import pickle
import os
from typing import List, Dict, Any

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")


def _extract_features(horse: Dict[str, Any]) -> np.ndarray:
    odds = horse.get("odds_win", 10.0) or 10.0
    weight = horse.get("weight", 480.0) or 480.0
    weight_diff = horse.get("weight_diff", 0.0) or 0.0
    jockey_wr = horse.get("jockey_win_rate", 0.12) or 0.12
    trainer_wr = horse.get("trainer_win_rate", 0.10) or 0.10
    number = horse.get("number", 8) or 8
    frame = horse.get("frame", 4) or 4
    age = horse.get("age", 4) or 4

    return np.array([
        1.0 / odds,
        weight,
        weight_diff,
        jockey_wr,
        trainer_wr,
        number,
        frame,
        age,
    ], dtype=np.float32)


def predict_race(horses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns horses with win_prob, value_score, predicted_rank added.
    Uses LightGBM model if available, otherwise uses odds-based heuristic.
    """
    if not horses:
        return horses

    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            X = np.stack([_extract_features(h) for h in horses])
            probs = model.predict_proba(X)[:, 1]
        else:
            probs = _heuristic_probs(horses)
    except Exception:
        probs = _heuristic_probs(horses)

    # Normalize to sum to ~1
    total = probs.sum()
    if total > 0:
        probs = probs / total

    results = []
    for i, horse in enumerate(horses):
        odds = horse.get("odds_win", 10.0) or 10.0
        win_prob = float(probs[i])
        # Expected value: positive means "good bet"
        value_score = round(win_prob * odds - 1.0, 3)
        results.append({
            **horse,
            "win_prob": round(win_prob, 4),
            "value_score": value_score,
        })

    # Sort by predicted rank
    results.sort(key=lambda h: h["win_prob"], reverse=True)
    for rank, horse in enumerate(results, 1):
        horse["predicted_rank"] = rank

    return results


def _heuristic_probs(horses: List[Dict[str, Any]]) -> np.ndarray:
    """Odds-inverse heuristic with jockey/trainer adjustment."""
    probs = []
    for h in horses:
        odds = h.get("odds_win", 10.0) or 10.0
        jwr = h.get("jockey_win_rate", 0.12) or 0.12
        twr = h.get("trainer_win_rate", 0.10) or 0.10
        wdiff = h.get("weight_diff", 0.0) or 0.0

        base = 1.0 / odds
        # Small adjustments from jockey/trainer
        base *= (1 + (jwr - 0.12) * 0.5)
        base *= (1 + (twr - 0.10) * 0.3)
        # Penalize large weight gain
        if wdiff > 10:
            base *= 0.92
        elif wdiff < -10:
            base *= 0.95

        probs.append(max(base, 0.001))
    return np.array(probs, dtype=np.float32)


def train_from_feedback(feedback_records: list) -> bool:
    """
    Incrementally train model from user feedback.
    feedback_records: list of {features, actual_win (0 or 1)}
    """
    if len(feedback_records) < 20:
        return False

    try:
        import lightgbm as lgb
        from sklearn.model_selection import train_test_split

        X = np.stack([_extract_features(r) for r in feedback_records])
        y = np.array([1 if r.get("actual_rank") == 1 else 0 for r in feedback_records])

        if y.sum() == 0:
            return False

        model = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, random_state=42)
        model.fit(X, y)

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(model, f)
        return True
    except Exception:
        return False
