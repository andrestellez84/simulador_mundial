import json
from typing import Dict
from ..config import config

def load_manual_elos() -> Dict[str, float]:
    """Loads manual ELO overrides from the JSON file."""
    if not config.MANUAL_ELO_FILE.exists():
        return {}
    
    try:
        with open(config.MANUAL_ELO_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error loading manual ELOs: {e}")
        return {}

def save_manual_elos(elos: Dict[str, float]):
    """Saves manual ELO overrides to the JSON file."""
    config.MANUAL_ELO_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(config.MANUAL_ELO_FILE, "w", encoding="utf-8") as f:
            json.dump(elos, f, indent=4)
    except Exception as e:
        print(f"Error saving manual ELOs: {e}")
