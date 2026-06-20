from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Tuple

from ..models.results import TournamentResult
from collections import Counter

class TeamAggregate(BaseModel):
    team_code: str
    group: str = "" # Set later if needed
    
    # Probabilities
    group_position_probs: Dict[str, float] = {"1st": 0.0, "2nd": 0.0, "3rd": 0.0, "4th": 0.0}
    advance_to_r32: float = 0.0
    advance_to_r16: float = 0.0
    advance_to_qf: float = 0.0
    advance_to_sf: float = 0.0
    advance_to_final: float = 0.0
    champion: float = 0.0
    
    expected_points_group: float = 0.0
    expected_goals_for_group: float = 0.0
    expected_goals_against_group: float = 0.0
    expected_wins_group: float = 0.0
    expected_draws_group: float = 0.0
    expected_losses_group: float = 0.0
    elo_history_bands: Dict[str, List[float]] = {"p10": [], "median": [], "p90": []}
    rank_history_bands: Dict[str, List[float]] = {"p10": [], "median": [], "p90": []}
    most_likely_opponents: Dict[str, List[Dict[str, float | str]]] = {}
    
    # Internal raw counters
    _raw_counters: dict = {}
    _opponents_counter: dict = {}
    _elo_matrices: list = []
    _rank_matrices: list = []
    model_config = ConfigDict(extra='allow')

class AggregatedResults(BaseModel):
    n_simulations: int
    teams: Dict[str, TeamAggregate]
    # Nuevo: Modal Bracket (Árbol 104 partidos)
    modal_bracket: Dict[int, Tuple[str, str]] = {}
    most_likely_final: List[Dict[str, str | float]]
    
def aggregate_tournament_results(results: List[TournamentResult], n_sims: int) -> AggregatedResults:
    """
    Toma una lista de raw TournamentResult (o una versión de contadores si se map-reduce) 
    y computa la estructura AggregateResults con probabilidades en base 1.0.
    """
    # Inicializar estructua
    from ..data.teams import TEAMS
    from ..data.groups import GROUPS
    from collections import Counter
    
    aggs = {code: TeamAggregate(team_code=code) for code in TEAMS.keys()}
    
    # Trackers extra para modal bracket
    matchups_counter = {match_id: Counter() for match_id in range(73, 105)}
    
    for code in TEAMS.keys():
        t_agg = aggs[code]
        # Find group
        for g_name, g_teams in GROUPS.items():
            if code in [t.code for t in g_teams]:
                t_agg.group = g_name
                break
                
        t_agg._raw_counters = {
            "1st": 0, "2nd": 0, "3rd": 0, "4th": 0,
            "r32": 0, "r16": 0, "qf": 0, "sf": 0, "final": 0, "champ": 0,
            "pts": 0, "gf": 0, "ga": 0, "wins": 0, "draws": 0, "losses": 0
        }
        t_agg._opponents_counter = {"R32": Counter(), "R16": Counter(), "QF": Counter(), "SF": Counter(), "3rd Place": Counter(), "Final": Counter()}
        t_agg._elo_matrices = [[] for _ in range(9)]
        t_agg._rank_matrices = [[] for _ in range(9)]
        
    final_matchups_counter = {}

    for res in results:
        # Sumar a las finales comunes
        teams_final = tuple(sorted([res.champion, res.runner_up]))
        final_matchups_counter[teams_final] = final_matchups_counter.get(teams_final, 0) + 1
        
        # Aggregation del bracket
        for match_id, (home, away) in res.knockout_matchups.items():
            # Keep original home/away order for R32 to preserve bracket slot associations
            pair = (home, away)
            matchups_counter[match_id][pair] += 1
        
        for code, t_res in res.team_results.items():
            raw = aggs[code]._raw_counters
            
            p = t_res.group_position
            if p == 1: raw["1st"] += 1
            elif p == 2: raw["2nd"] += 1
            elif p == 3: raw["3rd"] += 1
            elif p == 4: raw["4th"] += 1
            
            if t_res.reached_r32: raw["r32"] += 1
            if t_res.reached_r16: raw["r16"] += 1
            if t_res.reached_qf: raw["qf"] += 1
            if t_res.reached_sf: raw["sf"] += 1
            if t_res.reached_final: raw["final"] += 1
            if t_res.is_champion: raw["champ"] += 1
            
            raw["pts"] += t_res.points
            raw["wins"] += t_res.group_wins
            raw["draws"] += t_res.group_draws
            raw["losses"] += t_res.group_losses
            raw["gf"] += t_res.group_gf
            raw["ga"] += t_res.group_ga
            
            for i, elo in enumerate(t_res.match_elos[:9]):
                aggs[code]._elo_matrices[i].append(elo)
                
            for rnd, opp in t_res.opponents.items():
                aggs[code]._opponents_counter[rnd][opp] += 1
                
        # Calculate ranks for this simulation across 9 stages
        for i in range(9):
            stage_elos = [(code, t_res.match_elos[i] if i < len(t_res.match_elos) else 0) for code, t_res in res.team_results.items()]
            stage_elos.sort(key=lambda x: x[1], reverse=True)
            for rank, (code, _) in enumerate(stage_elos, start=1):
                aggs[code]._rank_matrices[i].append(rank)

    # Build final probabilities structure
    for code, agg in aggs.items():
        raw = agg._raw_counters
        agg.group_position_probs = {
            "1st": raw["1st"] / n_sims,
            "2nd": raw["2nd"] / n_sims,
            "3rd": raw["3rd"] / n_sims,
            "4th": raw["4th"] / n_sims,
        }
        agg.advance_to_r32 = raw["r32"] / n_sims
        agg.advance_to_r16 = raw["r16"] / n_sims
        agg.advance_to_qf = raw["qf"] / n_sims
        agg.advance_to_sf = raw["sf"] / n_sims
        agg.advance_to_final = raw["final"] / n_sims
        agg.champion = raw["champ"] / n_sims
        agg.expected_points_group = raw["pts"] / n_sims
        agg.expected_wins_group = raw["wins"] / n_sims
        agg.expected_draws_group = raw["draws"] / n_sims
        agg.expected_losses_group = raw["losses"] / n_sims
        agg.expected_goals_for_group = raw["gf"] / n_sims
        agg.expected_goals_against_group = raw["ga"] / n_sims
        
        agg.elo_history_bands = {"p10": [], "median": [], "p90": []}
        for step_arr in agg._elo_matrices:
            if step_arr:
                step_arr.sort()
                m = len(step_arr)
                agg.elo_history_bands["p10"].append(step_arr[int(m * 0.1)])
                agg.elo_history_bands["median"].append(step_arr[int(m * 0.5)])
                agg.elo_history_bands["p90"].append(step_arr[int(m * 0.9)])
                
        agg.rank_history_bands = {"p10": [], "median": [], "p90": []}
        for step_arr in agg._rank_matrices:
            if step_arr:
                step_arr.sort()
                m = len(step_arr)
                agg.rank_history_bands["p10"].append(step_arr[int(m * 0.1)])
                agg.rank_history_bands["median"].append(step_arr[int(m * 0.5)])
                agg.rank_history_bands["p90"].append(step_arr[int(m * 0.9)])
        
        for rnd, counter in agg._opponents_counter.items():
            if counter:
                agg.most_likely_opponents[rnd] = [{"code": opp, "prob": c / n_sims} for opp, c in counter.most_common(3)]
        
    # Top finals
    sorted_finals = sorted(final_matchups_counter.items(), key=lambda x: x[1], reverse=True)
    top_finals_res = []
    
    for (t1, t2), count in sorted_finals[:10]:
        name1 = TEAMS[t1].name
        name2 = TEAMS[t2].name
        top_finals_res.append({
            "matchup": f"{name1} vs {name2}",
            "probability": count / n_sims
        })
        
    res = AggregatedResults(
        n_simulations=n_sims,
        teams=aggs,
        most_likely_final=top_finals_res
    )
    
    # Calcular Consistent Modal Bracket (Forward-Propagation)
    from ..core.bracket_builder import build_r32_bracket
    from ..data.bracket.r16_to_final import BRACKET
    from ..data.groups import GROUPS
    
    # 1. Determinar ganadores y segundos modales por grupo
    group_winners = {}
    runners_up = {}
    third_candidates = []
    
    for g_name, g_teams in GROUPS.items():
        g_codes = [t.code for t in g_teams]
        # Sort by 1st place probability
        g_codes.sort(key=lambda c: res.teams[c].group_position_probs["1st"], reverse=True)
        winner = g_codes[0]
        group_winners[f"1{g_name}"] = winner
        
        # Sort remaining by 2nd place probability
        rem = [c for c in g_codes if c != winner]
        rem.sort(key=lambda c: res.teams[c].group_position_probs["2nd"], reverse=True)
        runner = rem[0]
        runners_up[f"2{g_name}"] = runner
        
        # Third candidates
        rem2 = [c for c in rem if c != runner]
        rem2.sort(key=lambda c: res.teams[c].group_position_probs["3rd"], reverse=True)
        third = rem2[0]
        third_candidates.append((f"3{g_name}", third))
        
    # Sort thirds by advance_to_r32
    third_candidates.sort(key=lambda x: res.teams[x[1]].advance_to_r32, reverse=True)
    third_places = {slot: code for slot, code in third_candidates[:8]}
    
    # 2. Construir R32
    r32_matches = build_r32_bracket(group_winners, runners_up, third_places)
    
    for m_id, pair in r32_matches.items():
        res.modal_bracket[m_id] = pair
        
    # 3. Propagar R16 -> Final
    winners = {}
    
    def get_advancer(current_pair, target_metric):
        t1, t2 = current_pair
        val1 = getattr(res.teams[t1], target_metric)
        val2 = getattr(res.teams[t2], target_metric)
        return t1 if val1 > val2 else t2

    for m_id in range(73, 89):
        winners[m_id] = get_advancer(res.modal_bracket[m_id], "advance_to_r16")
        
    for m_id in range(89, 97):
        w1_id, w2_id = BRACKET[m_id]
        t1, t2 = winners[w1_id], winners[w2_id]
        res.modal_bracket[m_id] = (t1, t2)
        winners[m_id] = get_advancer((t1, t2), "advance_to_qf")
        
    for m_id in range(97, 101):
        w1_id, w2_id = BRACKET[m_id]
        t1, t2 = winners[w1_id], winners[w2_id]
        res.modal_bracket[m_id] = (t1, t2)
        winners[m_id] = get_advancer((t1, t2), "advance_to_sf")
        
    for m_id in range(101, 103):
        w1_id, w2_id = BRACKET[m_id]
        t1, t2 = winners[w1_id], winners[w2_id]
        res.modal_bracket[m_id] = (t1, t2)
        winners[m_id] = get_advancer((t1, t2), "advance_to_final")
        
    loser_101 = res.modal_bracket[101][0] if winners[101] == res.modal_bracket[101][1] else res.modal_bracket[101][1]
    loser_102 = res.modal_bracket[102][0] if winners[102] == res.modal_bracket[102][1] else res.modal_bracket[102][1]
    res.modal_bracket[103] = (loser_101, loser_102)
    
    t1, t2 = winners[101], winners[102]
    res.modal_bracket[104] = (t1, t2)
            
    return res
