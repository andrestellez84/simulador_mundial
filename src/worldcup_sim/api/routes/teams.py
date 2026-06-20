from fastapi import APIRouter
from pydantic import BaseModel
from ...data.teams import TEAMS
from ...scraping.elo_scraper import refresh_elo_if_needed
from ...data.manual_elo_store import load_manual_elos, save_manual_elos

class ManualEloRequest(BaseModel):
    team_code: str
    elo: float | None = None # Si es None, se borra el override

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

@router.get("/manual_elo")
def get_manual_elo():
    """Retorna los ELOs manuales actuales"""
    return {"manual_elos": load_manual_elos()}

@router.post("/manual_elo")
def set_manual_elo(req: ManualEloRequest):
    """Actualiza o borra un ELO manual"""
    elos = load_manual_elos()
    if req.elo is None:
        if req.team_code in elos:
            del elos[req.team_code]
    else:
        elos[req.team_code] = req.elo
        
    save_manual_elos(elos)
    return {"message": "Manual ELO updated", "manual_elos": elos}
