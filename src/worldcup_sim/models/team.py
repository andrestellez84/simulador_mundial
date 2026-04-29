from pydantic import BaseModel, Field

class Team(BaseModel):
    code: str = Field(..., min_length=3, max_length=3, description="Código FIFA de 3 letras")
    name: str
    confederation: str
    country: str = Field(..., description="País al que pertenece (útil para HFA si es anfitrión)")

    def __hash__(self):
        return hash(self.code)

    def __eq__(self, other):
        if isinstance(other, Team):
            return self.code == other.code
        return False

class Venue(BaseModel):
    name: str
    city: str
    country: str
