import random
from typing import List, Dict
from collections import defaultdict

from ..models.group import GroupStanding
from ..models.team import Team

def rank_group(standings: List[GroupStanding]) -> List[GroupStanding]:
    """
    Ordena las posiciones del grupo según las reglas FIFA 2026:
    1. Puntos
    2. Puntos H2H (Enfrentamientos directos entre empatados)
    3. Diferencia de goles H2H
    4. Goles a favor H2H
    5. Diferencia de goles general
    6. Goles a favor general
    7. Fair Play / Ranking FIFA (ELO como proxy)
    8. Sorteo
    """
    groups_by_pts = defaultdict(list)
    for s in standings:
        groups_by_pts[s.points].append(s)
        
    ranked = []
    
    # Process from highest points to lowest
    for pts in sorted(groups_by_pts.keys(), reverse=True):
        tied_teams = groups_by_pts[pts]
        if len(tied_teams) == 1:
            ranked.append(tied_teams[0])
        else:
            # Tiebreaker needed
            tied_codes = set(s.team.code for s in tied_teams)
            
            def tiebreak_key(s: GroupStanding):
                h2h_pts = 0
                h2h_gf = 0
                h2h_ga = 0
                
                for opp_code, res in s.h2h_results.items():
                    if opp_code in tied_codes:
                        h2h_pts += res["points"]
                        h2h_gf += res["goals_for"]
                        h2h_ga += res["goals_against"]
                        
                h2h_gd = h2h_gf - h2h_ga
                
                return (
                    h2h_pts,
                    h2h_gd,
                    h2h_gf,
                    s.goal_diff,
                    s.goals_for,
                    s.initial_elo,
                    random.random()
                )
            
            tied_teams.sort(key=tiebreak_key, reverse=True)
            ranked.extend(tied_teams)
            
    return ranked
