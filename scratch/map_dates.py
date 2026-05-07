import json
import re
from datetime import datetime, timedelta

def parse_time(date_str, time_str):
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    dt_str = m_date.group(1) if m_date else 'TBD'
    m_time = re.search(r'(\d+):(\d+)\s*([ap]\.?m\.?)\s*UTC[−-](\d+)', time_str.replace('−', '-'))
    hour = int(m_time.group(1))
    minute = int(m_time.group(2))
    ampm = m_time.group(3).lower()
    offset = int(m_time.group(4))
    if ampm.startswith('p') and hour < 12: hour += 12
    if ampm.startswith('a') and hour == 12: hour = 0
    dt = datetime.strptime(f'{dt_str} {hour:02d}:{minute:02d}', '%Y-%m-%d %H:%M')
    dt_utc6 = dt + timedelta(hours=offset - 6)
    final_h = dt_utc6.hour
    final_ampm = "a.m." if final_h < 12 else "p.m."
    display_h = final_h if 0 < final_h <= 12 else (12 if final_h == 0 else final_h - 12)
    return dt_utc6.strftime('%Y-%m-%d'), f"{display_h}:{dt_utc6.minute:02d} {final_ampm}"

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    wiki = json.load(f)

# Create a mapping from Wikipedia representation to Match Date
wiki_mapping = {}

def get_code(s):
    if "Winner Group" in s: return "1" + s[-1]
    if "Runner-up Group" in s: return "2" + s[-1]
    if "3rd Group" in s: return "3" + s.split()[-1]
    return s.replace("Winner Match ", "")

for m in wiki[72:]:
    h = get_code(m['home'])
    a = get_code(m['away'])
    
    # Normalizamos el identificador
    # Si es comodin, solo nos importa el home porque es unico por partido
    if "3" in a: 
        key = h
    else:
        # Sort them to avoid 1C vs 2F vs 2F vs 1C issues
        key = "-".join(sorted([str(h), str(a)]))
        
    date, time = parse_time(m['date'], m['time'])
    wiki_mapping[key] = (date, time)

import sys
sys.path.append('src')
from worldcup_sim.data.bracket.r32_skeleton import R32_MATCHES
from worldcup_sim.data.bracket.r16_to_final import BRACKET

match_dates_ko = {}

for m_id, data in R32_MATCHES.items():
    if data['type'] == 'wildcard':
        key = data['home']
    else:
        key = "-".join(sorted([data['home'], data['away']]))
    
    if key in wiki_mapping:
        match_dates_ko[m_id] = wiki_mapping[key]
    else:
        print(f"Missing mapping for R32 Match {m_id}: {key}")

for m_id, (h, a) in BRACKET.items():
    if m_id == 103:
        key = "-".join(sorted(["Loser 101", "Loser 102"]))
    else:
        key = "-".join(sorted([str(h), str(a)]))
        
    if key in wiki_mapping:
        match_dates_ko[m_id] = wiki_mapping[key]
    else:
        print(f"Missing mapping for R16+ Match {m_id}: {key}")

# Let's print the dict to paste it
for k in sorted(match_dates_ko.keys()):
    print(f"    {k}: {match_dates_ko[k]},")
