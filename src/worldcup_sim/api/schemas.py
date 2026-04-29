from pydantic import BaseModel
from typing import Optional, Dict

class SimulateRequest(BaseModel):
    n_simulations: int = 1000
    refresh_elo: bool = False
    mu_goals: float = 2.5
    rho: float = -0.1

class SimulateResponse(BaseModel):
    job_id: str
    status: str
    message: str
    progress: Optional[float] = 0.0
    result: Optional[Dict] = None
