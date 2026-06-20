import os
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/history", tags=["history"])
HISTORY_DIR = Path("storage/history")

@router.get("/")
def list_history():
    if not HISTORY_DIR.exists():
        return {"snapshots": []}
        
    snapshots = []
    for file in os.listdir(HISTORY_DIR):
        if file.startswith("snapshot_") and file.endswith(".json"):
            # snapshot_YYYY-MM-DD_HHMMSS.json
            timestamp_str = file.replace("snapshot_", "").replace(".json", "")
            
            try:
                date_part, time_part = timestamp_str.split("_")
                formatted_date = f"{date_part} {time_part[:2]}:{time_part[2:4]}:{time_part[4:]}"
                
                snapshots.append({
                    "id": file,
                    "label": formatted_date,
                    "timestamp": timestamp_str
                })
            except ValueError:
                pass
                
    # Sort from newest to oldest
    snapshots.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"snapshots": snapshots}

@router.get("/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    if not snapshot_id.startswith("snapshot_") or not snapshot_id.endswith(".json"):
        raise HTTPException(status_code=400, detail="Invalid snapshot ID")
        
    filepath = HISTORY_DIR / snapshot_id
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Snapshot not found")
        
    # Leer como dict
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    return JSONResponse(content=data)
