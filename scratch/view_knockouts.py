import json

with open('scratch/wiki_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

for i in range(72, 80):
    m = matches[i]
    m_id = i + 1
    date = m['date']
    time = m['time']
    print(f"Match {m_id}: {date} | {time}")
