import urllib.request
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta

url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()
soup = BeautifulSoup(html, 'html.parser')

match_dates = {}

for box in soup.find_all('div', class_='footballbox'):
    # Find match ID in the id attribute of the box or previous anchor
    # Usually id="Match_1" or something similar
    box_id = box.get('id', '')
    m = re.search(r'Match_(\d+)', box_id)
    if not m:
        continue
    match_id = int(m.group(1))
    
    date_el = box.find('div', class_='fdate')
    time_el = box.find('div', class_='ftime')
    
    date_str = date_el.text.strip() if date_el else ''
    time_str = time_el.text.strip() if time_el else ''
    
    # Parse to UTC-6
    m_date = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    if not m_date:
        continue
    dt_str = m_date.group(1)
    
    m_time = re.search(r'(\d+):(\d+)\s*([ap]\.?m\.?)\s*UTC[−-](\d+)', time_str.replace('−', '-'))
    if not m_time:
        continue
        
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
    diff = offset - 6
    dt_utc6 = dt + timedelta(hours=diff)
    
    final_h = dt_utc6.hour
    final_m = dt_utc6.minute
    final_ampm = "a.m." if final_h < 12 else "p.m."
    display_h = final_h if 0 < final_h <= 12 else (12 if final_h == 0 else final_h - 12)
    
    time_str_out = f"{display_h}:{final_m:02d} {final_ampm}"
    date_str_out = dt_utc6.strftime('%Y-%m-%d')
    
    match_dates[match_id] = (date_str_out, time_str_out)

with open('scratch/exact_schedule.py', 'w') as f:
    f.write('MATCH_DATES = {\n')
    for m_id in sorted(match_dates.keys()):
        f.write(f'    {m_id}: ("{match_dates[m_id][0]}", "{match_dates[m_id][1]}"),\n')
    f.write('}\n')

print(f"Scraped {len(match_dates)} matches.")
