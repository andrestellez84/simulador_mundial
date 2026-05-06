import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

lines = []
for i in range(96, 104):
    m = matches[i]
    m_id = i + 1
    home = m['home'].replace("Winner Match ", "")
    away = m['away'].replace("Winner Match ", "")
    lines.append(f"    {m_id}: ({home}, {away}),")

print("\n".join(lines))
