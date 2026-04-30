import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

for g in range(12):
    base = g * 6
    m1 = matches[base+2]
    m2 = matches[base+3]
    print(f"Group {chr(65+g)} MD2: {m1['home']} vs {m1['away']} | {m2['home']} vs {m2['away']}")
