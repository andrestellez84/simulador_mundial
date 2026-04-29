import scipy.stats as stats
from typing import Dict, List, Tuple
from ..core.match_simulator import calculate_lambdas, tau_dixon_coles

def predict_match(elo_h: float, elo_a: float, hfa: float = 0.0, rho: float = -0.1) -> Dict:
    """
    Computa las probabilidades analíticas exactas de un partido usando la grilla de Poisson.
    Retorna porcentajes de 1X2 y el top 3 de los marcadores más probables.
    """
    lam_h, lam_a = calculate_lambdas(elo_h, elo_a, hfa)
    
    p_h = p_d = p_a = 0.0
    exact_scores = {}
    
    # Evaluar hasta 12 goles para exactitud 
    # (mas arriba es estadisticamente 0)
    for x in range(12):
        for y in range(12):
            prob = tau_dixon_coles(x, y, lam_h, lam_a, rho) * stats.poisson.pmf(x, lam_h) * stats.poisson.pmf(y, lam_a)
            exact_scores[f"{x}-{y}"] = prob
            
            if x > y:
                p_h += prob
            elif x == y:
                p_d += prob
            else:
                p_a += prob
                
    # Normalizar ligeramente si la sumatoria es 0.9999
    total = p_h + p_d + p_a
    p_h /= total
    p_d /= total
    p_a /= total
    
    # Extraer el Top 3 de scores más probables
    sorted_scores = sorted(exact_scores.items(), key=lambda item: item[1], reverse=True)
    top_3_scores = [{"score": k, "prob": v / total} for k, v in sorted_scores[:3]]

    return {
        "p_home": p_h,
        "p_draw": p_d,
        "p_away": p_a,
        "top_scores": top_3_scores
    }
