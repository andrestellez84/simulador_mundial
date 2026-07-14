from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from ...data.schedule import GROUP_MATCHES
from ...data.teams import TEAMS
from ...data.groups import GROUPS
from ...models.group import GroupStanding
from ...core.group_simulator import rank_group
from ...core.third_place_ranker import rank_third_places
from ...core.bracket_builder import build_r32_bracket

router = APIRouter(prefix="/standings", tags=["standings"])

class ActualStandingsRequest(BaseModel):
    live_results: Optional[Dict[str, List[int]]] = None

@router.post("/actual")
def get_actual_standings(request: Request, payload: ActualStandingsRequest = None):
    live_results = request.app.state.live_results
    if payload and payload.live_results is not None:
        custom_live = {}
        for k, v in payload.live_results.items():
            parts = k.split("-")
            if len(parts) == 2:
                custom_live[(parts[0], parts[1])] = v
        live_results = custom_live
    
    standings = {
        g_name: {
            team.code: GroupStanding(team=team) 
            for team in teams
        }
        for g_name, teams in GROUPS.items()
    }
    
    # Process only the matches that have live results
    for i, (group_name, team_h, team_a) in enumerate(GROUP_MATCHES):
        identifier = (team_h.code, team_a.code)
        identifier_rev = (team_a.code, team_h.code)
        
        g_h = g_a = None
        if identifier in live_results:
            g_h, g_a, *pw = live_results[identifier]
        elif identifier_rev in live_results:
            g_a, g_h, *pw = live_results[identifier_rev]
            
        if g_h is not None and g_a is not None:
            # Update Standings
            s_h = standings[group_name][team_h.code]
            s_a = standings[group_name][team_a.code]
            
            s_h.goals_for += g_h
            s_h.goals_against += g_a
            s_a.goals_for += g_a
            s_a.goals_against += g_h
            
            if g_h > g_a:
                s_h.points += 3
                s_h.wins += 1
                s_a.losses += 1
            elif g_h < g_a:
                s_a.points += 3
                s_a.wins += 1
                s_h.losses += 1
            else:
                s_h.points += 1
                s_a.points += 1
                s_h.draws += 1
                s_a.draws += 1
                
            s_h.h2h_results[team_a.code] = {
                "goals_for": g_h,
                "goals_against": g_a,
                "points": 3 if g_h > g_a else (1 if g_h == g_a else 0)
            }
            s_a.h2h_results[team_h.code] = {
                "goals_for": g_a,
                "goals_against": g_h,
                "points": 3 if g_a > g_h else (1 if g_a == g_h else 0)
            }

    ranked_groups = {}
    group_winners = {}
    runners_up = {}
    third_places = []
    
    for g_name, teams_dict in standings.items():
        team_list = list(teams_dict.values())
        ranked = rank_group(team_list)
        ranked_groups[g_name] = [s.model_dump() for s in ranked]
        
        group_winners[f"1{g_name}"] = ranked[0].team.code
        runners_up[f"2{g_name}"] = ranked[1].team.code
        third_places.append((g_name, ranked[2]))
        
    ranked_thirds = rank_third_places(third_places)
    best_thirds = {f"3{g}": s.team.code for g, s in ranked_thirds[:8]}
    
    r32_bracket = build_r32_bracket(group_winners, runners_up, best_thirds)
    
    # Propagar bracket con live_results
    actual_bracket = {k: list(v) for k, v in r32_bracket.items()}
    
    def advance_team(m_id: int):
        if m_id not in actual_bracket:
            return
        match_teams = actual_bracket[m_id]
        if not match_teams or len(match_teams) != 2:
            return
        t1, t2 = match_teams
        identifier = (t1, t2)
        identifier_rev = (t2, t1)
        
        gh = ga = None
        pw = None
        if identifier in live_results:
            gh, ga, *pw = live_results[identifier]
        elif identifier_rev in live_results:
            ga, gh, *pw = live_results[identifier_rev]
            
        if gh is not None and ga is not None:
            # En caso de empate en vivo asume penalties
            if gh > ga:
                winner = t1
                loser = t2
            elif ga > gh:
                winner = t2
                loser = t1
            else:
                if pw:
                    winner = pw[0]
                    loser = t2 if winner == t1 else t1
                else:
                    # Si hay empate en live_results sin penales, aún no avanzamos
                    return
            
            # Map next match
            next_map = {
                74: (89, 0), 77: (89, 1),
                73: (90, 0), 75: (90, 1),
                76: (91, 0), 78: (91, 1),
                79: (92, 0), 80: (92, 1),
                83: (93, 0), 84: (93, 1),
                81: (94, 0), 82: (94, 1),
                86: (95, 0), 88: (95, 1),
                85: (96, 0), 87: (96, 1),
                
                89: (97, 0), 90: (97, 1),
                93: (98, 0), 94: (98, 1),
                91: (99, 0), 92: (99, 1),
                95: (100, 0), 96: (100, 1),
                
                97: (101, 0), 98: (101, 1),
                99: (102, 0), 100: (102, 1),
                
                101: (104, 0), 102: (104, 1) # Final
            }
            if m_id in next_map:
                n_id, n_idx = next_map[m_id]
                if n_id not in actual_bracket:
                    actual_bracket[n_id] = ["", ""]
                actual_bracket[n_id][n_idx] = winner

            # Losers mapping for Semifinals to Third Place Match
            loser_map = {
                101: (103, 0),
                102: (103, 1)
            }
            if m_id in loser_map:
                n_id, n_idx = loser_map[m_id]
                if n_id not in actual_bracket:
                    actual_bracket[n_id] = ["", ""]
                actual_bracket[n_id][n_idx] = loser

    for m in range(73, 104):
        advance_team(m)
    
    return {
        "groups": ranked_groups,
        "third_places": [{**s.model_dump(), "group_name": g} for g, s in ranked_thirds],
        "r32_bracket": actual_bracket
    }
