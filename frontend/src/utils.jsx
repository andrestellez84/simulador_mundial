import React from 'react';

export const renderProb = (currentProb, prevProb) => {
  let currentPct = (currentProb * 100);
  if (currentProb < 1 && currentPct >= 99.95) currentPct = 99.9;
  if (currentProb > 0 && currentPct <= 0.05) currentPct = 0.1;
  let deltaNode = null;
  if (prevProb !== undefined && prevProb !== null) {
    const prevPct = (prevProb * 100);
    const delta = currentPct - prevPct;
    if (Math.abs(delta) >= 0.5) {
       deltaNode = <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: delta > 0 ? 'var(--success)' : '#ef4444' }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
       </span>;
    }
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
       <span>{currentPct.toFixed(1)}%</span>
       {deltaNode}
    </div>
  );
};

export const renderRankDiff = (currentRank, prevRank) => {
  if (prevRank === undefined || prevRank === null) return null;
  const delta = prevRank - currentRank; // If prev=3, current=1, delta=+2 (moved up)
  if (delta !== 0) {
     return <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: delta > 0 ? 'var(--success)' : '#ef4444' }}>
        {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
     </span>;
  }
  return null;
};

export const getTeamStatusColor = (teamCode, resultData, stage = 'r32') => {
  if (!resultData || !resultData.teams || !resultData.teams[teamCode]) return null;
  const t = resultData.teams[teamCode];
  let pAdvance = t.advance_to_r32;
  if (stage === 'r16') pAdvance = t.advance_to_r16;
  else if (stage === 'qf') pAdvance = t.advance_to_qf;
  else if (stage === 'sf') pAdvance = t.advance_to_sf;
  else if (stage === 'final') pAdvance = t.advance_to_final;
  else if (stage === 'champ') pAdvance = t.champion;
  
  if (pAdvance === 1) return '#4ade80'; // Verde: Clasificado
  if (pAdvance === 0) return '#f87171'; // Rojo: Eliminado
  return '#fbbf24'; // Amarillo: Con posibilidades
};

export const isPositionDefined = (teamCode, resultData) => {
  if (!resultData || !resultData.teams || !resultData.teams[teamCode]) return false;
  const t = resultData.teams[teamCode];
  if (!t.group_position_probs) return false;
  return t.group_position_probs['1st'] === 1 || 
         t.group_position_probs['2nd'] === 1 || 
         t.group_position_probs['3rd'] === 1 || 
         t.group_position_probs['4th'] === 1;
};

export const isTeamDefinitiveForStage = (teamCode, resultData, stage = 'r32') => {
  if (!isPositionDefined(teamCode, resultData)) return false;
  const color = getTeamStatusColor(teamCode, resultData, stage);
  return color === '#4ade80';
};

export const resolveTeamByPosition = (posStr, resultData, teamsList) => {
  if (!resultData || !resultData.teams || !posStr) return null;
  const match = posStr.match(/Position (\d)([A-L])/);
  if (match) {
      const rank = match[1];
      const group = match[2];
      const rankKey = rank + (rank === '1' ? 'st' : 'nd');
      
      for (const [code, t] of Object.entries(resultData.teams)) {
          if (t.group === group && t.group_position_probs?.[rankKey] > 0.999) {
              const teamInfo = teamsList?.find(x => x.code === code);
              return { code, name: teamInfo ? teamInfo.name : code };
          }
      }
  }
  return null;
};
