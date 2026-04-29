import React, { useState } from 'react';
import { getFlagUrl } from '../flagMap';

export default function Overview({ resultData, teamsList }) {
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

  const { teams } = resultData;
  const sortedTeams = Object.values(teams).sort((a, b) => {
     let valA = 0; let valB = 0;
     if (sortKey === 'win_group') { valA = a.group_position_probs['1st']; valB = b.group_position_probs['1st']; }
     else if (sortKey === 'advance_r32') { valA = a.advance_to_r32; valB = b.advance_to_r32; }
     else if (sortKey === 'advance_r16') { valA = a.advance_to_r16; valB = b.advance_to_r16; }
     else if (sortKey === 'advance_qf') { valA = a.advance_to_qf; valB = b.advance_to_qf; }
     else if (sortKey === 'advance_sf') { valA = a.advance_to_sf; valB = b.advance_to_sf; }
     else if (sortKey === 'advance_final') { valA = a.advance_to_final; valB = b.advance_to_final; }
     else if (sortKey === 'champion') { valA = a.champion; valB = b.champion; }
     
     if (valA === valB) {
        // Fallback hierarchy if equal
        if (sortKey === 'champion') {
           valA = a.advance_to_final * 1000 + a.advance_to_sf * 100 + a.advance_to_qf * 10 + a.advance_to_r16;
           valB = b.advance_to_final * 1000 + b.advance_to_sf * 100 + b.advance_to_qf * 10 + b.advance_to_r16;
        }
     }
     
     if (sortDir === 'asc') return valA - valB;
     return valB - valA;
  });

  return (
    <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Top 15 Favorites to Win</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
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
            {sortedTeams.slice(0, 15).map((t) => (
              <tr key={t.team_code}>
                <td className="team-cell" style={{ paddingLeft: '1rem' }}>
                  <img src={getFlagUrl(t.team_code)} alt={t.team_code} className="flag-icon" />
                  {t.team_code}
                </td>
                <td style={{ fontWeight: 'bold' }}>{t.group}</td>
                <td>{(t.group_position_probs['1st'] * 100).toFixed(1)}%</td>
                <td>{(t.advance_to_r32 * 100).toFixed(1)}%</td>
                <td>{(t.advance_to_r16 * 100).toFixed(1)}%</td>
                <td>{(t.advance_to_qf * 100).toFixed(1)}%</td>
                <td>{(t.advance_to_sf * 100).toFixed(1)}%</td>
                <td style={{ color: 'var(--accent)' }}>{(t.advance_to_final * 100).toFixed(1)}%</td>
                <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{(t.champion * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
