import random
from typing import Tuple
from .match_simulator import simulate_match_exact, calculate_lambdas
from ..config import config

def simulate_extra_time(lam_h: float, lam_a: float, rho: float = config.RHO_DIXON_COLES) -> Tuple[int, int]:
    """
    Simula 30 minutos extras. Es 1/3 de un partido de 90 minutos, 
    así que se escalan las tasas lambda de llegada de goles a 1/3.
    """
    return simulate_match_exact(lam_h / 3.0, lam_a / 3.0, rho)


def simulate_penalties(elo_h: float, elo_a: float) -> str:
    """
    Simula una tanda de penales.
    Tiene una ligerísima dependencia de ELO, pero emparejado (base 1200 en lugar de 400).
    Retorna "home" o "away" para indicar quién gana la tanda.
    """
    diff = elo_h - elo_a
    # Al aplanar a base 1200, la ventaja de ELO cuenta mucho menos que en tiempo regular.
    p_h = 1.0 / (1.0 + 10.0 ** (-diff / 1200.0))
    
    if random.random() < p_h:
        return "home"
    return "away"
