import math
import random
import numpy as np
from typing import Tuple

from ..config import config
from ..models.team import Team, Venue
from .home_advantage import home_advantage

def calculate_lambdas(elo_h: float, elo_a: float, kwargs_hfa: float = 0.0) -> Tuple[float, float]:
    """
    Calcula las tasas lambda (esperanza de goles) basándose en la diferencia ELO y el HFA.
    """
    diff = elo_h - elo_a + kwargs_hfa
    lam_h = config.MU_GOALS * (10 ** (diff / 1200.0))
    lam_a = config.MU_GOALS * (10 ** (-diff / 1200.0))
    return lam_h, lam_a

def tau_dixon_coles(x: int, y: int, lam_h: float, lam_a: float, rho: float) -> float:
    """
    Factor de corrección de Dixon-Coles para dependencia de baja puntuación.
    """
    if x == 0 and y == 0:
        return max(0.0, 1.0 - lam_h * lam_a * rho)
    elif x == 0 and y == 1:
        return max(0.0, 1.0 + lam_h * rho)
    elif x == 1 and y == 0:
        return max(0.0, 1.0 + lam_a * rho)
    elif x == 1 and y == 1:
        return max(0.0, 1.0 - rho)
    else:
        return 1.0

def simulate_match_exact(lam_h: float, lam_a: float, rho: float = config.RHO_DIXON_COLES) -> Tuple[int, int]:
    """
    Simula el resultado de un partido usando Dixon-Coles Poisson por Aceptación-Rechazo.
    """
    # Usamos cota superior máxima empírica para tau
    # (Para rho en [-0.2, 0.2] y lambda_h, lambda_a típicos, tau raramente excede 1.2)
    max_tau = 1 + abs(rho) * max(lam_h, lam_a, 1.0) 
    
    while True:
        x = np.random.poisson(lam_h)
        y = np.random.poisson(lam_a)
        
        tau = tau_dixon_coles(x, y, lam_h, lam_a, rho)
        
        # Aceptación/Rechazo
        acceptance_prob = tau / max_tau
        if random.random() < acceptance_prob:
            return int(x), int(y)

def simulate_match(team_h: Team, team_a: Team, venue: Venue, elo_h: float, elo_a: float) -> Tuple[int, int]:
    """
    Encapsula toda la lógica para un partido de 90 mins calculando su HFA y Lambdas.
    """
    # 1. Calcular HFA total para el local (si tiene). Si el visitante fuese "local" 
    #    home_advantage daría 0 y habría que restarlo o pasarlo.
    #    Mejor cálculo diferencial.
    hfa_h = home_advantage(team_h, team_a, venue)
    hfa_a = home_advantage(team_a, team_h, venue)
    
    net_hfa = hfa_h - hfa_a # En caso de ser en sede neutral ambos tendrían 0
    
    lam_h, lam_a = calculate_lambdas(elo_h, elo_a, net_hfa)
    
    # Simular marcador 90 mins
    return simulate_match_exact(lam_h, lam_a)
