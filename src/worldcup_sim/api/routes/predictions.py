from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional

from ...analysis.predictions import predict_match
from ...scraping.elo_cache import load_cache

router = APIRouter(prefix="/predictions", tags=["predictions"])

class MatchPredictionRequest(BaseModel):
    home_code: str
    away_code: str
    hfa: float = 0.0
    rho: float = -0.1

class MatchPredictionResponse(BaseModel):
    home_code: str
    away_code: str
    home_elo: float
    away_elo: float
    win_prob: float
    draw_prob: float
    loss_prob: float
    top_scores: List[Dict]

@router.post("/", response_model=MatchPredictionResponse)
def get_match_prediction(req: MatchPredictionRequest):
    cached = load_cache()
    # Fallback to 1500 si no exite en cache
    elo_h = cached.get(req.home_code, [1500])[0]
    elo_a = cached.get(req.away_code, [1500])[0]
    
    probs = predict_match(elo_h, elo_a, req.hfa, req.rho)
    
    return MatchPredictionResponse(
        home_code=req.home_code,
        away_code=req.away_code,
        home_elo=elo_h,
        away_elo=elo_a,
        win_prob=probs["p_home"],
        draw_prob=probs["p_draw"],
        loss_prob=probs["p_away"],
        top_scores=probs["top_scores"]
    )
