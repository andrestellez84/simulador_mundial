from typing import Dict, Optional, List, Tuple
from pydantic import BaseModel

class TeamResult(BaseModel):
    team_code: str
    group_position: Optional[int] = None
    points: Optional[int] = None
    group_wins: int = 0
    group_draws: int = 0
    group_losses: int = 0
    group_gf: int = 0
    group_ga: int = 0
    reached_r32: bool = False
    reached_r16: bool = False
    reached_qf: bool = False
    reached_sf: bool = False
    reached_final: bool = False
    is_champion: bool = False
    match_elos: List[float] = []
    opponents: Dict[str, str] = {}

class TournamentResult(BaseModel):
    champion: str
    runner_up: str
    third_place: str
    fourth_place: str
    team_results: Dict[str, TeamResult]
    knockout_matchups: Dict[int, Tuple[str, str]]
