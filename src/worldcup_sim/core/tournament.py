from typing import Dict
import copy

from ..data.teams import TEAMS
from ..data.groups import GROUPS
from ..data.schedule import GROUP_MATCHES
from ..models.group import GroupStanding
from ..models.results import TournamentResult, TeamResult
from .match_simulator import simulate_match_exact, calculate_lambdas
from .elo import update_elo
from .group_simulator import rank_group
from .third_place_ranker import rank_third_places
from .bracket_builder import build_r32_bracket
from .knockout import simulate_knockout_stage

class WorldCupSimulation:
    """Clase principal orquestadora de un mundial"""

    def __init__(self, initial_elos: Dict[str, float], live_results: Dict[tuple[str, str], tuple[int, int]] = None):
        self.initial_elos = copy.deepcopy(initial_elos)
        self.current_elos = copy.deepcopy(initial_elos)
        self.elo_history = {code: [initial_elos[code]] for code in TEAMS.keys()}
        
        self.live_results = live_results or {}
        
        # Resultados agregados
        self.results = {code: TeamResult(team_code=code) for code in TEAMS.keys()}
        
        self.standings = {
            g_name: {
                team.code: GroupStanding(team=team, initial_elo=initial_elos[team.code]) 
                for team in teams
            }
            for g_name, teams in GROUPS.items()
        }

    def simulate(self) -> TournamentResult:
        # 1. Fase de Grupos
        for group_name, team_h, team_a in GROUP_MATCHES:
            e_h = self.current_elos[team_h.code]
            e_a = self.current_elos[team_a.code]
            
            identifier = (team_h.code, team_a.code)
            if identifier in self.live_results:
                g_h, g_a = self.live_results[identifier]
            else:
                lam_h, lam_a = calculate_lambdas(e_h, e_a, kwargs_hfa=0.0)
                g_h, g_a = simulate_match_exact(lam_h, lam_a)
            
            # Update Standings
            s_h = self.standings[group_name][team_h.code]
            s_a = self.standings[group_name][team_a.code]
            
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
                
            # Update ELO
            n_e_h, n_e_a = update_elo(e_h, e_a, g_h, g_a)
            self.current_elos[team_h.code] = n_e_h
            self.current_elos[team_a.code] = n_e_a
            
            self.elo_history[team_h.code].append(n_e_h)
            self.elo_history[team_a.code].append(n_e_a)

        # 2. Ranking de Grupos -> Clasificados
        group_winners = {}
        runners_up = {}
        third_places_pool = []
        
        for group_name, teams_dict in self.standings.items():
            ranked = rank_group(list(teams_dict.values()))
            
            # Registro
            for i, st in enumerate(ranked):
                self.results[st.team.code].group_position = i + 1
                self.results[st.team.code].points = st.points
                self.results[st.team.code].group_wins = st.wins
                self.results[st.team.code].group_draws = st.draws
                self.results[st.team.code].group_losses = st.losses
                self.results[st.team.code].group_gf = st.goals_for
                self.results[st.team.code].group_ga = st.goals_against

            group_winners[f"1{group_name}"] = ranked[0].team.code
            runners_up[f"2{group_name}"] = ranked[1].team.code
            third_places_pool.append((group_name, ranked[2]))
            
            # Update results
            self.results[ranked[0].team.code].reached_r32 = True
            self.results[ranked[1].team.code].reached_r32 = True

        # 3. Mejores Terceros
        ranked_thirds = rank_third_places(third_places_pool)
        best_thirds = {}
        for (g_name, st) in ranked_thirds[:8]:
            best_thirds[f"3{g_name}"] = st.team.code
            self.results[st.team.code].reached_r32 = True

        # 4. Construcción del R32 Bracket
        r32_bracket = build_r32_bracket(group_winners, runners_up, best_thirds)
        
        # 5. Knockout Stage
        winners, losers, final_elos, opp_graph, elo_hist_updates, knockout_matchups = simulate_knockout_stage(r32_bracket, self.current_elos, self.live_results)
        self.current_elos = final_elos
        
        for code, hist_tail in elo_hist_updates.items():
            self.elo_history[code].extend(hist_tail)
        
        # Forward fill up to 9 (0: Initial, 1,2,3: Groups, 4:R32, 5:R16, 6:QF, 7:SF, 8:F)
        for code in TEAMS.keys():
            hist = self.elo_history[code]
            while len(hist) < 9:
                hist.append(hist[-1])
        
        # Assign telemetry
        for code, result in self.results.items():
            result.match_elos = self.elo_history[code][:9]
            if code in opp_graph:
                result.opponents.update(opp_graph[code])
        
        # 6. Mapear resultados avanzados
        # R32 (matches 73-88), winners go to R16
        for m in range(73, 89):
            self.results[winners[m]].reached_r16 = True
            
        # R16 (matches 89-96), winners go to QF
        for m in range(89, 97):
            self.results[winners[m]].reached_qf = True
            
        # QF (matches 97-100), winners go to SF
        for m in range(97, 101):
            self.results[winners[m]].reached_sf = True
            
        # SF (matches 101-102), winners go to Final
        for m in range(101, 103):
            self.results[winners[m]].reached_final = True
            
        champion = winners[104]
        runner_up = losers[104]
        third_place = winners[103]
        fourth_place = losers[103]
        
        self.results[champion].is_champion = True
        
        return TournamentResult(
            champion=champion,
            runner_up=runner_up,
            third_place=third_place,
            fourth_place=fourth_place,
            team_results=self.results,
            knockout_matchups=knockout_matchups
        )
