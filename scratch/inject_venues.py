from bs4 import BeautifulSoup

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

match_divs = soup.find_all('div', class_='footballbox')
venues = {}

for i, div in enumerate(match_divs):
    match_id = i + 1
    location_tag = div.find(itemprop="location")
    if location_tag:
        venue = location_tag.text.strip()
    else:
        fright = div.find('div', class_='fright')
        venue = fright.text.strip() if fright else "Unknown"
            
    venue = venue.split('Attendance:')[0].strip()
    venue = venue.split('Referee:')[0].strip()
    venue = venue.split('\n')[0].strip()
    venues[match_id] = venue

dict_str = "MATCH_VENUES = {\n"
for k, v in venues.items():
    # escape single quotes
    v_escaped = v.replace("'", "\\'")
    dict_str += f"    {k}: '{v_escaped}',\n"
dict_str += "}\n"

with open('src/worldcup_sim/data/schedule.py', 'a', encoding='utf-8') as f:
    f.write("\n")
    f.write(dict_str)

print("Injected MATCH_VENUES into schedule.py!")
