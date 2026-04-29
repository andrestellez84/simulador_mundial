import json
from datetime import datetime, timezone
from pathlib import Path
from ..config import config
from ..simulation.aggregator import AggregateResults

def export_json_report(agg_results: AggregateResults, initial_elos: dict) -> Path:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filepath = config.OUTPUT_DIR / f"probabilities_{timestamp}.json"
    
    data = {
        "metadata": {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "n_simulations": agg_results.n_simulations,
            "parameters": {
                "mu": config.MU_GOALS,
                "rho": config.RHO_DIXON_COLES,
                "K": config.K_FACTOR,
                "HFA_full": config.HFA_FULL
            }
        },
        "initial_elo": initial_elos,
        "teams": {
            code: agg.model_dump(exclude={"_raw_counters"}) 
            for code, agg in agg_results.teams.items()
        },
        "most_likely_final": agg_results.most_likely_final
    }
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    return filepath
