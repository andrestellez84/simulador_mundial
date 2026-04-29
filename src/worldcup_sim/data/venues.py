from ..models.team import Venue

venues_list = [
    # USA (11)
    Venue(name="MetLife Stadium", city="New York/New Jersey", country="USA"),
    Venue(name="AT&T Stadium", city="Dallas", country="USA"),
    Venue(name="Arrowhead Stadium", city="Kansas City", country="USA"),
    Venue(name="NRG Stadium", city="Houston", country="USA"),
    Venue(name="Mercedes-Benz Stadium", city="Atlanta", country="USA"),
    Venue(name="SoFi Stadium", city="Los Angeles", country="USA"),
    Venue(name="Lincoln Financial Field", city="Philadelphia", country="USA"),
    Venue(name="Lumen Field", city="Seattle", country="USA"),
    Venue(name="Levi's Stadium", city="San Francisco Bay Area", country="USA"),
    Venue(name="Gillette Stadium", city="Boston", country="USA"),
    Venue(name="Hard Rock Stadium", city="Miami", country="USA"),

    # Mexico (3)
    Venue(name="Estadio Azteca", city="Mexico City", country="Mexico"),
    Venue(name="Estadio BBVA", city="Monterrey", country="Mexico"),
    Venue(name="Estadio Akron", city="Guadalajara", country="Mexico"),

    # Canada (2)
    Venue(name="BC Place", city="Vancouver", country="Canada"),
    Venue(name="BMO Field", city="Toronto", country="Canada")
]

VENUES = {v.city: v for v in venues_list} # using city as key for now
