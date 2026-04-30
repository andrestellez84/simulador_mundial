import os

# We will read schedule_dates5.py for MATCH_DATES
with open('scratch/schedule_dates5.py', 'r', encoding='utf-8') as f:
    match_dates_str = f.read()

# Hardcoded matchups block
hardcoded_matchups = """    hardcoded = [
        ("A", "Mexico", "South Africa"),
        ("A", "South Korea", "Czech Republic"),
        ("A", "Czech Republic", "South Africa"),
        ("A", "Mexico", "South Korea"),
        ("A", "Czech Republic", "Mexico"),
        ("A", "South Africa", "South Korea"),
        ("B", "Canada", "Bosnia and Herzegovina"),
        ("B", "Qatar", "Switzerland"),
        ("B", "Switzerland", "Bosnia and Herzegovina"),
        ("B", "Canada", "Qatar"),
        ("B", "Switzerland", "Canada"),
        ("B", "Bosnia and Herzegovina", "Qatar"),
        ("C", "Brazil", "Morocco"),
        ("C", "Haiti", "Scotland"),
        ("C", "Scotland", "Morocco"),
        ("C", "Brazil", "Haiti"),
        ("C", "Scotland", "Brazil"),
        ("C", "Morocco", "Haiti"),
        ("D", "United States", "Paraguay"),
        ("D", "Australia", "Turkey"),
        ("D", "United States", "Australia"),
        ("D", "Turkey", "Paraguay"),
        ("D", "Turkey", "United States"),
        ("D", "Paraguay", "Australia"),
        ("E", "Germany", "Curaçao"),
        ("E", "Ivory Coast", "Ecuador"),
        ("E", "Germany", "Ivory Coast"),
        ("E", "Ecuador", "Curaçao"),
        ("E", "Curaçao", "Ivory Coast"),
        ("E", "Ecuador", "Germany"),
        ("F", "Netherlands", "Japan"),
        ("F", "Sweden", "Tunisia"),
        ("F", "Netherlands", "Sweden"),
        ("F", "Tunisia", "Japan"),
        ("F", "Japan", "Sweden"),
        ("F", "Tunisia", "Netherlands"),
        ("G", "Belgium", "Egypt"),
        ("G", "Iran", "New Zealand"),
        ("G", "Belgium", "Iran"),
        ("G", "New Zealand", "Egypt"),
        ("G", "Egypt", "Iran"),
        ("G", "New Zealand", "Belgium"),
        ("H", "Spain", "Cape Verde"),
        ("H", "Saudi Arabia", "Uruguay"),
        ("H", "Spain", "Saudi Arabia"),
        ("H", "Uruguay", "Cape Verde"),
        ("H", "Cape Verde", "Saudi Arabia"),
        ("H", "Uruguay", "Spain"),
        ("I", "France", "Senegal"),
        ("I", "Iraq", "Norway"),
        ("I", "France", "Iraq"),
        ("I", "Norway", "Senegal"),
        ("I", "Norway", "France"),
        ("I", "Senegal", "Iraq"),
        ("J", "Argentina", "Algeria"),
        ("J", "Austria", "Jordan"),
        ("J", "Argentina", "Austria"),
        ("J", "Jordan", "Algeria"),
        ("J", "Algeria", "Austria"),
        ("J", "Jordan", "Argentina"),
        ("K", "Portugal", "DR Congo"),
        ("K", "Uzbekistan", "Colombia"),
        ("K", "Portugal", "Uzbekistan"),
        ("K", "Colombia", "DR Congo"),
        ("K", "Colombia", "Portugal"),
        ("K", "DR Congo", "Uzbekistan"),
        ("L", "England", "Croatia"),
        ("L", "Ghana", "Panama"),
        ("L", "England", "Ghana"),
        ("L", "Panama", "Croatia"),
        ("L", "Panama", "England"),
        ("L", "Croatia", "Ghana"),
    ]
"""

schedule_py_content = f"""from typing import List, Tuple
from ..models.team import Team
from .groups import GROUPS
from .teams import TEAMS

def generate_group_matchups() -> List[Tuple[str, Team, Team]]:
    \"\"\"
    Retorna la lista de enfrentamientos (72 en total) usando el mapeo exacto de Wikipedia.
    \"\"\"
    matchups = []
    
{hardcoded_matchups}
    
    # Resolve strings to Team objects
    name_to_code = {{t.name: t.code for t in TEAMS.values()}}
    
    for g, home_str, away_str in hardcoded:
        h_code = name_to_code.get(home_str)
        a_code = name_to_code.get(away_str)
        if h_code and a_code:
            matchups.append((g, TEAMS[h_code], TEAMS[a_code]))
            
    return matchups

{match_dates_str}
"""

with open('src/worldcup_sim/data/schedule.py', 'w', encoding='utf-8') as f:
    f.write(schedule_py_content)

print("schedule.py rewritten successfully!")
