import uuid
import threading
from fastapi import APIRouter, BackgroundTasks, Request
from ..schemas import SimulateRequest, SimulateResponse
from ...data.teams import TEAMS
from ...scraping.elo_scraper import refresh_elo_if_needed
from ...simulation.runner import run_simulations_parallel
from ...simulation.aggregator import aggregate_tournament_results

router = APIRouter(prefix="/simulate", tags=["simulate"])

JOBS = {}

def simulation_task(job_id: str, req: SimulateRequest, live_results: dict):
    try:
        # Puesto que req.refresh_elo podria tardar, lo ideal en backend es aislar
        alive_teams = set(TEAMS.keys())
        initial_elos = refresh_elo_if_needed(alive_teams, max_age_hours=24 if req.refresh_elo else 999999)
        
        def update_progress(pct: float):
            JOBS[job_id]["progress"] = pct

        raw_results = run_simulations_parallel(
            initial_elos, 
            n=req.n_simulations, 
            num_workers=0, 
            live_results=live_results,
            progress_callback=update_progress
        )
        
        agg_res = aggregate_tournament_results(raw_results, req.n_simulations)
        
        # Eliminar '_raw_counters' para el payload final
        dumped = agg_res.model_dump(exclude={"teams": {"__all__": {"_raw_counters"}}})
        
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["progress"] = 100.0
        JOBS[job_id]["result"] = dumped
    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["message"] = str(e)


@router.post("/", response_model=SimulateResponse)
def trigger_simulation(req: SimulateRequest, bg_tasks: BackgroundTasks, request: Request):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "running", "progress": 0.0, "message": "Simulando torneos..."}
    
    bg_tasks.add_task(simulation_task, job_id, req, request.app.state.live_results)
    
    return SimulateResponse(
        job_id=job_id,
        status="running",
        message="Simulación iniciada en background",
        progress=0.0
    )

@router.get("/{job_id}", response_model=SimulateResponse)
def get_simulation_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return SimulateResponse(job_id=job_id, status="not_found", message="Job inexistente")
    return SimulateResponse(
        job_id=job_id,
        status=job["status"],
        message=job.get("message", ""),
        progress=job.get("progress", 0.0),
        result=job.get("result")
    )
