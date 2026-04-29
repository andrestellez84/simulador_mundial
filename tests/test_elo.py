import pytest
from worldcup_sim.core.elo import expected_score, calculate_g_factor, update_elo

def test_expected_score_equal_teams():
    # Sin ventaja local y mismo elo: W_e debe ser 0.5
    w_e = expected_score(1500, 1500, hfa=0)
    assert pytest.approx(w_e) == 0.5

def test_expected_score_with_hfa():
    # Ventaja local de 100 equivale a ser 100 puntos mejor
    w_e_hfa = expected_score(1500, 1500, hfa=100)
    w_e_better = expected_score(1600, 1500, hfa=0)
    assert pytest.approx(w_e_hfa) == pytest.approx(w_e_better)

def test_calculate_g_factor():
    assert calculate_g_factor(1, 0) == 1.0
    assert calculate_g_factor(2, 2) == 1.0
    assert calculate_g_factor(3, 1) == 1.5
    assert calculate_g_factor(4, 1) == (11 + 3) / 8  # 14/8 = 1.75
    assert calculate_g_factor(5, 0) == (11 + 5) / 8  # 16/8 = 2.0

def test_elo_update_zero_sum():
    """Lo que gana un equipo lo pierde el otro."""
    r_h, r_a = 1800, 1700
    new_h, new_a = update_elo(r_h, r_a, goals_home=2, goals_away=1, hfa=0, k=60)
    
    diff_h = new_h - r_h
    diff_a = new_a - r_a
    
    assert pytest.approx(diff_h + diff_a, abs=1e-6) == 0.0

def test_elo_update_goal_diff_factor():
    """Diferencia de 3 goles -> G = 14/8 = 1.75"""
    r_h, r_a = 1500, 1500
    new_h1, _ = update_elo(r_h, r_a, goals_home=1, goals_away=0, hfa=0, k=60)
    new_h3, _ = update_elo(r_h, r_a, goals_home=3, goals_away=0, hfa=0, k=60)
    
    gain1 = new_h1 - r_h
    gain3 = new_h3 - r_h
    
    # Ganar por 3 goles (G=1.75) da 1.75 veces más puntos que ganar por 1 gol (G=1.0)
    assert pytest.approx(gain3) == gain1 * 1.75
