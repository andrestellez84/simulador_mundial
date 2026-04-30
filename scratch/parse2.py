import json
import re
from datetime import datetime, timedelta

with open('scratch/wiki_matches.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

def parse_time_for_sort(date_str, time_str):
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    if not m_date:
        return 'TBD', datetime(2030, 1, 1)
    dt_str = m_date.group(1)
    
    m_time = re.search(r'(\d+):(\d+)\s*([ap]\.?m\.?)\s*UTC[−-](\d+)', time_str.replace('−', '-'))
    if not m_time:
        return dt_str, datetime.strptime(f'{dt_str} 00:00', '%Y-%m-%d %H:%M')
        
    hour = int(m_time.group(1))
    minute = int(m_time.group(2))
    ampm = m_time.group(3).lower()
    offset = int(m_time.group(4))
    
    if ampm.startswith('p') and hour < 12:
        hour += 12
    if ampm.startswith('a') and hour == 12:
        hour = 0
        
    dt = datetime.strptime(f'{dt_str} {hour:02d}:{minute:02d}', '%Y-%m-%d %H:%M')
    
    # Convert to UTC to sort correctly
    dt_utc = dt + timedelta(hours=offset)
    
    return dt_str, dt_utc

parsed = []
for m in matches:
    d_clean, dt_sort = parse_time_for_sort(m['date'], m['time'])
    
    # Clean up original strings
    orig_date = d_clean
    orig_time = m['time'].replace('−', '-').replace('\xa0', ' ')
    
    parsed.append({
        'orig_date': orig_date, 
        'orig_time': orig_time, 
        'sort_key': dt_sort
    })

parsed.sort(key=lambda x: x['sort_key'])

lines = []
for i, p in enumerate(parsed):
    m_id = i + 1
    lines.append(f'    {m_id}: ("{p["orig_date"]}", "{p["orig_time"]}"),')

code = 'MATCH_DATES = {\n' + '\n'.join(lines) + '\n}'
with open('scratch/schedule_dates2.py', 'w') as f:
    f.write(code)
print('Done!')
