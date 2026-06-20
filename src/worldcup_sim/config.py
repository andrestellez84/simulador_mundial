from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Modelo
    MU_GOALS: float = 1.30          # Media de goles por equipo en un Mundial
    RHO_DIXON_COLES: float = 0.0    # Corrección de dependencia (0 = Poisson puro)
    K_FACTOR: int = 60              # Para update ELO (WC)
    HFA_FULL: float = 100.0         # Ventaja local completa
    HFA_STRONG_DIASPORA: float = 35.0
    HFA_MILD_DIASPORA: float = 15.0

    # Simulación
    N_SIMULATIONS: int = 10000
    N_WORKERS: int = 0               # 0 = usar todos los cores

    # Scraping
    ELO_URL: str = "https://www.eloratings.net/"
    SCRAPE_TIMEOUT_S: int = 30
    SCRAPE_RATE_LIMIT_S: float = 1.0
    USER_AGENT: str = "WorldCupSim/0.1 (educational)"

    # Paths
    CACHE_DIR: Path = Path("storage/cache")
    OUTPUT_DIR: Path = Path("storage/outputs")
    LIVE_RESULTS_FILE: Path = Path("storage/live_results.json")
    MANUAL_ELO_FILE: Path = Path("storage/manual_elo.json")

    class Config:
        env_file = ".env"

config = Settings()
