import random
from typing import List, Dict

from ..models.group import GroupStanding
from ..models.team import Team

def rank_group(standings: List[GroupStanding]) -> List[GroupStanding]:
    """
    Ordena las posiciones del grupo según las reglas FIFA 2026:
    1. Puntos
    2. Diferencia de goles
    3. Goles a favor
    4. (Ignorado: fair play)
    5. Ranking ELO base (en lugar del FIFA ranking, como proxy)
    6. Sorteo random
    """
    # Al ordenar con sorted de Python en reverso, los elementos mayores son mejores.
    # Dado que sorted usa el orden de tuplas, empaquetamos (pts, gd, gf, elo, random)
    return sorted(
        standings,
        key=lambda s: (
            s.points,
            s.goal_diff,
            s.goals_for,
            s.initial_elo,
            random.random()
        ),
        reverse=True
    )
