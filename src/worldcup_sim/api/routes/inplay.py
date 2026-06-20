import math
import scipy.stats as stats
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List

from ...core.match_simulator import calculate_lambdas, tau_dixon_coles
from ...core.home_advantage import get_net_hfa
from ...data.schedule import GROUP_MATCHES
from ...data.teams import TEAMS
from ...scraping.elo_scraper import refresh_elo_if_needed

router = APIRouter(prefix="/inplay", tags=["inplay"])

class InPlayRequest(BaseModel):
    home_code: str
    away_code: str
    home_goal_minutes: List[int]
    away_goal_minutes: List[int]
    current_minute: int

class TrajectoryPoint(BaseModel):
    minute: int
    p_home: float
    p_draw: float
    p_away: float

class InPlayResponse(BaseModel):
    home_elo: float
    away_elo: float
    hfa_bonus: float
    linear: List[TrajectoryPoint]
    empirical: List[TrajectoryPoint]
    state_dependent: List[TrajectoryPoint]
    average: List[TrajectoryPoint]

def poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)

def predict_remainder(lam_h_rem: float, lam_a_rem: float, curr_h: int, curr_a: int) -> tuple[float, float, float]:
    p_h = p_d = p_a = 0.0
    for x in range(10):
        for y in range(10):
            prob = tau_dixon_coles(x, y, lam_h_rem, lam_a_rem, -0.1) * poisson_pmf(x, lam_h_rem) * poisson_pmf(y, lam_a_rem)
            final_h = curr_h + x
            final_a = curr_a + y
            if final_h > final_a:
                p_h += prob
            elif final_h == final_a:
                p_d += prob
            else:
                p_a += prob
    total = p_h + p_d + p_a
    if total == 0:
        return 0, 1, 0
    return p_h / total, p_d / total, p_a / total

@router.post("/trajectory", response_model=InPlayResponse)
def get_inplay_trajectory(req: InPlayRequest, request: Request):
    elos = refresh_elo_if_needed({req.home_code, req.away_code})
    
    elo_h = elos[req.home_code]
    elo_a = elos[req.away_code]
    
    match_id = None
    for i, (g, t_h, t_a) in enumerate(GROUP_MATCHES):
        if (t_h.code == req.home_code and t_a.code == req.away_code) or (t_h.code == req.away_code and t_a.code == req.home_code):
            match_id = i + 1
            break
            
    net_hfa = 0.0
    if match_id:
        net_hfa = get_net_hfa(match_id, req.home_code, req.away_code)
    
    lam_h_base, lam_a_base = calculate_lambdas(elo_h, elo_a, kwargs_hfa=net_hfa)
    
    linear_traj = []
    emp_traj = []
    state_traj = []
    avg_traj = []
    
    # We want to project the trajectory from t=0 to t=90
    # From t=0 to current_minute, the trajectory represents the probabilities assuming the CURRENT goals were already scored.
    # Wait, the user wants the evolution of probabilities over time.
    # If the user says "we are at minute 60 with 1-0", the trajectory at minute 60 should be calculated with 1-0.
    # To show a smooth graph from 0 to 90 for the *current* state:
    # At minute T (from current_minute to 90), we have (90-T) minutes left.
    
    # For a full history from 0 to current_minute, we'd need to know exactly when the goals were scored!
    # Without that, we can just start the graph at `current_minute` up to 90, OR we can show the whole graph assuming 
    # the score has always been curr_h, curr_a, but that makes no sense.
    # Or we just assume the goals are already scored and we simulate the decay of time.
    
    for m in range(0, 91):
        # Calculate current goals at minute m
        curr_h = sum(1 for g in req.home_goal_minutes if g <= m)
        curr_a = sum(1 for g in req.away_goal_minutes if g <= m)
        
        t_rem = 90 - m
        if t_rem <= 0:
            # Match is over
            if curr_h > curr_a:
                p_h, p_d, p_a = 1.0, 0.0, 0.0
            elif curr_h == curr_a:
                p_h, p_d, p_a = 0.0, 1.0, 0.0
            else:
                p_h, p_d, p_a = 0.0, 0.0, 1.0
            
            for traj in [linear_traj, emp_traj, state_traj, avg_traj]:
                traj.append(TrajectoryPoint(minute=m, p_home=p_h, p_draw=p_d, p_away=p_a))
            continue
            
        # 1. Linear Decay
        weight_lin = t_rem / 90.0
        lam_h_lin = lam_h_base * weight_lin
        lam_a_lin = lam_a_base * weight_lin
        h1, d1, a1 = predict_remainder(lam_h_lin, lam_a_lin, curr_h, curr_a)
        linear_traj.append(TrajectoryPoint(minute=m, p_home=h1, p_draw=d1, p_away=a1))
        
        # 2. Empirical Curve (Non-Homogeneous)
        weight_emp = 1.0 - (m / 90.0) ** 1.15
        lam_h_emp = lam_h_base * weight_emp
        lam_a_emp = lam_a_base * weight_emp
        h2, d2, a2 = predict_remainder(lam_h_emp, lam_a_emp, curr_h, curr_a)
        emp_traj.append(TrajectoryPoint(minute=m, p_home=h2, p_draw=d2, p_away=a2))
        
        # 3. State-Dependent (Game State)
        lam_h_state = lam_h_emp
        lam_a_state = lam_a_emp
        if curr_h > curr_a:
            lam_h_state *= 0.90 # Winning team defends more
            lam_a_state *= 1.15 # Losing team attacks more
        elif curr_a > curr_h:
            lam_h_state *= 1.15
            lam_a_state *= 0.90
        
        h3, d3, a3 = predict_remainder(lam_h_state, lam_a_state, curr_h, curr_a)
        state_traj.append(TrajectoryPoint(minute=m, p_home=h3, p_draw=d3, p_away=a3))
        
        # 4. Average
        h4 = (h1 + h2 + h3) / 3.0
        d4 = (d1 + d2 + d3) / 3.0
        a4 = (a1 + a2 + a3) / 3.0
        avg_traj.append(TrajectoryPoint(minute=m, p_home=h4, p_draw=d4, p_away=a4))
        
    return InPlayResponse(
        home_elo=elo_h,
        away_elo=elo_a,
        hfa_bonus=net_hfa,
        linear=linear_traj,
        empirical=emp_traj,
        state_dependent=state_traj,
        average=avg_traj
    )
