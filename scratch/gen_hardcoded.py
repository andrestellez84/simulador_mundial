import json

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

# Group order A to L
groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

# We need to map team names to codes, or just use the names to look them up.
# Let's generate code that uses `next(t for t in teams if t.name == "France")`

lines = []
for g in range(12):
    group_name = groups[g]
    base = g * 6
    for i in range(6):
        m = matches[base + i]
        home = m['home'].replace("'", "\\'")
        away = m['away'].replace("'", "\\'")
        lines.append(f'        ("{group_name}", "{home}", "{away}"),')

print("Hardcoded list:")
print("\n".join(lines[:10]))

with open('scratch/hardcoded_list.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))
