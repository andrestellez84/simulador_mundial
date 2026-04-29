import pytest
from hypothesis import given, strategies as st
import numpy as np
import scipy.stats as stats
import random

from worldcup_sim.core.match_simulator import calculate_lambdas, tau_dixon_coles, simulate_match_exact

def compute_outcome_probs(elo_h: float, elo_a: float, hfa: float = 0.0, rho: float = -0.1) -> tuple[float, float, float]:
    """
    Calcula probabilidades marginales teóricas de Local, Empate y Visitante 
    (sumando la grilla 10x10)
    """
    lam_h, lam_a = calculate_lambdas(elo_h, elo_a, hfa)
    p_h = p_d = p_a = 0.0
    
    # Acotamos la grilla hasta 20 goles
    for x in range(20):
        for y in range(20):
            prob = tau_dixon_coles(x, y, lam_h, lam_a, rho) * stats.poisson.pmf(x, lam_h) * stats.poisson.pmf(y, lam_a)
            if x > y:
                p_h += prob
            elif x == y:
                p_d += prob
            else:
                p_a += prob
                
    return p_h, p_d, p_a


@given(elo_h=st.integers(1500, 2200), elo_a=st.integers(1500, 2200))
def test_match_probabilities_sum_to_one(elo_h, elo_a):
    p_h, p_d, p_a = compute_outcome_probs(elo_h, elo_a, hfa=0)
    # Puede ser ligerísimamente menor a 1 si no cubrimos la cola entera de Poisson, pero >0.999
    assert p_h + p_d + p_a == pytest.approx(1.0, abs=1e-4)


def test_higher_elo_more_likely_to_win():
    p_h1, _, _ = compute_outcome_probs(2000, 1800, hfa=0)
    p_h2, _, _ = compute_outcome_probs(2200, 1800, hfa=0)
    assert p_h2 > p_h1


def test_simulate_match_distribution():
    # Simulamos muchísimas veces para asegurar que converja a Poisson marginalmente
    # (Testeos estocásticos pueden ser riesgosos, así que se usa un seed fijo o tolerancia alta)
    random.seed(42)
    np.random.seed(42)
    
    lam_h, lam_a = 1.5, 1.0
    N = 10000
    home_goals = []
    
    for _ in range(N):
        x, y = simulate_match_exact(lam_h, lam_a, rho=-0.1)
        home_goals.append(x)
        
    mean_home = np.mean(home_goals)
    # Debería estar muy cerca de lam_h = 1.5
    assert 1.4 < mean_home < 1.6
