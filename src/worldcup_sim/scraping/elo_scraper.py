import logging
from datetime import datetime, timezone, timedelta
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, wait_exponential, stop_after_attempt

from ..config import config
from .elo_cache import load_cache, save_cache
from ..data.teams import TEAMS

log = logging.getLogger(__name__)

# Diccionario de equivalencias para códigos no estándar en eloratings
# Diccionario exacto de 3-letras a las de 2-letras (Eloratings TSV)
ELO_TSV_MAP = {
    "MEX": "MX", "RSA": "ZA", "KOR": "KR", "CZE": "CZ",
    "CAN": "CA", "BIH": "BA", "QAT": "QA", "SUI": "CH",
    "BRA": "BR", "MAR": "MA", "HAI": "HT", "SCO": "SQ",
    "USA": "US", "PAR": "PY", "CIV": "CI", "ECU": "EC",
    "ARG": "AR", "AUS": "AU", "TUN": "TN", "ESP": "ES",
    "SRB": "RS", "JPN": "JP", "PER": "PE", "BEL": "BE",
    "SEN": "SN", "NZL": "NZ", "ENG": "EN", "URU": "UY",
    "VEN": "VE", "CPV": "CV", "GER": "DE", "PAN": "PA",
    "NGA": "NG", "CHI": "CL", "COL": "CO", "ITA": "IT",
    "CRC": "CR", "ALG": "DZ", "FRA": "FR", "HON": "HN",
    "GHA": "GH", "NED": "NL", "POR": "PT", "EGY": "EG",
    "IRQ": "IQ", "COD": "CD", "SWE": "SE", "TUR": "TR", 
    "UZB": "UZ", "JOR": "JO", "CUW": "CW", "IRN": "IR",
    "KSA": "SA", "NOR": "NO", "AUT": "AT", "CRO": "HR"
}

@retry(wait=wait_exponential(multiplier=config.SCRAPE_RATE_LIMIT_S, min=2, max=10), stop=stop_after_attempt(3))
def fetch_main_ratings() -> httpx.Response:
    """Solicita la data real de World.tsv de eloratings.net."""
    headers = {"User-Agent": config.USER_AGENT}
    # Directamente consultamos el TSV que alimenta la tabla
    response = httpx.get("https://www.eloratings.net/World.tsv", headers=headers, timeout=config.SCRAPE_TIMEOUT_S)
    response.raise_for_status()
    return response

def parse_eloratings_table(tsv_data: str) -> dict[str, int]:
    """Parse el TSV extraido para encontrar los Ratings."""
    db_elos = {}
    
    # Invertimos el map para buscar rapido
    reverse_map = {v: k for k, v in ELO_TSV_MAP.items()}
    
    for line in tsv_data.split('\n'):
        parts = line.split('\t')
        if len(parts) > 3:
            tsv_code = parts[2]
            try:
                rating = int(parts[3])
                if tsv_code in reverse_map:
                    fifa_code = reverse_map[tsv_code]
                    db_elos[fifa_code] = rating
            except ValueError:
                pass

    return db_elos

def refresh_elo_if_needed(alive_teams: set[str], max_age_hours: int = 24) -> dict[str, int]:
    """
    Obtiene los ELOs para los equipos vivos. Solo scrapea si hay algún equipo
    en vivo cuyo ELO cacheado sea más viejo que max_age_hours.
    """
    cached = load_cache()
    now_utc = datetime.now(timezone.utc)
    
    needs_refresh = False
    
    # Decisión rápida: si nos falta algún equipo vivo o la data es muy vieja, scrapeamos todo.
    # En la Home ya están todos.
    for team in alive_teams:
        if team not in cached:
            needs_refresh = True
            break
        _, fetched_dt = cached[team]
        if now_utc - fetched_dt > timedelta(hours=max_age_hours):
            needs_refresh = True
            break
            
    updated_elos = {}

    if needs_refresh:
        log.info("Refreshing ELO from eloratings.net...")
        response = fetch_main_ratings()
        scraped_elos = parse_eloratings_table(response.text)
        
        changes_to_save = {}
        for team in alive_teams:
            if team in scraped_elos:
                new_elo = scraped_elos[team]
                
                # Checkear si cambió de verdad
                if team in cached and cached[team][0] == new_elo:
                    updated_elos[team] = new_elo
                    # También guardar para actualizar el timestamp
                    changes_to_save[team] = new_elo
                else:
                    changes_to_save[team] = new_elo
                    updated_elos[team] = new_elo
            else:
                # Si no lo encontramos, fallamos con gracia al cache o algo razonable
                log.warning(f"No se encontró ELO para {team} al parsear la web. Usando caché.")
                updated_elos[team] = cached.get(team, [1500])[0]
                
        # Equipos eliminados congelan su ELO de la foto final
        for team in TEAMS:
            if team not in alive_teams:
                # Si lo teníamos cacheado, lo copiamos a final
                if team in cached:
                    updated_elos[team] = cached[team][0]
                elif team in scraped_elos: 
                    # Lo guardamos de todos modos
                    updated_elos[team] = scraped_elos[team]
                    changes_to_save[team] = scraped_elos[team]
        
        if changes_to_save:
            save_cache(changes_to_save)
            
    else:
        log.info("Usando ELO cacheado vigente.")
        for team in TEAMS:
            if team in cached:
                updated_elos[team] = cached[team][0]
            else:
                updated_elos[team] = 1500 # Fallback extremo

    return updated_elos
