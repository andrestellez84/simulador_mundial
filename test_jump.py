import json
from src.worldcup_sim.api.routes.inplay import get_inplay_trajectory, InPlayRequest

req = InPlayRequest(
    home_code="ARG",
    away_code="BRA",
    home_goal_minutes=[12],
    away_goal_minutes=[25, 50],
    current_minute=50
)
res = get_inplay_trajectory(req)

for p in res.linear:
    if p.minute in [10, 11, 12, 13, 24, 25, 26, 49, 50, 51]:
        print(f"m={p.minute}: p_h={p.p_home:.3f}, p_d={p.p_draw:.3f}, p_a={p.p_away:.3f}")
