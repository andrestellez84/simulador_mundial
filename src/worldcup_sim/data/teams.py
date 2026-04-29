from ..models.team import Team

# The 48 teams qualified for the 2026 World Cup
teams_list = [
    # Group A
    Team(code="MEX", name="Mexico", confederation="CONCACAF", country="Mexico"),
    Team(code="RSA", name="South Africa", confederation="CAF", country="South Africa"),
    Team(code="KOR", name="South Korea", confederation="AFC", country="South Korea"),
    Team(code="CZE", name="Czech Republic", confederation="UEFA", country="Czech Republic"),

    # Group B
    Team(code="CAN", name="Canada", confederation="CONCACAF", country="Canada"),
    Team(code="BIH", name="Bosnia and Herzegovina", confederation="UEFA", country="Bosnia and Herzegovina"),
    Team(code="QAT", name="Qatar", confederation="AFC", country="Qatar"),
    Team(code="SUI", name="Switzerland", confederation="UEFA", country="Switzerland"),

    # Group C
    Team(code="BRA", name="Brazil", confederation="CONMEBOL", country="Brazil"),
    Team(code="MAR", name="Morocco", confederation="CAF", country="Morocco"),
    Team(code="HAI", name="Haiti", confederation="CONCACAF", country="Haiti"),
    Team(code="SCO", name="Scotland", confederation="UEFA", country="Scotland"),

    # Group D
    Team(code="USA", name="United States", confederation="CONCACAF", country="USA"),
    Team(code="PAR", name="Paraguay", confederation="CONMEBOL", country="Paraguay"),
    Team(code="AUS", name="Australia", confederation="AFC", country="Australia"),
    Team(code="TUR", name="Turkey", confederation="UEFA", country="Turkey"),

    # Group E
    Team(code="GER", name="Germany", confederation="UEFA", country="Germany"),
    Team(code="CUW", name="Curacao", confederation="CONCACAF", country="Curacao"),
    Team(code="CIV", name="Ivory Coast", confederation="CAF", country="Ivory Coast"),
    Team(code="ECU", name="Ecuador", confederation="CONMEBOL", country="Ecuador"),

    # Group F
    Team(code="NED", name="Netherlands", confederation="UEFA", country="Netherlands"),
    Team(code="JPN", name="Japan", confederation="AFC", country="Japan"),
    Team(code="SWE", name="Sweden", confederation="UEFA", country="Sweden"),
    Team(code="TUN", name="Tunisia", confederation="CAF", country="Tunisia"),

    # Group G
    Team(code="BEL", name="Belgium", confederation="UEFA", country="Belgium"),
    Team(code="EGY", name="Egypt", confederation="CAF", country="Egypt"),
    Team(code="IRN", name="Iran", confederation="AFC", country="Iran"),
    Team(code="NZL", name="New Zealand", confederation="OFC", country="New Zealand"),

    # Group H
    Team(code="ESP", name="Spain", confederation="UEFA", country="Spain"),
    Team(code="CPV", name="Cape Verde", confederation="CAF", country="Cape Verde"),
    Team(code="KSA", name="Saudi Arabia", confederation="AFC", country="Saudi Arabia"),
    Team(code="URU", name="Uruguay", confederation="CONMEBOL", country="Uruguay"),

    # Group I
    Team(code="FRA", name="France", confederation="UEFA", country="France"),
    Team(code="SEN", name="Senegal", confederation="CAF", country="Senegal"),
    Team(code="IRQ", name="Iraq", confederation="AFC", country="Iraq"),
    Team(code="NOR", name="Norway", confederation="UEFA", country="Norway"),

    # Group J
    Team(code="ARG", name="Argentina", confederation="CONMEBOL", country="Argentina"),
    Team(code="ALG", name="Algeria", confederation="CAF", country="Algeria"),
    Team(code="AUT", name="Austria", confederation="UEFA", country="Austria"),
    Team(code="JOR", name="Jordan", confederation="AFC", country="Jordan"),

    # Group K
    Team(code="POR", name="Portugal", confederation="UEFA", country="Portugal"),
    Team(code="COD", name="DR Congo", confederation="CAF", country="DR Congo"),
    Team(code="UZB", name="Uzbekistan", confederation="AFC", country="Uzbekistan"),
    Team(code="COL", name="Colombia", confederation="CONMEBOL", country="Colombia"),

    # Group L
    Team(code="ENG", name="England", confederation="UEFA", country="England"),
    Team(code="CRO", name="Croatia", confederation="UEFA", country="Croatia"),
    Team(code="GHA", name="Ghana", confederation="CAF", country="Ghana"),
    Team(code="PAN", name="Panama", confederation="CONCACAF", country="Panama")
]

TEAMS = {t.code: t for t in teams_list}
