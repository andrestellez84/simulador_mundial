import json
from pathlib import Path
from typing import Dict, Set

# Función para cargar el anexo
_annex_c_cache = None

def load_annex_c() -> list[dict]:
    global _annex_c_cache
    if _annex_c_cache is None:
        path = Path(__file__).parent.parent / "data" / "bracket" / "annex_c.json"
        with open(path, "r") as f:
            _annex_c_cache = json.load(f)
    return _annex_c_cache

def resolve_r32_3rd_matchups(best_third_groups: Set[str]) -> Dict[str, str]:
    """
    best_third_groups: {'A','B','C','D','E','F','G','H'} (las 8 letras).
    Devuelve las asignaciones: {'1A': '3C', '1B': '3D', ...}
    """
    annex = load_annex_c()
    key = frozenset(best_third_groups)
    for entry in annex:
        if frozenset(entry["groups"]) == key:
            return entry["matchups"]
    
    raise ValueError(f"Combinacion no encontrada en el Anexo C oficial: {key}")

def build_r32_bracket(group_winners: Dict[str, str], runners_up: Dict[str, str], third_places: Dict[str, str]) -> Dict[int, tuple[str, str]]:
    """
    Toma los ganadores ("1A": "ARG"), segundos ("2A": "MEX"), y terceros ("3A": "COL").
    Construte el mapa id_partido -> (equipo_local_id, equipo_visitante_id).
    """
    from ..data.bracket.r32_skeleton import R32_MATCHES
    
    # Extraemos solo los grupos ('A', 'B', ...) de los 8 mejores terceros
    thirds_set = {k[-1] for k in third_places.keys()}
    
    # Obtenemos la resolución del anexo C
    resolved_wildcards = resolve_r32_3rd_matchups(thirds_set)
    
    final_matches = {}
    
    for match_id, match_data in R32_MATCHES.items():
        home_slot = match_data["home"]
        
        # Equipos Locales en R32 siempre son 1X o 2X fijos
        if home_slot in group_winners:
            home_team = group_winners[home_slot]
        else:
            home_team = runners_up[home_slot]
            
        if match_data["type"] == "fixed":
            away_slot = match_data["away"]
            if away_slot in group_winners:
                away_team = group_winners[away_slot]
            else:
                away_team = runners_up[away_slot]
        elif match_data["type"] == "wildcard":
            # El wildcard se resuelve de resolved_wildcards, donde las llaves son '1A', '1B', etc. (que casualmente es el home_slot)
            away_slot = resolved_wildcards[home_slot]
            away_team = third_places[away_slot]
        
        final_matches[match_id] = (home_team, away_team)
        
    return final_matches
