from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from .routes import simulate, teams, predictions, schedule, history, inplay
from ..data.live_results_store import load_live_results

app = FastAPI(title="World Cup Simulator API", version="0.1.0")

app.state.live_results = load_live_results()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(simulate.router)
api_router.include_router(teams.router)
api_router.include_router(predictions.router)
api_router.include_router(schedule.router)
api_router.include_router(history.router)
api_router.include_router(inplay.router)

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the World Cup 2026 Simulator API"}
