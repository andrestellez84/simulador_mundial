import json
import re
from datetime import datetime, timedelta

with open('scratch/wiki_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

def parse_time_to_utc6_ampm(date_str, time_str):
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    if not m_date:
        return 'TBD', 'TBD', datetime(2030, 1, 1)
    dt_str = m_date.group(1)
    
    m_time = re.search(r'(\d+):(\d+)\s*([ap]\.?m\.?)\s*UTC[−-](\d+)', time_str.replace('−', '-'))
    if not m_time:
        return dt_str, time_str, datetime.strptime(f'{dt_str} 00:00', '%Y-%m-%d %H:%M')
        
    hour = int(m_time.group(1))
    minute = int(m_time.group(2))
    ampm = m_time.group(3).lower()
    offset = int(m_time.group(4))
    
    if ampm.startswith('p') and hour < 12:
        hour += 12
    if ampm.startswith('a') and hour == 12:
        hour = 0
        
    dt = datetime.strptime(f'{dt_str} {hour:02d}:{minute:02d}', '%Y-%m-%d %H:%M')
    
    # Convert to UTC-6
    # If the time is UTC-4, diff = 4 - 6 = -2 hours
    diff = offset - 6
    dt_utc6 = dt + timedelta(hours=diff)
    
    # format back to am/pm
    final_h = dt_utc6.hour
    final_m = dt_utc6.minute
    final_ampm = "a.m." if final_h < 12 else "p.m."
    display_h = final_h if 0 < final_h <= 12 else (12 if final_h == 0 else final_h - 12)
    
    time_str_out = f"{display_h}:{final_m:02d} {final_ampm}"
    date_str_out = dt_utc6.strftime('%Y-%m-%d')
    
    return date_str_out, time_str_out, dt_utc6

parsed = []
for m in matches:
    d, t, dt_obj = parse_time_to_utc6_ampm(m['date'], m['time'])
    parsed.append({
        'date': d, 
        'time': t, 
        'sort_key': dt_obj
    })

parsed.sort(key=lambda x: x['sort_key'])

lines = []
for i, p in enumerate(parsed):
    m_id = i + 1
    lines.append(f'    {m_id}: ("{p["date"]}", "{p["time"]}"),')

code = 'MATCH_DATES = {\n' + '\n'.join(lines) + '\n}'
with open('scratch/schedule_dates3.py', 'w') as f:
    f.write(code)
print('Done!')
