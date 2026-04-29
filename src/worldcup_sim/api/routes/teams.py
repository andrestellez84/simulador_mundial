from fastapi import APIRouter
from ...data.teams import TEAMS
from ...scraping.elo_scraper import refresh_elo_if_needed

router = APIRouter(prefix="/teams", tags=["teams"])

@router.get("/")
def get_teams():
    """Retorna la lista de 48 equipos con sus confederaciones y ELO reales"""
    alive_teams = set(TEAMS.keys())
    elos = refresh_elo_if_needed(alive_teams, max_age_hours=24)
    data = []
    for code, elo in elos.items():
        t = TEAMS[code].model_dump()
        t["elo"] = elo
        data.append(t)
    return {"teams": data}
