import json
import re
from datetime import datetime, timedelta

with open('scratch/wiki_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

def parse_time_to_utc6_ampm(date_str, time_str):
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    dt_str = m_date.group(1) if m_date else 'TBD'
    
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

lines = []
for i, m in enumerate(matches):
    m_id = i + 1
    d, t = parse_time_to_utc6_ampm(m['date'], m['time'])
    lines.append(f'    {m_id}: ("{d}", "{t}"),')

code = 'MATCH_DATES = {\n' + '\n'.join(lines) + '\n}'
with open('scratch/schedule_dates5.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done schedule_dates5.py")
