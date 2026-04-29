from ..models.team import Team, Venue
from ..config import config

HOST_COUNTRIES = {"Mexico", "USA", "Canada"}

def home_advantage(team: Team, opponent: Team, venue: Venue) -> float:
    """
    Calcula el Home Field Advantage (HFA) en puntos ELO basado en las reglas del Mundial 2026.
    """
    # 1. Anfitrión jugando en su país
    if team.country == venue.country and team.country in HOST_COUNTRIES:
        return config.HFA_FULL

    # 2. México jugando en EE.UU. en ciudades con fuerte diáspora
    if team.code == "MEX" and venue.city in {"Los Angeles", "Dallas", "Houston"}:
        return config.HFA_STRONG_DIASPORA

    # 3. Equipos CONCACAF/CONMEBOL jugando en México o sur de EE.UU. ("fuerte" o "suave" según interpretación, aquí MILD)
    if team.confederation in {"CONMEBOL", "CONCACAF"} and venue.country == "Mexico":
        # Evitar doble cuenta si ya se contó como anfitrión
        if team.country != "Mexico":
            return config.HFA_MILD_DIASPORA

    # 4. Argentina con gran apoyo en el sur/este de EE.UU.
    if team.code == "ARG" and venue.city in {"Miami", "New York/New Jersey"}:
        return config.HFA_MILD_DIASPORA

    # 5. Brasil con diáspora en Miami y Boston
    if team.code == "BRA" and venue.city in {"Miami", "Boston"}:
        return config.HFA_MILD_DIASPORA

    # 6. Portugal en Boston (gran diáspora)
    if team.code == "POR" and venue.city == "Boston":
        return config.HFA_MILD_DIASPORA

    # 7. Partido neutral
    return 0.0
