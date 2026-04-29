import pytest
from worldcup_sim.models.group import GroupStanding
from worldcup_sim.models.team import Team
from worldcup_sim.core.group_simulator import rank_group
from worldcup_sim.core.third_place_ranker import rank_third_places

def test_tiebreakers_respect_order():
    t1 = Team(code="ARG", name="Argentina", confederation="CONMEBOL", country="Argentina")
    t2 = Team(code="MEX", name="Mexico", confederation="CONCACAF", country="Mexico")
    
    # Mismos puntos, Argentina mejor diff goles
    s1 = GroupStanding(team=t1, points=6, goals_for=5, goals_against=1, initial_elo=2000)
    s2 = GroupStanding(team=t2, points=6, goals_for=3, goals_against=1, initial_elo=1800)
    
    ranked = rank_group([s2, s1])
    assert ranked[0].team.code == "ARG"
    
    # Mismos puntos, misma diff goles, Mexico mas goles a favor
    s3 = GroupStanding(team=t1, points=6, goals_for=2, goals_against=1, initial_elo=2000) # diff +1
    s4 = GroupStanding(team=t2, points=6, goals_for=3, goals_against=2, initial_elo=1800) # diff +1
    
    ranked2 = rank_group([s3, s4])
    assert ranked2[0].team.code == "MEX"
    
def test_rank_third_places():
    t_a = Team(code="AAA", name="A", confederation="A", country="A")
    t_b = Team(code="BBB", name="B", confederation="B", country="B")
    
    # Simula dos terceros de grupo
    # A con 4 puntos, B con 3 puntos
    s_a = GroupStanding(team=t_a, points=4, goals_for=2, goals_against=2)
    s_b = GroupStanding(team=t_b, points=3, goals_for=1, goals_against=2)
    
    thirds = [("A", s_a), ("B", s_b)]
    ranked = rank_third_places(thirds)
    
    assert ranked[0][0] == "A"
    assert ranked[0][1].team.code == "AAA"
