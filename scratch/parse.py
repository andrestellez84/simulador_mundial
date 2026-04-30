import json
import re
from datetime import datetime, timedelta

with open('scratch/wiki_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

def parse_time_to_utc6(date_str, time_str):
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
    dt = dt + timedelta(hours=diff)
    
    return dt.strftime('%Y-%m-%d'), dt.strftime('%H:%M')

parsed = []
for m in matches:
    d, t = parse_time_to_utc6(m['date'], m['time'])
    try:
        dto = datetime.strptime(f'{d} {t}', '%Y-%m-%d %H:%M')
    except:
        dto = datetime(2030, 1, 1)
    parsed.append({'date': d, 'time': t, 'dto': dto})

parsed.sort(key=lambda x: x['dto'])

lines = []
for i, p in enumerate(parsed):
    m_id = i + 1
    lines.append(f'    {m_id}: ("{p["date"]}", "{p["time"]}"),')

code = 'MATCH_DATES = {\n' + '\n'.join(lines) + '\n}'
with open('scratch/schedule_dates.py', 'w') as f:
    f.write(code)
print('Done!')
