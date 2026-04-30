from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, List, Tuple, Optional
from ...data.schedule import GROUP_MATCHES, MATCH_DATES
from ...data.bracket.r16_to_final import BRACKET
from ...data.bracket.r32_skeleton import R32_MATCHES
from ...data.teams import TEAMS
from ...analysis.predictions import predict_match
from ...scraping.elo_scraper import refresh_elo_if_needed

router = APIRouter(prefix="/schedule", tags=["schedule"])

class MatchOverride(BaseModel):
    home_code: str
    away_code: str
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None

@router.get("/")
def get_schedule():
    """Genera la lista de 104 partidos con fechas simuladas"""
    matches = []
    
    # Obtener ELOs estáticos para las predicciones del frontend
    initial_elos = refresh_elo_if_needed(set(TEAMS.keys()), max_age_hours=999999)
    
    # Grupos (72 matches)
    # Jun 11 a Jun 27
    for i, (group, t1, t2) in enumerate(GROUP_MATCHES):
        m_id = i + 1
        m_date_info = MATCH_DATES.get(m_id, ("TBD", "TBD"))
        date_str = m_date_info[0] if isinstance(m_date_info, tuple) else m_date_info
        time_str = m_date_info[1] if isinstance(m_date_info, tuple) else "TBD"
        
        # Predicciones exactas
        hfa = 100.0 if getattr(t1, 'is_host', False) else (-100.0 if getattr(t2, 'is_host', False) else 0.0)
        elo_h = initial_elos.get(t1.code, 1500)
        elo_a = initial_elos.get(t2.code, 1500)
        preds = predict_match(elo_h, elo_a, hfa)
        preds["elo_home"] = elo_h
        preds["elo_away"] = elo_a
        
        matches.append({
            "id": m_id,
            "stage": f"Group {group}",
            "home": t1.code,
            "home_name": t1.name,
            "away": t2.code,
            "away_name": t2.name,
            "date": date_str,
            "time": time_str,
            "predictions": preds
        })
        
    # Knockouts (73 to 104)
    # First R32 (73 to 88)
    for m_id, data in R32_MATCHES.items():
        stage = "Round of 32"
        home_str = data["home"]
        away_str = data.get("away", "Wildcard")
        
        m_date_info = MATCH_DATES.get(m_id, ("TBD", "TBD"))
        date_str = m_date_info[0] if isinstance(m_date_info, tuple) else m_date_info
        time_str = m_date_info[1] if isinstance(m_date_info, tuple) else "TBD"
        
        matches.append({
            "id": m_id,
            "stage": stage,
            "home": f"Position {home_str}",
            "home_name": "-",
            "away": f"Position {away_str}",
            "away_name": "-",
            "date": date_str,
            "time": time_str,
            "predictions": None
        })

    # Then R16 to Final (89 to 104)
    for m_id, (h_ref, a_ref) in BRACKET.items():
        if 73 <= m_id <= 88: stage = "Round of 32"
        elif 89 <= m_id <= 96: stage = "Round of 16"
        elif 97 <= m_id <= 100: stage = "Quarter-Finals"
        elif 101 <= m_id <= 102: stage = "Semi-Finals"
        elif m_id == 103: stage = "Third Place"
        else: stage = "Final"
        
        m_date_info = MATCH_DATES.get(m_id, ("TBD", "TBD"))
        date_str = m_date_info[0] if isinstance(m_date_info, tuple) else m_date_info
        time_str = m_date_info[1] if isinstance(m_date_info, tuple) else "TBD"
        
        matches.append({
            "id": m_id,
            "stage": stage,
            "home": f"Winner {h_ref}",
            "home_name": "-",
            "away": f"Winner {a_ref}",
            "away_name": "-",
            "date": date_str,
            "time": time_str,
            "predictions": None
        })
        
    return {"matches": matches}

@router.get("/live_results")
def get_live_results(request: Request):
    """Devuelve los resultados inyectados manualmente o scrapeados"""
    # dict returned as list of objects for JSON serialization
    res = request.app.state.live_results
    return {"live_results": [{"home": h, "away": a, "gh": gh, "ga": ga} for (h, a), (gh, ga) in res.items()]}

@router.post("/live_results")
def set_live_result(override: MatchOverride, request: Request):
    """Fija el resultado manual de un partido, o lo borra si se envían nulos"""
    key = (override.home_code, override.away_code)
    key_rev = (override.away_code, override.home_code)
    
    if override.home_goals is None or override.away_goals is None:
        if key in request.app.state.live_results:
            del request.app.state.live_results[key]
        elif key_rev in request.app.state.live_results:
            del request.app.state.live_results[key_rev]
        return {"status": "ok", "message": "Live result cleared successfully"}
        
    request.app.state.live_results[key] = (override.home_goals, override.away_goals)
    return {"status": "ok", "message": "Live result overrided successfully"}

@router.post("/live_results/sync")
def sync_live_results_from_web(request: Request):
    """Simula o aplica el autoscrape. Por ahora un mock o llamada a scraper"""
    # request.app.state.live_results.update(...)
    return {"status": "ok", "message": "Scrape executed. 0 new matches synced (Future feature)."}
