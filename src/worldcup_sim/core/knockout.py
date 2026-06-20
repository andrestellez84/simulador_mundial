from typing import Dict, Tuple

from ..data.bracket.r16_to_final import BRACKET
from ..models.team import Team
from .match_simulator import simulate_match_exact, calculate_lambdas
from .extra_time import simulate_extra_time, simulate_penalties
from .elo import update_elo
from ..data.teams import TEAMS
from .home_advantage import get_net_hfa

def simulate_knockout_match(
    match_id: int,
    home_code: str, 
    away_code: str, 
    elo_dict: Dict[str, float],
    live_results: Dict = None
) -> Tuple[str, str, Dict[str, float]]:
    """
    Simula un partido de eliminatoria garantizando un ganador.
    Actualiza el elo_dict in-place.
    Retorna (winner_code, loser_code, elo_dict)
    """
    if live_results is None:
        live_results = {}
        
    home_elo = elo_dict[home_code]
    away_elo = elo_dict[away_code]
    
    match_tuple = (home_code, away_code)
    match_tuple_rev = (away_code, home_code)
    
    net_hfa = get_net_hfa(match_id, home_code, away_code)
    lam_h, lam_a = calculate_lambdas(home_elo, away_elo, kwargs_hfa=net_hfa)
    
    if match_tuple in live_results:
        g_h, g_a = live_results[match_tuple]
    elif match_tuple_rev in live_results:
        g_a, g_h = live_results[match_tuple_rev]
    else:
        g_h, g_a = simulate_match_exact(lam_h, lam_a)
    
    home_win_penalties = None
    
    if g_h == g_a:
        # Extra time
        et_h, et_a = simulate_extra_time(lam_h, lam_a)
        g_h += et_h
        g_a += et_a
        
        if g_h == g_a:
            # Penalties
            winner_side = simulate_penalties(home_elo, away_elo)
            if winner_side == "home":
                home_win_penalties = True
            else:
                home_win_penalties = False
                
    # Determinar ganador
    if g_h > g_a or home_win_penalties is True:
        winner = home_code
        loser = away_code
        # Para el factor G en empates con penales, la diferencia de goles para formula ELO puede contarse como 1
        w_h, w_a = 1.0, 0.0
        g_h_eff, g_a_eff = (g_h + 1, g_a) if home_win_penalties is True else (g_h, g_a)
    else:
        winner = away_code
        loser = home_code
        w_h, w_a = 0.0, 1.0
        g_h_eff, g_a_eff = (g_h, g_a + 1) if home_win_penalties is False else (g_h, g_a)
        
    # Update ELO (K=60)
    net_hfa = get_net_hfa(match_id, home_code, away_code)
    new_home_elo, new_away_elo = update_elo(
        home_elo, away_elo, 
        goals_home=g_h_eff, goals_away=g_a_eff, 
        hfa=net_hfa, k=60
    )
    
    elo_dict[home_code] = new_home_elo
    elo_dict[away_code] = new_away_elo
    
    return winner, loser, elo_dict

def get_knockout_round_name(match_id: int) -> str:
    if 73 <= match_id <= 88: return "R32"
    if 89 <= match_id <= 96: return "R16"
    if 97 <= match_id <= 100: return "QF"
    if 101 <= match_id <= 102: return "SF"
    if match_id == 103: return "3rd Place"
    if match_id == 104: return "Final"
    return "Unknown"

def simulate_knockout_stage(r32_matches: Dict[int, Tuple[str, str]], elo_dict: Dict[str, float], live_results: Dict):
    """
    Toma los partidos de la R32 y los simula hasta la final (y tercer puesto).
    Retorna resultados, brackets avanzados y el grafo de oponentes.
    """
    
    # Progreso de torneos: match_id -> winner_code
    match_winners = {}
    match_losers = {}
    knockout_matchups = {}
    opponents_graph = {code: {} for code in TEAMS.keys()}
    elo_hist_updates = {code: [] for code in TEAMS.keys()}
    
    # 1. Rondas de R32
    for match_id, (home_code, away_code) in r32_matches.items():
        rnd = get_knockout_round_name(match_id)
        opponents_graph[home_code][rnd] = away_code
        opponents_graph[away_code][rnd] = home_code
        
        winner, loser, elo_dict = simulate_knockout_match(match_id, home_code, away_code, elo_dict, live_results)
        knockout_matchups[match_id] = (home_code, away_code)
        elo_hist_updates[home_code].append(elo_dict[home_code])
        elo_hist_updates[away_code].append(elo_dict[away_code])
        match_winners[match_id] = winner
        match_losers[match_id] = loser
        
    # 2. Las demás rondas se alimentan del BRACKET determinístico
    ordered_matches = sorted(BRACKET.keys())
    
    for match_id in ordered_matches:
        home_ref, away_ref = BRACKET[match_id]
        
        if match_id == 103:
            home_code = match_losers[101]
            away_code = match_losers[102]
        else:
            home_code = match_winners[home_ref]
            away_code = match_winners[away_ref]
            
        rnd = get_knockout_round_name(match_id)
        opponents_graph[home_code][rnd] = away_code
        opponents_graph[away_code][rnd] = home_code
            
        winner, loser, elo_dict = simulate_knockout_match(match_id, home_code, away_code, elo_dict, live_results)
        knockout_matchups[match_id] = (home_code, away_code)
        elo_hist_updates[home_code].append(elo_dict[home_code])
        elo_hist_updates[away_code].append(elo_dict[away_code])
        match_winners[match_id] = winner
        match_losers[match_id] = loser
        
    return match_winners, match_losers, elo_dict, opponents_graph, elo_hist_updates, knockout_matchups
