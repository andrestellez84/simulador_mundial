import re

with open('frontend/src/components/Knockouts.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "{SLOT_DESCRIPTIONS[mId] && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{SLOT_DESCRIPTIONS[mId][0]}</span>}",
    "<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{getDynamicSlot(mId, true, codes[0])}</span>"
)
content = content.replace(
    "{SLOT_DESCRIPTIONS[mId] && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{SLOT_DESCRIPTIONS[mId][1]}</span>}",
    "<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{getDynamicSlot(mId, false, codes[1])}</span>"
)

with open('frontend/src/components/Knockouts.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
