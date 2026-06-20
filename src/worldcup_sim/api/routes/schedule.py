from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, List, Tuple, Optional
from ...data.schedule import GROUP_MATCHES, MATCH_DATES, MATCH_VENUES
from ...data.bracket.r16_to_final import BRACKET
from ...data.bracket.r32_skeleton import R32_MATCHES
from ...data.teams import TEAMS
from ...analysis.predictions import predict_match
from ...scraping.elo_scraper import refresh_elo_if_needed
from ...core.home_advantage import get_raw_hfa
from ...core.elo import expected_score

router = APIRouter(prefix="/schedule", tags=["schedule"])

class MatchOverride(BaseModel):
    home_code: str
    away_code: str
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None

@router.get("/")
def get_schedule(request: Request):
    """Genera la lista de 104 partidos con fechas simuladas"""
    matches = []
    
    live_results = request.app.state.live_results
    
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
        raw_hfa_h = get_raw_hfa(m_id, t1.code)
        raw_hfa_a = get_raw_hfa(m_id, t2.code)
        net_hfa = raw_hfa_h - raw_hfa_a
        
        elo_h = initial_elos.get(t1.code, 1500)
        elo_a = initial_elos.get(t2.code, 1500)
        preds = predict_match(elo_h, elo_a, net_hfa)
        preds["elo_home"] = elo_h
        preds["elo_away"] = elo_a
        preds["extra_elo_home"] = raw_hfa_h
        preds["extra_elo_away"] = raw_hfa_a
        
        result_data = None
        gh = ga = None
        if (t1.code, t2.code) in live_results:
            gh, ga = live_results[(t1.code, t2.code)]
        elif (t2.code, t1.code) in live_results:
            ga, gh = live_results[(t2.code, t1.code)]
            
        if gh is not None and ga is not None:
            w_e_home = expected_score(elo_h, elo_a, net_hfa)
            if gh > ga:
                w_home = 1.0
            elif gh < ga:
                w_home = 0.0
            else:
                w_home = 0.5
                
            if w_home > w_e_home:
                surprise = 1.0 - w_e_home
                surpriser = t1.code
            elif w_home < w_e_home:
                surprise = w_e_home
                surpriser = t2.code
            else:
                surprise = 0.5
                surpriser = None
                
            result_data = {
                "gh": gh,
                "ga": ga,
                "surprise": surprise,
                "surpriser": surpriser
            }
        
        matches.append({
            "id": m_id,
            "stage": f"Group {group}",
            "home": t1.code,
            "home_name": t1.name,
            "away": t2.code,
            "away_name": t2.name,
            "date": date_str,
            "time": time_str,
            "venue": MATCH_VENUES.get(m_id, "TBD"),
            "predictions": preds,
            "result": result_data
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
            "venue": MATCH_VENUES.get(m_id, "TBD"),
            "predictions": None,
            "result": None
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
            "venue": MATCH_VENUES.get(m_id, "TBD"),
            "predictions": None
        })
        
    return {"matches": matches}

@router.get("/live_results")
def get_live_results(request: Request):
    """Devuelve los resultados inyectados manualmente o scrapeados"""
    # dict returned as list of objects for JSON serialization
    res = request.app.state.live_results
    return {"live_results": [{"home": h, "away": a, "gh": gh, "ga": ga} for (h, a), (gh, ga) in res.items()]}

from ...data.live_results_store import save_live_results

@router.post("/live_results")
def set_live_result(override: MatchOverride, request: Request):
    """Fija el resultado manual de un partido, o lo borra si se envían nulos"""
    key = (override.home_code, override.away_code)
    key_rev = (override.away_code, override.home_code)
    
    if override.home_goals is None or override.away_goals is None:
        modified = False
        if key in request.app.state.live_results:
            del request.app.state.live_results[key]
            modified = True
        elif key_rev in request.app.state.live_results:
            del request.app.state.live_results[key_rev]
            modified = True
        
        if modified:
            save_live_results(request.app.state.live_results)
            
        return {"status": "ok", "message": "Live result cleared successfully"}
        
    request.app.state.live_results[key] = (override.home_goals, override.away_goals)
    save_live_results(request.app.state.live_results)
    
    return {"status": "ok", "message": "Live result overrided successfully"}

@router.post("/live_results/sync")
def sync_live_results_from_web(request: Request):
    """Actualiza los resultados obtenidos desde eloratings.net/latest.tsv y actualiza el ELO"""
    from ...scraping.elo_scraper import scrape_latest_results
    
    # Forzar actualización de ELO
    refresh_elo_if_needed(set(TEAMS.keys()), max_age_hours=0)
    
    latest_results = scrape_latest_results()
    if not latest_results:
        return {"status": "error", "message": "Failed to scrape results from eloratings.net, but ELO might have been updated."}
        
    count = 0
    for (home, away), (gh, ga) in latest_results.items():
        key = (home, away)
        key_rev = (away, home)
        # Always use the orientation from eloratings, or update if we had it reverse
        if key_rev in request.app.state.live_results:
            del request.app.state.live_results[key_rev]
        request.app.state.live_results[key] = (gh, ga)
        count += 1
        
    if count > 0:
        save_live_results(request.app.state.live_results)
        
    return {"status": "ok", "message": f"Scrape executed. {count} matches synced."}
