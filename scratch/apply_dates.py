import re

with open('scratch/schedule_dates4.py', 'r', encoding='utf-8') as f:
    new_dates = f.read()

with open('src/worldcup_sim/data/schedule.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace MATCH_DATES = { ... }
code = re.sub(r'MATCH_DATES = \{[\s\S]*?^\}', new_dates.strip(), code, flags=re.MULTILINE)

with open('src/worldcup_sim/data/schedule.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied new dates perfectly!")
