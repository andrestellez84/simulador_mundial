from typing import List, Tuple
from ..models.group import GroupStanding

def rank_third_places(third_places: List[Tuple[str, GroupStanding]]) -> List[Tuple[str, GroupStanding]]:
    """
    Rankea los 12 terceros lugares globales y retorna la lista ordenada de mayor a menor.
    Entrada: Lista de tuplas (group_name, standing)
    """
    # Usamos las mismas reglas de desempate centralizadas en la manera que rank_group
    import random
    
    return sorted(
        third_places,
        key=lambda item: (
            item[1].points,
            item[1].goal_diff,
            item[1].goals_for,
            item[1].initial_elo,
            random.random()
        ),
        reverse=True
    )
