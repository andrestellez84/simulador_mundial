import json

with open('src/worldcup_sim/data/bracket/annex_c.json', 'r', encoding='utf-8') as f:
    annex = json.load(f)

print(f"Total combinations: {len(annex)}")
# Let's see the first 5 combinations
for i in range(5):
    print("Groups:", annex[i]['groups'])
    print("Matchups:", annex[i]['matchups'])
