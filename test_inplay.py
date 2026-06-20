from src.worldcup_sim.api.routes.inplay import get_inplay_trajectory, InPlayRequest
req = InPlayRequest(home_code="ARG", away_code="BRA", home_goal_minutes=[21], away_goal_minutes=[27], current_minute=27)
get_inplay_trajectory(req)
