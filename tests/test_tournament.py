import pytest
from worldcup_sim.core.tournament import WorldCupSimulation
from worldcup_sim.data.teams import TEAMS

def test_exactly_32_teams_advance_to_r32():
    # Creamos un elo ficticio
    elos = {t: 1500.0 for t in TEAMS.keys()}
    
    sim = WorldCupSimulation(initial_elos=elos)
    result = sim.simulate()
    
    advanced_r32 = [k for k, v in result.team_results.items() if v.reached_r32]
    
    assert len(advanced_r32) == 32

def test_one_champion_and_structure_intact():
    elos = {t: 1500.0 + i for i, t in enumerate(TEAMS.keys())} # Valores dispares para evitar muchisimos penales
    
    sim = WorldCupSimulation(initial_elos=elos)
    result = sim.simulate()
    
    assert result.champion is not None
    assert result.runner_up is not None
    assert result.champion != result.runner_up
    
    # Champion reached everything
    champ_res = result.team_results[result.champion]
    assert champ_res.reached_r32
    assert champ_res.reached_r16
    assert champ_res.reached_qf
    assert champ_res.reached_sf
    assert champ_res.reached_final
    assert champ_res.is_champion
    
    # Debe haber exactamente 1 campeon
    champs = [v for v in result.team_results.values() if v.is_champion]
    assert len(champs) == 1
    
    # 2 en final
    finals = [v for v in result.team_results.values() if v.reached_final]
    assert len(finals) == 2
    
    # 4 en semi
    sfs = [v for v in result.team_results.values() if v.reached_sf]
    assert len(sfs) == 4
    
    # 8 en qf
    qfs = [v for v in result.team_results.values() if v.reached_qf]
    assert len(qfs) == 8
    
    # 16 en r16
    r16s = [v for v in result.team_results.values() if v.reached_r16]
    assert len(r16s) == 16
