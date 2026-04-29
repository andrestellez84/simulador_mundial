from typing import Dict, Tuple

def fetch_live_results() -> Dict[str, Tuple[int, int]]:
    """
    Mock que simularía extraer los resultados ya ocurridos en el mundial en vivo.
    Retornaría un Diccionario mapeando de manera unívoca los identifiers a los Goles.
    Para la fase de grupos, el identifier podría ser una tupla de (HomeCode, AwayCode).
    
    Ejemplo real en Junio 2026:
    {
        ("MEX", "KOR"): (2, 1),
        ("ARG", "COL"): (1, 1)
    }
    
    Por los momentos retorna vacío para simular que el torneo no ha iniciado,
    pero permite ser testeado insertando manualmente aquí.
    """
    return {}
