from typing import Optional
from pydantic import BaseModel
from .team import Team

class MatchResult(BaseModel):
    goals_home: int
    goals_away: int
    home_win_penalties: Optional[bool] = None  # None si no hubo penales

    @property
    def is_draw(self) -> bool:
        return self.goals_home == self.goals_away

    @property
    def home_won_regular(self) -> bool:
        return self.goals_home > self.goals_away

    @property
    def away_won_regular(self) -> bool:
        return self.goals_away > self.goals_home

class Match(BaseModel):
    match_id: int
    home_team: Optional[Team] = None
    away_team: Optional[Team] = None
    venue_name: str
    is_knockout: bool = False
    result: Optional[MatchResult] = None
