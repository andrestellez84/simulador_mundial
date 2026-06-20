from ..data.schedule import MATCH_VENUES
from ..data.venues_hfa import HFA_DATA, VENUE_STR_TO_KEY

def get_net_hfa(match_id: int, home_code: str, away_code: str) -> float:
    """
    Calcula la diferencia neta de Home Field Advantage (HFA) en puntos ELO
    usando la base de datos JSON de diásporas y estadios.
    Retorna hfa_home - hfa_away.
    """
    venue_str = MATCH_VENUES.get(match_id)
    if not venue_str:
        return 0.0
        
    venue_key = VENUE_STR_TO_KEY.get(venue_str)
    if not venue_key or venue_key not in HFA_DATA:
        return 0.0
        
    adv_dict = HFA_DATA[venue_key]["advantages"]
    
    hfa_home = adv_dict.get(home_code, 0.0)
    hfa_away = adv_dict.get(away_code, 0.0)
    
    return float(hfa_home - hfa_away)

def get_raw_hfa(match_id: int, team_code: str) -> float:
    """
    Retorna la ventaja pura de ELO para un equipo en un estadio.
    """
    venue_str = MATCH_VENUES.get(match_id)
    if not venue_str: return 0.0
    venue_key = VENUE_STR_TO_KEY.get(venue_str)
    if not venue_key or venue_key not in HFA_DATA: return 0.0
    
    return float(HFA_DATA[venue_key]["advantages"].get(team_code, 0.0))
