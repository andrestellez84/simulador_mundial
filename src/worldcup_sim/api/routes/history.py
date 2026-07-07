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

@router.get("/generate_gif")
def generate_gif(teams: str, metric: str = "champion", duration: float = 5.0):
    import io
    import os
    import json
    from PIL import Image
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from fastapi import HTTPException
    from fastapi.responses import StreamingResponse
    from ...data.teams import TEAMS

    # Parse team codes
    team_codes = [c.strip().upper() for c in teams.split(",") if c.strip()]
    if not team_codes:
        raise HTTPException(status_code=400, detail="No teams specified")

    if not HISTORY_DIR.exists():
        raise HTTPException(status_code=404, detail="History directory not found")

    files = sorted([f for f in os.listdir(HISTORY_DIR) if f.startswith("snapshot_") and f.endswith(".json")])
    if not files:
        raise HTTPException(status_code=404, detail="No snapshots found")

    # Load all snapshot data
    history_data = []
    for f_name in files:
        filepath = HISTORY_DIR / f_name
        timestamp_str = f_name.replace("snapshot_", "").replace(".json", "")
        # Format label: YYYY-MM-DD
        date_part = timestamp_str.split("_")[0]
        # Hour:Minute
        try:
            time_part = timestamp_str.split("_")[1]
            label = f"{date_part} {time_part[:2]}:{time_part[2:4]}"
        except IndexError:
            label = date_part

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            history_data.append({
                "label": label,
                "teams": data.get("teams", {})
            })

    num_frames = len(history_data)
    colors_cycle = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#ec4899', '#14b8a6', '#f97316', '#a855f7', '#06b6d4',
                    '#6366f1', '#84cc16', '#22c55e', '#0ea5e9', '#d946ef']
    team_colors = {code: colors_cycle[i % len(colors_cycle)] for i, code in enumerate(team_codes)}

    frames = []

    # Pre-render the full line chart data for speed
    x_labels = [h["label"] for h in history_data]
    y_values = {code: [] for code in team_codes}
    for h in history_data:
        for code in team_codes:
            prob = h["teams"].get(code, {}).get(metric, 0.0) * 100.0
            y_values[code].append(prob)

    for t in range(num_frames):
        plt.style.use('dark_background')
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 6.5), gridspec_kw={'width_ratios': [1.4, 1.0]})
        fig.patch.set_facecolor('#18181b')
        ax1.set_facecolor('#18181b')
        ax2.set_facecolor('#18181b')

        # 1. Line Chart
        ax1.set_title(f"Evolucion de Probabilidades ({metric.upper()})", fontsize=12, fontweight='bold', color='white', pad=15)
        for code in team_codes:
            ax1.plot(x_labels[:t+1], y_values[code][:t+1], label=TEAMS[code].name if code in TEAMS else code, color=team_colors[code], linewidth=2.5)
            if t < len(x_labels):
                ax1.plot(x_labels[t], y_values[code][t], marker='o', color=team_colors[code], markersize=6)

        ax1.set_ylim(0, 105)
        ax1.set_ylabel("Probabilidad (%)", fontsize=10, color='lightgray')
        ax1.tick_params(colors='lightgray', labelsize=8)
        ax1.set_xticks(range(len(x_labels)))
        ax1.set_xticklabels(x_labels, rotation=45, ha='right')
        ax1.grid(True, stroke_width=0.5, color='#333333', linestyle='--')
        ax1.legend(loc='upper left', fontsize=8, facecolor='#111', edgecolor='#333')

        # 2. Bar Chart
        current_label = x_labels[t]
        ax2.set_title(f"Ranking en: {current_label}", fontsize=12, fontweight='bold', color='white', pad=15)

        slice_data = []
        for code in team_codes:
            prob = y_values[code][t]
            slice_data.append((code, prob))
        slice_data.sort(key=lambda x: x[1])

        codes_sorted = [x[0] for x in slice_data]
        probs_sorted = [x[1] for x in slice_data]
        bar_colors = [team_colors[c] for c in codes_sorted]
        names_sorted = [f"{TEAMS[c].name if c in TEAMS else c} ({c})" for c in codes_sorted]

        bars = ax2.barh(names_sorted, probs_sorted, color=bar_colors, height=0.6)
        ax2.set_xlim(0, 105)
        ax2.set_xlabel("Probabilidad (%)", fontsize=10, color='lightgray')
        ax2.tick_params(colors='lightgray', labelsize=9)
        ax2.grid(True, stroke_width=0.5, color='#333333', linestyle='--', axis='x')

        for bar in bars:
            width = bar.get_width()
            ax2.text(width + 2, bar.get_y() + bar.get_height()/2, f"{width:.1f}%", 
                     va='center', ha='left', fontsize=8, color='white', fontweight='bold')

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, facecolor='#18181b')
        buf.seek(0)
        frames.append(Image.open(buf))
        plt.close(fig)

    out_buf = io.BytesIO()
    frame_duration_ms = max(50, int((duration * 1000.0) / num_frames))
    frames[0].save(
        out_buf,
        format='GIF',
        save_all=True,
        append_images=frames[1:],
        duration=frame_duration_ms,
        loop=0
    )
    out_buf.seek(0)
    return StreamingResponse(out_buf, media_type="image/gif", headers={"Content-Disposition": f"attachment; filename=probabilidades_{metric}.gif"})

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

@router.delete("/{snapshot_id}")
def delete_snapshot(snapshot_id: str):
    if not snapshot_id.startswith("snapshot_") or not snapshot_id.endswith(".json"):
        raise HTTPException(status_code=400, detail="Invalid snapshot ID")
        
    filepath = HISTORY_DIR / snapshot_id
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Snapshot not found")
        
    try:
        os.remove(filepath)
        return {"status": "deleted", "id": snapshot_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
