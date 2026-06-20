from typing import Dict, Any
from pydantic import BaseModel, Field
from .team import Team

class GroupStanding(BaseModel):
    team: Team
    points: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    # Guardamos el ELO de inicio para desempates si se requiere
    initial_elo: float = 0.0
    # h2h_results[team_code] = {"points": x, "goals_for": y, "goals_against": z}
    h2h_results: Dict[str, Dict[str, int]] = Field(default_factory=dict)

    @property
    def goal_diff(self) -> int:
        return self.goals_for - self.goals_against
