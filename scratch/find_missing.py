import sys
sys.path.append('src')
import re
from worldcup_sim.data.teams import TEAMS

name_to_code = {t.name: t.code for t in TEAMS.values()}
code = open('src/worldcup_sim/data/schedule.py', encoding='utf-8').read()
pairs = re.findall(r'\(\"[A-L]\", \"([^\"]+)\", \"([^\"]+)\"\)', code)
missing = [(h, a) for h, a in pairs if h not in name_to_code or a not in name_to_code]
print("Missing:", missing)
