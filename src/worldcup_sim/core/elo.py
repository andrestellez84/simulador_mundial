import math

def expected_score(elo_home: float, elo_away: float, hfa: float = 0.0) -> float:
    """
    Calcula el resultado esperado (W_e) para el equipo local según el modelo ELO estándar.
    
    W_e = 1 / (1 + 10**(-(delta_R + H) / 400))
    """
    delta = elo_home - elo_away + hfa
    return 1.0 / (1.0 + 10.0 ** (-delta / 400.0))

def calculate_g_factor(goals_home: int, goals_away: int) -> float:
    """
    Calcula el factor G basado en la diferencia de goles.
    """
    diff = abs(goals_home - goals_away)
    if diff <= 1:
        return 1.0
    elif diff == 2:
        return 1.5
    else:
        return (11.0 + diff) / 8.0

def update_elo(elo_home: float, elo_away: float, goals_home: int, goals_away: int, hfa: float = 0.0, k: int = 60) -> tuple[float, float]:
    """
    Actualiza los ratings ELO después de un partido.
    Retorna (new_elo_home, new_elo_away).
    """
    w_e = expected_score(elo_home, elo_away, hfa)
    g = calculate_g_factor(goals_home, goals_away)
    
    if goals_home > goals_away:
        w = 1.0
    elif goals_home < goals_away:
        w = 0.0
    else:
        w = 0.5
        
    change_home = k * g * (w - w_e)
    
    new_elo_home = elo_home + change_home
    # Como es suma cero, el equipo visitante pierde lo que el local gana
    new_elo_away = elo_away - change_home
    
    return new_elo_home, new_elo_away
