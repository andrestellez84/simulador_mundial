from typing import Dict, Optional, Tuple
from datetime import datetime, timezone
import sqlite_utils
from pathlib import Path

from ..config import config

def get_db() -> sqlite_utils.Database:
    """Retorna la conexión a la base de datos de caché."""
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    db_path = config.CACHE_DIR / "elo.sqlite"
    return sqlite_utils.Database(db_path)

def init_db():
    """Inicializa la tabla elo_snapshots si no existe."""
    db = get_db()
    if "elo_snapshots" not in db.table_names():
        db["elo_snapshots"].create({
            "team_code": str,
            "elo": int,
            "fetched_at": str,
            "last_match_at": str
        })
        db["elo_snapshots"].create_index(["team_code"])

def load_cache() -> Dict[str, Tuple[int, datetime]]:
    """
    Carga el último snapshot conocido por equipo.
    Retorna un dict { 'MEX': (2000, fetched_at_datetime), ... }
    """
    db = get_db()
    init_db()
    
    cached = {}
    if "elo_snapshots" in db.table_names():
        # Obtener el registro más reciente por código de equipo
        # Usamos rowid o orden manual, pero de forma sencilla podemos order by y group by.
        # SQLite: SELECT *, max(fetched_at) FROM elo_snapshots GROUP BY team_code
        rows = db.query("SELECT team_code, elo, max(fetched_at) as fetched_at FROM elo_snapshots GROUP BY team_code")
        for row in rows:
            dt = datetime.fromisoformat(row["fetched_at"])
            cached[row["team_code"]] = (row["elo"], dt)
            
    return cached

def save_cache(updates: Dict[str, int]):
    """
    Guarda nuevas entradas al snapshot histórico.
    updates es { 'MEX': 2010 }
    """
    db = get_db()
    init_db()
    
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = []
    for code, elo in updates.items():
        rows.append({
            "team_code": code,
            "elo": elo,
            "fetched_at": now_iso,
            "last_match_at": None # Opcional de capturar luego del scrape detail
        })
        
    db["elo_snapshots"].insert_all(rows)
