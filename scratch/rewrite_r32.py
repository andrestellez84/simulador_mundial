import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

# Let's map string to code representation
def map_team(s):
    if "Winner Group" in s:
        return "1" + s[-1]
    if "Runner-up Group" in s:
        return "2" + s[-1]
    if "3rd Group" in s:
        groups = s.split(" ")[-1].split("/")
        return repr(["3" + g for g in groups])
    return s

lines = ["R32_MATCHES = {"]
for i in range(72, 88):
    m = matches[i]
    m_id = i + 1
    home = map_team(m['home'])
    away = map_team(m['away'])
    
    if '[' in away:
        # Wildcard match
        lines.append(f'    {m_id}: {{"type": "wildcard", "home": "{home}", "away_options": {away}}},')
    else:
        # Fixed match
        lines.append(f'    {m_id}: {{"type": "fixed", "home": "{home}", "away": "{away}"}},')

lines.append("}")

print("\n".join(lines))
with open('scratch/r32_new.py', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines) + "\n")
