import json
from bs4 import BeautifulSoup
import re

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

table = soup.find_all('table')[108]
rows = table.find_all('tr')

annex = []
# Headers of assignments: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L
headers = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L']

for r in rows[1:]:
    cols = [c.text.strip().replace(" ", "").replace('\n', '') for c in r.find_all(['td', 'th'])]
    if not cols: continue
    
    # First column is No.
    if not cols[0].isdigit():
        continue
        
    # The letters are in columns 1 to 12.
    # We can just extract all uppercase letters from A-L.
    groups_str = "".join([c for c in cols[1:13] if c in "ABCDEFGHIJKL"])
    groups = list(groups_str)
    
    # The last 8 columns are the assignments for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L
    assignments = cols[-8:]
    
    matchups = {}
    for i, h in enumerate(headers):
        matchups[h] = assignments[i]
        
    annex.append({
        "groups": groups,
        "matchups": matchups
    })

with open('src/worldcup_sim/data/bracket/annex_c.json', 'w', encoding='utf-8') as f:
    json.dump(annex, f, indent=2)

print(f"Generated {len(annex)} combinations in annex_c.json!")
