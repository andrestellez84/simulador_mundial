import json
import os
from typing import Dict, Tuple
from ..config import config

def load_live_results() -> Dict[Tuple[str, str], Tuple]:
    """Loads live results from the JSON file."""
    if not config.LIVE_RESULTS_FILE.exists():
        return {}
    
    try:
        with open(config.LIVE_RESULTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        results = {}
        for k, v in data.items():
            if "-" in k and (len(v) == 2 or len(v) == 3):
                home, away = k.split("-")
                if len(v) == 3:
                    results[(home, away)] = (int(v[0]), int(v[1]), v[2])
                else:
                    results[(home, away)] = (int(v[0]), int(v[1]))
        return results
    except Exception as e:
        print(f"Error loading live results: {e}")
        return {}

def save_live_results(results: Dict[Tuple[str, str], Tuple]):
    """Saves live results to the JSON file."""
    # Convert tuples back to JSON-serializable types
    data = {}
    for k, v in results.items():
        data[f"{k[0]}-{k[1]}"] = list(v)
    
    # Ensure directory exists
    config.LIVE_RESULTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(config.LIVE_RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving live results: {e}")
