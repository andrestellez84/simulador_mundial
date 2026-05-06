import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

lines = ["BRACKET_R16 = {"]
for i in range(88, 96):
    m = matches[i]
    m_id = i + 1
    home = m['home'].replace("Winner Match ", "")
    away = m['away'].replace("Winner Match ", "")
    lines.append(f"    {m_id}: ({home}, {away}),")
lines.append("}")

print("\n".join(lines))
