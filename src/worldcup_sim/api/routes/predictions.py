from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional

from ...analysis.predictions import predict_match
from ...scraping.elo_cache import load_cache
from ...core.home_advantage import get_raw_hfa

router = APIRouter(prefix="/predictions", tags=["predictions"])

class MatchPredictionRequest(BaseModel):
    home_code: str
    away_code: str
    match_id: Optional[int] = None
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
    extra_elo_home: float = 0.0
    extra_elo_away: float = 0.0

@router.post("/", response_model=MatchPredictionResponse)
def get_match_prediction(req: MatchPredictionRequest):
    cached = load_cache()
    # Fallback to 1500 si no exite en cache
    elo_h = cached.get(req.home_code, [1500])[0]
    elo_a = cached.get(req.away_code, [1500])[0]
    
    extra_h = 0.0
    extra_a = 0.0
    net_hfa = req.hfa
    
    if req.match_id:
        extra_h = get_raw_hfa(req.match_id, req.home_code)
        extra_a = get_raw_hfa(req.match_id, req.away_code)
        net_hfa = extra_h - extra_a
    
    probs = predict_match(elo_h, elo_a, net_hfa, req.rho)
    
    return MatchPredictionResponse(
        home_code=req.home_code,
        away_code=req.away_code,
        home_elo=elo_h,
        away_elo=elo_a,
        win_prob=probs["p_home"],
        draw_prob=probs["p_draw"],
        loss_prob=probs["p_away"],
        top_scores=probs["top_scores"],
        extra_elo_home=extra_h,
        extra_elo_away=extra_a
    )
