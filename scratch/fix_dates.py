import json
import re
from datetime import datetime, timedelta

with open('scratch/wiki_parsed_teams.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

def parse_time_to_utc6_ampm(date_str, time_str):
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    if not m_date:
        return 'TBD', 'TBD'
    dt_str = m_date.group(1)
    
    m_time = re.search(r'(\d+):(\d+)\s*([ap]\.?m\.?)\s*UTC[−-](\d+)', time_str.replace('−', '-'))
    if not m_time:
        return dt_str, time_str
        
    hour = int(m_time.group(1))
    minute = int(m_time.group(2))
    ampm = m_time.group(3).lower()
    offset = int(m_time.group(4))
    
    if ampm.startswith('p') and hour < 12:
        hour += 12
    if ampm.startswith('a') and hour == 12:
        hour = 0
        
    dt = datetime.strptime(f'{dt_str} {hour:02d}:{minute:02d}', '%Y-%m-%d %H:%M')
    
    diff = offset - 6
    dt_utc6 = dt + timedelta(hours=diff)
    
    final_h = dt_utc6.hour
    final_m = dt_utc6.minute
    final_ampm = "a.m." if final_h < 12 else "p.m."
    display_h = final_h if 0 < final_h <= 12 else (12 if final_h == 0 else final_h - 12)
    
    time_str_out = f"{display_h}:{final_m:02d} {final_ampm}"
    date_str_out = dt_utc6.strftime('%Y-%m-%d')
    
    return date_str_out, time_str_out

match_mapping = {}

# Group stage mapping
# Group A to L = 12 groups
# For group index g (0 to 11):
# Matches are: M_{g*2+1}, M_{g*2+2}, M_{24 + g*2+1}, M_{24 + g*2+2}, M_{48 + g*2+1}, M_{48 + g*2+2}
for g in range(12):
    m1 = g * 2 + 1
    m2 = g * 2 + 2
    m3 = 24 + m1
    m4 = 24 + m2
    m5 = 48 + m1
    m6 = 48 + m2
    
    idx_base = g * 6
    match_mapping[m1] = matches[idx_base]
    match_mapping[m2] = matches[idx_base + 1]
    match_mapping[m3] = matches[idx_base + 2]
    match_mapping[m4] = matches[idx_base + 3]
    match_mapping[m5] = matches[idx_base + 4]
    match_mapping[m6] = matches[idx_base + 5]

# Knockout stage
# Index 72 to 103 map to M73 to M104
for i in range(32):
    match_mapping[73 + i] = matches[72 + i]

lines = []
for m_id in range(1, 105):
    m = match_mapping[m_id]
    d, t = parse_time_to_utc6_ampm(m['date'], m['time'])
    lines.append(f'    {m_id}: ("{d}", "{t}"),')

code = 'MATCH_DATES = {\n' + '\n'.join(lines) + '\n}'
with open('scratch/schedule_dates4.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done! Check scratch/schedule_dates4.py")
