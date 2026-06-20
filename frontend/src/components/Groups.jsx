import React, { useState } from 'react';
import { getFlagUrl } from '../flagMap';
import { renderProb, renderRankDiff, getTeamStatusColor, isPositionDefined } from '../utils';

export default function Groups({ resultData, prevResultData, teamsList }) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [viewMode, setViewMode] = useState('standings'); // "standings" or "stats"
  const [sortKey, setSortKey] = useState('points'); // points, gd, gf, ga, w, d, l, 1st, 2nd, 3rd, 4th, advance
  const [sortDir, setSortDir] = useState('desc');

  if (!resultData || !teamsList) {
    return <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>No simulation data available.</div>
  }

  const groups = {};
  const teamsMap = {};
  teamsList.forEach(t => teamsMap[t.code] = t);

  Object.values(resultData.teams).forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });

  const allGroups = Object.keys(groups).sort();
  
  // Sorting Helper
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  
  const renderSortIcon = (key) => {
    if (sortKey !== key) return null;
    return <span style={{ marginLeft: '5px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const groupTeams = (groups[activeGroup] || []).map(t => ({
     ...t,
     expected_goal_diff: (t.expected_goals_for_group || 0) - (t.expected_goals_against_group || 0)
  })).sort((a, b) => {
     let valA = 0; let valB = 0;
     if (sortKey === 'points') { valA = a.expected_points_group; valB = b.expected_points_group; }
     else if (sortKey === 'gd') { valA = a.expected_goal_diff; valB = b.expected_goal_diff; }
     else if (sortKey === 'gf') { valA = a.expected_goals_for_group; valB = b.expected_goals_for_group; }
     else if (sortKey === 'ga') { valA = a.expected_goals_against_group; valB = b.expected_goals_against_group; }
     else if (sortKey === 'w') { valA = a.expected_wins_group; valB = b.expected_wins_group; }
     else if (sortKey === 'd') { valA = a.expected_draws_group; valB = b.expected_draws_group; }
     else if (sortKey === 'l') { valA = a.expected_losses_group; valB = b.expected_losses_group; }
     else if (sortKey === '1st') { valA = a.group_position_probs['1st']; valB = b.group_position_probs['1st']; }
     else if (sortKey === '2nd') { valA = a.group_position_probs['2nd']; valB = b.group_position_probs['2nd']; }
     else if (sortKey === '3rd') { valA = a.group_position_probs['3rd']; valB = b.group_position_probs['3rd']; }
     else if (sortKey === '4th') { valA = a.group_position_probs['4th']; valB = b.group_position_probs['4th']; }
     else if (sortKey === 'advance') { valA = a.advance_to_r32; valB = b.advance_to_r32; }
     
     if (valA === valB) {
        if (sortKey === 'points') {
           valA = a.expected_goal_diff; valB = b.expected_goal_diff;
        }
     }

     if (sortDir === 'asc') return valA - valB;
     return valB - valA;
  });

  const getPrevGroupTeams = (grp, sk, sd) => {
     if (!prevResultData) return [];
     const grpTeams = Object.values(prevResultData.teams).filter(t => t.group === grp);
     return grpTeams.map(t => ({
       ...t,
       expected_goal_diff: (t.expected_goals_for_group || 0) - (t.expected_goals_against_group || 0)
     })).sort((a, b) => {
        let valA = 0; let valB = 0;
        if (sk === 'points') { valA = a.expected_points_group; valB = b.expected_points_group; }
        else if (sk === 'gd') { valA = a.expected_goal_diff; valB = b.expected_goal_diff; }
        else if (sk === 'gf') { valA = a.expected_goals_for_group; valB = b.expected_goals_for_group; }
        else if (sk === 'ga') { valA = a.expected_goals_against_group; valB = b.expected_goals_against_group; }
        else if (sk === 'w') { valA = a.expected_wins_group; valB = b.expected_wins_group; }
        else if (sk === 'd') { valA = a.expected_draws_group; valB = b.expected_draws_group; }
        else if (sk === 'l') { valA = a.expected_losses_group; valB = b.expected_losses_group; }
        else if (sk === '1st') { valA = a.group_position_probs['1st']; valB = b.group_position_probs['1st']; }
        else if (sk === '2nd') { valA = a.group_position_probs['2nd']; valB = b.group_position_probs['2nd']; }
        else if (sk === '3rd') { valA = a.group_position_probs['3rd']; valB = b.group_position_probs['3rd']; }
        else if (sk === '4th') { valA = a.group_position_probs['4th']; valB = b.group_position_probs['4th']; }
        else if (sk === 'advance') { valA = a.advance_to_r32; valB = b.advance_to_r32; }
        
        if (valA === valB) {
           if (sk === 'points') {
              valA = a.expected_goal_diff; valB = b.expected_goal_diff;
           }
        }
        if (sd === 'asc') return valA - valB;
        return valB - valA;
     });
  };

  const prevGroupTeams = getPrevGroupTeams(activeGroup, sortKey, sortDir);
  
  const getPrevRank = (teamCode, prevList) => {
     if (!prevList || prevList.length === 0) return null;
     const idx = prevList.findIndex(t => t.team_code === teamCode);
     if (idx === -1) return null;
     return idx + 1;
  };

  // Calcular los 12 mejores probables terceros: Para cada grupo, el equipo más probable a ser 3ro
  const thirdPlaceProbables = [];
  allGroups.forEach(g => {
      const gTeams = groups[g] || [];
      if (gTeams.length === 0) return;
      // Encontramos al equipo con mayor probabilidad de quedar 3ro
      const best3rd = [...gTeams].sort((a,b) => b.group_position_probs['3rd'] - a.group_position_probs['3rd'])[0];
      
      thirdPlaceProbables.push({
         ...best3rd,
         expected_goal_diff: (best3rd.expected_goals_for_group || 0) - (best3rd.expected_goals_against_group || 0),
         thirdPlaceAdvanceProb: Math.max(0, best3rd.advance_to_r32 - (best3rd.group_position_probs['1st'] + best3rd.group_position_probs['2nd']))
      });
  });

  // Ordenar los 12 representantes de 3er lugar bajo criterios reales
  thirdPlaceProbables.sort((a,b) => {
      if (a.expected_points_group !== b.expected_points_group) return b.expected_points_group - a.expected_points_group;
      if (a.expected_goal_diff !== b.expected_goal_diff) return b.expected_goal_diff - a.expected_goal_diff;
      return (b.expected_goals_for_group || 0) - (a.expected_goals_for_group || 0);
  });

  const getPrevThirdPlaceProbables = () => {
     if (!prevResultData) return [];
     const groupsMap = {};
     Object.values(prevResultData.teams).forEach(t => {
       if (!groupsMap[t.group]) groupsMap[t.group] = [];
       groupsMap[t.group].push(t);
     });
     const thirdPlace = [];
     Object.keys(groupsMap).forEach(g => {
         const gTeams = groupsMap[g];
         const best3rd = [...gTeams].sort((a,b) => b.group_position_probs['3rd'] - a.group_position_probs['3rd'])[0];
         thirdPlace.push({
            ...best3rd,
            expected_goal_diff: (best3rd.expected_goals_for_group || 0) - (best3rd.expected_goals_against_group || 0)
         });
     });
     thirdPlace.sort((a,b) => {
         if (a.expected_points_group !== b.expected_points_group) return b.expected_points_group - a.expected_points_group;
         if (a.expected_goal_diff !== b.expected_goal_diff) return b.expected_goal_diff - a.expected_goal_diff;
         return (b.expected_goals_for_group || 0) - (a.expected_goals_for_group || 0);
     });
     return thirdPlace;
  };
  const prevThirdPlaceProbables = getPrevThirdPlaceProbables();

  return (
    <div className="animate-fade-in">
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {allGroups.map(g => (
            <button key={g} className="btn btn-noscale" onClick={() => setActiveGroup(g)} style={{ opacity: activeGroup === g ? 1 : 0.6, padding: '0.5rem 1rem', background: activeGroup === g ? 'var(--accent)' : 'rgba(255,255,255,0.05)' }}>
              Group {g}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '0.5rem' }}>
          <button className="btn" onClick={() => setViewMode('standings')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: viewMode === 'standings' ? 'var(--accent)' : 'transparent' }}>Probability Matrix</button>
          <button className="btn" onClick={() => setViewMode('stats')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: viewMode === 'stats' ? 'var(--accent)' : 'transparent' }}>Average Stats</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }}></span> Clasificado
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }}></span> Con Vida
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }}></span> Eliminado
        </div>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '1rem' }}>Group {activeGroup} {viewMode === 'standings' ? 'Probabilities' : 'Expected Averages'}</h3>
        
        {viewMode === 'standings' ? (
        <table className="custom-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '30px', textAlign: 'center' }}>#</th>
              <th style={{ width: '30%' }}>Team</th>
              <th onClick={() => handleSort('1st')} style={{ cursor: 'pointer' }}>1st Pl.{renderSortIcon('1st')}</th>
              <th onClick={() => handleSort('2nd')} style={{ cursor: 'pointer' }}>2nd Pl.{renderSortIcon('2nd')}</th>
              <th onClick={() => handleSort('3rd')} style={{ cursor: 'pointer' }}>3rd Pl.{renderSortIcon('3rd')}</th>
              <th onClick={() => handleSort('4th')} style={{ cursor: 'pointer' }}>4th Pl.{renderSortIcon('4th')}</th>
              <th onClick={() => handleSort('advance')} style={{ cursor: 'pointer' }}>Advance (R32){renderSortIcon('advance')}</th>
            </tr>
          </thead>
          <tbody>
            {groupTeams.map((t, index) => {
              const prev = prevResultData ? prevResultData.teams[t.team_code] : null;
              return (
              <tr key={t.team_code}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>{index + 1}</span>
                    {renderRankDiff(index + 1, getPrevRank(t.team_code, prevGroupTeams))}
                  </div>
                </td>
                <td className="team-cell" style={{ color: getTeamStatusColor(t.team_code, resultData) || 'inherit' }}>
                  {teamsMap[t.team_code]?.name || t.team_code}
                  {isPositionDefined(t.team_code, resultData) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                  <img src={getFlagUrl(t.team_code)} className="flag-icon" style={{ width: 16, height: 12, marginLeft: 8 }} />
                </td>
                <td className="highlight-cell">{renderProb(t.group_position_probs['1st'], prev?.group_position_probs['1st'])}</td>
                <td>{renderProb(t.group_position_probs['2nd'], prev?.group_position_probs['2nd'])}</td>
                <td style={{ color: 'var(--text-muted)' }}>{renderProb(t.group_position_probs['3rd'], prev?.group_position_probs['3rd'])}</td>
                <td style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{renderProb(t.group_position_probs['4th'], prev?.group_position_probs['4th'])}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{renderProb(t.advance_to_r32, prev?.advance_to_r32)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        ) : (
        <table className="custom-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '30px', textAlign: 'center' }}>#</th>
              <th style={{ width: '30%' }}>Team</th>
              <th onClick={() => handleSort('points')} style={{ cursor: 'pointer' }}>Pts{renderSortIcon('points')}</th>
              <th onClick={() => handleSort('w')} style={{ cursor: 'pointer' }}>W{renderSortIcon('w')}</th>
              <th onClick={() => handleSort('d')} style={{ cursor: 'pointer' }}>D{renderSortIcon('d')}</th>
              <th onClick={() => handleSort('l')} style={{ cursor: 'pointer' }}>L{renderSortIcon('l')}</th>
              <th onClick={() => handleSort('gf')} style={{ cursor: 'pointer' }}>GF{renderSortIcon('gf')}</th>
              <th onClick={() => handleSort('ga')} style={{ cursor: 'pointer' }}>GA{renderSortIcon('ga')}</th>
              <th onClick={() => handleSort('gd')} style={{ cursor: 'pointer' }}>GD{renderSortIcon('gd')}</th>
            </tr>
          </thead>
          <tbody>
            {groupTeams.map((t, index) => {
              const prev = prevResultData ? prevResultData.teams[t.team_code] : null;
              return (
              <tr key={t.team_code}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>{index + 1}</span>
                    {renderRankDiff(index + 1, getPrevRank(t.team_code, prevGroupTeams))}
                  </div>
                </td>
                <td className="team-cell" style={{ color: getTeamStatusColor(t.team_code, resultData) || 'inherit' }}>
                  {teamsMap[t.team_code]?.name || t.team_code}
                  {isPositionDefined(t.team_code, resultData) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                  <img src={getFlagUrl(t.team_code)} className="flag-icon" style={{ width: 16, height: 12, marginLeft: 8 }} />
                </td>
                <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{(t.expected_points_group || 0).toFixed(2)}</td>
                <td>{(t.expected_wins_group || 0).toFixed(2)}</td>
                <td>{(t.expected_draws_group || 0).toFixed(2)}</td>
                <td>{(t.expected_losses_group || 0).toFixed(2)}</td>
                <td style={{ color: 'var(--success)' }}>{(t.expected_goals_for_group || 0).toFixed(2)}</td>
                <td style={{ color: 'var(--danger)' }}>{(t.expected_goals_against_group || 0).toFixed(2)}</td>
                <td style={{ fontWeight: 'bold' }}>{(t.expected_goal_diff > 0 ? '+' : '')}{t.expected_goal_diff.toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      <div className="glass-card" style={{ marginTop: '2rem', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '1rem' }}>Global Best Third-Place Teams (Averages)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Teams are the single most probable 3rd-place finisher from each of the 12 groups. Ranked by tiebreaker averages.
        </p>
        
        <table className="custom-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th style={{ width: '30%' }}>Team</th>
              <th>Group</th>
              <th>Pts</th>
              <th>GD</th>
              <th>GF</th>
              <th>3rd Pl. Prob</th>
              <th style={{ color: 'var(--success)' }}>Advance as 3rd Prob</th>
            </tr>
          </thead>
          <tbody>
            {thirdPlaceProbables.map((t, idx) => {
              const prev = prevResultData ? prevResultData.teams[t.team_code] : null;
              let prev3rdAdvance = undefined;
              if (prev) {
                prev3rdAdvance = Math.max(0, prev.advance_to_r32 - (prev.group_position_probs['1st'] + prev.group_position_probs['2nd']));
              }
              return (
              <tr key={t.team_code} style={{ opacity: idx >= 8 ? 0.5 : 1 }}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>#{idx + 1}</span>
                    {renderRankDiff(idx + 1, getPrevRank(t.team_code, prevThirdPlaceProbables))}
                  </div>
                </td>
                <td className="team-cell" style={{ color: getTeamStatusColor(t.team_code, resultData) || 'inherit' }}>
                  {teamsMap[t.team_code]?.name || t.team_code}
                  <img src={getFlagUrl(t.team_code)} className="flag-icon" style={{ width: 16, height: 12, marginLeft: 8 }} />
                </td>
                <td>{t.group}</td>
                <td style={{ fontWeight: 'bold' }}>{(t.expected_points_group || 0).toFixed(2)}</td>
                <td>{(t.expected_goal_diff > 0 ? '+' : '')}{t.expected_goal_diff.toFixed(2)}</td>
                <td>{(t.expected_goals_for_group || 0).toFixed(2)}</td>
                <td>{renderProb(t.group_position_probs['3rd'], prev?.group_position_probs['3rd'])}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{renderProb(t.thirdPlaceAdvanceProb, prev3rdAdvance)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
