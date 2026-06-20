from bs4 import BeautifulSoup
import re
import sys

# Ensure utf-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

match_divs = soup.find_all('div', class_='footballbox')

venues = {}

for i, div in enumerate(match_divs):
    # Match ID is generally just i + 1, since there are 104 matches in order
    match_id = i + 1
    
    # Extract venue
    # The venue is usually in a div with itemprop="location" or similar, or fright
    # Let's look for standard wikipedia footballbox format
    location_tag = div.find(itemprop="location")
    if location_tag:
        venue = location_tag.text.strip()
    else:
        # fallback: find the text after 'Stadium:' or find fright
        fright = div.find('div', class_='fright')
        if fright:
            venue = fright.text.strip()
        else:
            venue = "Unknown"
            
    # Clean up venue text (remove 'Attendance: ...', 'Referee: ...')
    venue = venue.split('Attendance:')[0].strip()
    venue = venue.split('Referee:')[0].strip()
    # sometimes there is an extra newline
    venue = venue.split('\n')[0].strip()
    
    venues[match_id] = venue

for k in range(1, 10):
    print(f"Match {k}: {venues[k]}")
    
# Let's see Match 73
print(f"Match 73: {venues[73]}")
