import React, { useState } from 'react';
import { getFlagUrl } from '../flagMap';
import { renderProb, renderRankDiff, getTeamStatusColor, isPositionDefined } from '../utils';

export default function Overview({ resultData, prevResultData, teamsList }) {
  const [sortKey, setSortKey] = useState('champion');
  const [sortDir, setSortDir] = useState('desc');

  if (!resultData) {
    return <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>No simulation data available. Configure and run a simulation.</div>
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  
  const renderSortIndicator = (key) => {
    if (sortKey !== key) return null;
    return <span style={{ marginLeft: '5px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const getSortedTeams = (dataObj) => {
    if (!dataObj) return [];
    return Object.values(dataObj.teams).sort((a, b) => {
       let valA = 0; let valB = 0;
       if (sortKey === 'win_group') { valA = a.group_position_probs['1st']; valB = b.group_position_probs['1st']; }
       else if (sortKey === 'advance_r32') { valA = a.advance_to_r32; valB = b.advance_to_r32; }
       else if (sortKey === 'advance_r16') { valA = a.advance_to_r16; valB = b.advance_to_r16; }
       else if (sortKey === 'advance_qf') { valA = a.advance_to_qf; valB = b.advance_to_qf; }
       else if (sortKey === 'advance_sf') { valA = a.advance_to_sf; valB = b.advance_to_sf; }
       else if (sortKey === 'advance_final') { valA = a.advance_to_final; valB = b.advance_to_final; }
       else if (sortKey === 'champion') { valA = a.champion; valB = b.champion; }
       
       if (valA === valB) {
          if (sortKey === 'champion') {
             valA = a.advance_to_final * 1000 + a.advance_to_sf * 100 + a.advance_to_qf * 10 + a.advance_to_r16;
             valB = b.advance_to_final * 1000 + b.advance_to_sf * 100 + b.advance_to_qf * 10 + b.advance_to_r16;
          }
       }
       
       if (sortDir === 'asc') return valA - valB;
       return valB - valA;
    });
  };

  const sortedTeams = getSortedTeams(resultData);
  const prevSortedTeams = getSortedTeams(prevResultData);

  const renderTable = (title, start, end) => {
    const slice = sortedTeams.slice(start, end);
    if (slice.length === 0) return null;

    return (
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>{title}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
                <th style={{ textAlign: 'left', paddingLeft: '1rem' }}>TEAM</th>
                <th>GROUP</th>
                <th onClick={() => handleSort('win_group')} style={{ cursor: 'pointer' }}>WIN GROUP {renderSortIndicator('win_group')}</th>
                <th onClick={() => handleSort('advance_r32')} style={{ cursor: 'pointer' }}>ADVANCE (R32) {renderSortIndicator('advance_r32')}</th>
                <th onClick={() => handleSort('advance_r16')} style={{ cursor: 'pointer' }}>ADVANCE (R16) {renderSortIndicator('advance_r16')}</th>
                <th onClick={() => handleSort('advance_qf')} style={{ cursor: 'pointer' }}>QUARTERFINALS {renderSortIndicator('advance_qf')}</th>
                <th onClick={() => handleSort('advance_sf')} style={{ cursor: 'pointer' }}>SEMIFINALS {renderSortIndicator('advance_sf')}</th>
                <th onClick={() => handleSort('advance_final')} style={{ cursor: 'pointer' }}>FINAL {renderSortIndicator('advance_final')}</th>
                <th onClick={() => handleSort('champion')} style={{ cursor: 'pointer', color: 'var(--success)' }}>CHAMPION {renderSortIndicator('champion')}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((t, index) => {
                const rank = start + index + 1;
                const prev = prevResultData ? prevResultData.teams[t.team_code] : null;
                return (
                  <tr key={t.team_code}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span>{rank}</span>
                        {(() => {
                           if (!prevResultData || prevSortedTeams.length === 0) return null;
                           const idx = prevSortedTeams.findIndex(pt => pt.team_code === t.team_code);
                           if (idx === -1) return null;
                           return renderRankDiff(rank, idx + 1);
                        })()}
                      </div>
                    </td>
                    <td className="team-cell" style={{ paddingLeft: '1rem', color: getTeamStatusColor(t.team_code, resultData) || 'inherit' }}>
                      <img src={getFlagUrl(t.team_code)} alt={t.team_code} className="flag-icon" />
                      {t.team_code}
                      {isPositionDefined(t.team_code, resultData) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{t.group}</td>
                    <td>{renderProb(t.group_position_probs['1st'], prev?.group_position_probs['1st'])}</td>
                    <td>{renderProb(t.advance_to_r32, prev?.advance_to_r32)}</td>
                    <td>{renderProb(t.advance_to_r16, prev?.advance_to_r16)}</td>
                    <td>{renderProb(t.advance_to_qf, prev?.advance_to_qf)}</td>
                    <td>{renderProb(t.advance_to_sf, prev?.advance_to_sf)}</td>
                    <td style={{ color: 'var(--accent)' }}>{renderProb(t.advance_to_final, prev?.advance_to_final)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{renderProb(t.champion, prev?.champion)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--accent)' }}>World Cup Simulation Overview</h2>
      {renderTable('Top 16 Favorites', 0, 16)}
      {renderTable('Contenders (17 - 32)', 16, 32)}
      {renderTable('Underdogs (33 - 48)', 32, 48)}
    </div>
  );
}
