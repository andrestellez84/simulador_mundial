import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

for i in range(72, 88):
    m = matches[i]
    m_id = i + 1
    print(f"Match {m_id} ({m['date']} {m['time']}): {m['home']} vs {m['away']}")
