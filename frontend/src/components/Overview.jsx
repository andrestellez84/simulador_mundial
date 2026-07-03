import React, { useState, useEffect } from 'react';
import { getFlagUrl } from '../flagMap';
import { renderProb, renderRankDiff, getTeamStatusColor, isPositionDefined } from '../utils';
import { getSchedule, getLiveResults } from '../api';

export default function Overview({ resultData, prevResultData, teamsList, actualStandings }) {
  const [sortKey, setSortKey] = useState('champion');
  const [sortDir, setSortDir] = useState('desc');
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' or 'classification'

  useEffect(() => {
    Promise.all([getSchedule(), getLiveResults()]).then(([scheduleRes, lrRes]) => {
      let lrList = lrRes.live_results || [];
      let updatedMatches = [...scheduleRes.matches];
      
      // Inject results using actualStandings
      for (let m of updatedMatches) {
        if (!m.result) {
          const isGroup = m.stage.startsWith("Group");
          let hCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || null);
          let aCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || null);
          if (hCode && aCode && teamsList?.some(t => t.code === hCode) && teamsList?.some(t => t.code === aCode)) {
            const liveMatch = lrList.find(res => (res.home === hCode && res.away === aCode) || (res.away === hCode && res.home === aCode));
            if (liveMatch) {
              let gh = liveMatch.home === hCode ? liveMatch.gh : liveMatch.ga;
              let ga = liveMatch.home === hCode ? liveMatch.ga : liveMatch.gh;
              m.result = { gh, ga, penalty_winner: liveMatch.penalty_winner || null };
            }
          }
        }
      }
      setMatches(updatedMatches);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading schedule/live results in Overview:", err);
      setLoading(false);
    });
  }, [teamsList, actualStandings]);

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

  const getTeamStats = () => {
    const stats = {};
    if (teamsList) {
      teamsList.forEach(t => {
        stats[t.code] = {
          code: t.code,
          name: t.name,
          pts: 0,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          dif: 0,
          rend: 0
        };
      });
    }

    matches.forEach(m => {
      if (m.result && typeof m.result.gh === 'number' && typeof m.result.ga === 'number') {
        const isGroup = m.stage.startsWith("Group");
        let hCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || null);
        let aCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || null);

        if (hCode && aCode && stats[hCode] && stats[aCode]) {
          const gh = m.result.gh;
          const ga = m.result.ga;

          stats[hCode].pj += 1;
          stats[aCode].pj += 1;
          stats[hCode].gf += gh;
          stats[hCode].gc += ga;
          stats[aCode].gf += ga;
          stats[aCode].gc += gh;

          if (gh > ga) {
            stats[hCode].pg += 1;
            stats[hCode].pts += 3;
            stats[aCode].pp += 1;
          } else if (gh < ga) {
            stats[aCode].pg += 1;
            stats[aCode].pts += 3;
            stats[hCode].pp += 1;
          } else {
            stats[hCode].pe += 1;
            stats[hCode].pts += 1;
            stats[aCode].pe += 1;
            stats[aCode].pts += 1;
          }
        }
      }
    });

    Object.values(stats).forEach(s => {
      s.dif = s.gf - s.gc;
      s.rend = s.pj > 0 ? (s.pts / (s.pj * 3)) * 100 : 0;
    });

    return stats;
  };

  const getEliminationStatus = () => {
    const status = {};
    if (teamsList) {
      teamsList.forEach(t => {
        status[t.code] = { eliminated: false, stage: 'alive', tier: 5 }; // default: alive in R32 (tier 5)
      });
    }

    // 1. Group Stage status
    const groupMatches = matches.filter(m => m.stage.startsWith("Group"));
    const allGroupFinished = groupMatches.length === 72 && groupMatches.every(m => m.result && typeof m.result.gh === 'number');

    if (allGroupFinished && actualStandings?.r32_bracket) {
      const qualified = new Set();
      for (let id = 73; id <= 88; id++) {
        const teams = actualStandings.r32_bracket[id];
        if (teams) {
          if (teams[0]) qualified.add(teams[0]);
          if (teams[1]) qualified.add(teams[1]);
        }
      }
      
      Object.keys(status).forEach(code => {
        if (!qualified.has(code)) {
          status[code] = { eliminated: true, stage: 'groups', tier: 3 }; // Eliminated in Group Stage
        } else {
          status[code] = { eliminated: false, stage: 'r32', tier: 5 }; // Alive in R32
        }
      });
    }

    // 2. Knockout matches trace
    for (let id = 73; id <= 104; id++) {
      const m = matches.find(match => match.id === id);
      if (m && m.result && typeof m.result.gh === 'number' && typeof m.result.ga === 'number') {
        const teams = actualStandings?.r32_bracket?.[id] || [m.home, m.away];
        const hCode = teams[0];
        const aCode = teams[1];
        if (hCode && aCode) {
          let winner = null;
          let loser = null;
          if (m.result.gh > m.result.ga) {
            winner = hCode;
            loser = aCode;
          } else if (m.result.gh < m.result.ga) {
            winner = aCode;
            loser = hCode;
          } else {
            if (m.result.penalty_winner) {
              winner = m.result.penalty_winner;
              loser = m.result.penalty_winner === hCode ? aCode : hCode;
            }
          }

          if (loser) {
            let stage = 'r32';
            let tier = 4;
            if (id >= 73 && id <= 88) { stage = 'r32'; tier = 4; }
            else if (id >= 89 && id <= 96) { stage = 'r16'; tier = 5; }
            else if (id >= 97 && id <= 100) { stage = 'qf'; tier = 6; }
            status[loser] = { eliminated: true, stage, tier };
          }
          
          if (winner) {
            let stage = 'r16';
            let tier = 6;
            if (id >= 73 && id <= 88) { stage = 'r16'; tier = 6; }
            else if (id >= 89 && id <= 96) { stage = 'qf'; tier = 7; }
            else if (id >= 97 && id <= 100) { stage = 'sf'; tier = 8; }
            else if (id >= 101 && id <= 102) { stage = 'final'; tier = 9; }
            
            if (!status[winner]?.eliminated) {
              status[winner] = { eliminated: false, stage, tier };
            }
          }
        }
      }
    }

    const m103 = matches.find(match => match.id === 103);
    if (m103 && m103.result && typeof m103.result.gh === 'number' && typeof m103.result.ga === 'number') {
      const teams = actualStandings?.r32_bracket?.[103] || [m103.home, m103.away];
      const hCode = teams[0];
      const aCode = teams[1];
      if (hCode && aCode) {
        let winner = m103.result.gh > m103.result.ga ? hCode : aCode;
        let loser = m103.result.gh > m103.result.ga ? aCode : hCode;
        if (m103.result.gh === m103.result.ga && m103.result.penalty_winner) {
          winner = m103.result.penalty_winner;
          loser = m103.result.penalty_winner === hCode ? aCode : hCode;
        }
        status[winner] = { eliminated: true, stage: '3rd', tier: 8 };
        status[loser] = { eliminated: true, stage: '4th', tier: 7 };
      }
    }

    const m104 = matches.find(match => match.id === 104);
    if (m104 && m104.result && typeof m104.result.gh === 'number' && typeof m104.result.ga === 'number') {
      const teams = actualStandings?.r32_bracket?.[104] || [m104.home, m104.away];
      const hCode = teams[0];
      const aCode = teams[1];
      if (hCode && aCode) {
        let winner = m104.result.gh > m104.result.ga ? hCode : aCode;
        let loser = m104.result.gh > m104.result.ga ? aCode : hCode;
        if (m104.result.gh === m104.result.ga && m104.result.penalty_winner) {
          winner = m104.result.penalty_winner;
          loser = m104.result.penalty_winner === hCode ? aCode : hCode;
        }
        status[winner] = { eliminated: false, stage: 'champion', tier: 10 };
        status[loser] = { eliminated: true, stage: 'runner_up', tier: 9 };
      }
    }

    return status;
  };

  const getGeneralClassification = () => {
    const stats = getTeamStats();
    const elimStatus = getEliminationStatus();
    
    return Object.values(stats).sort((a, b) => {
      const tierA = elimStatus[a.code]?.tier ?? 5;
      const tierB = elimStatus[b.code]?.tier ?? 5;
      
      if (tierA !== tierB) return tierB - tierA; // Higher tier first
      
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.dif !== b.dif) return b.dif - a.dif;
      if (a.gf !== b.gf) return b.gf - a.gf;
      
      const tA = resultData.teams[a.code];
      const tB = resultData.teams[b.code];
      const eloA = tA?.elo || 1500;
      const eloB = tB?.elo || 1500;
      return eloB - eloA;
    });
  };

  const getSortedTeams = (dataObj) => {
    if (!dataObj) return [];
    
    const genClass = getGeneralClassification();
    const elimStatus = getEliminationStatus();
    
    return Object.values(dataObj.teams).sort((a, b) => {
       const isEliminatedA = elimStatus[a.team_code]?.eliminated;
       const isEliminatedB = elimStatus[b.team_code]?.eliminated;
       
       if (isEliminatedA && isEliminatedB) {
          const idxA = genClass.findIndex(t => t.code === a.team_code);
          const idxB = genClass.findIndex(t => t.code === b.team_code);
          return idxA - idxB;
       }
       if (isEliminatedA && !isEliminatedB) return 1;
       if (!isEliminatedA && isEliminatedB) return -1;
       
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
  const elimStatus = getEliminationStatus();

  const isGroupStageFinished = Object.values(resultData.teams).every(t => t.advance_to_r32 < 0.001 || t.advance_to_r32 > 0.999);
  const stageKey = isGroupStageFinished ? 'r16' : 'r32';

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
                const isEliminated = elimStatus[t.team_code]?.eliminated;
                
                return (
                  <tr key={t.team_code} style={{ opacity: isEliminated ? 0.65 : 1 }}>
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
                    <td className="team-cell" style={{ paddingLeft: '1rem', color: getTeamStatusColor(t.team_code, resultData, stageKey) || 'inherit' }}>
                      <img src={getFlagUrl(t.team_code)} alt={t.team_code} className="flag-icon" />
                      {t.team_code}
                      {getTeamStatusColor(t.team_code, resultData, stageKey) === '#4ade80' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                      {isEliminated && <span style={{ fontSize: '0.65rem', color: '#ef4444', marginLeft: '4px' }}>[ELIM]</span>}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{t.group}</td>
                    <td>{renderProb(t.group_position_probs['1st'], prev?.group_position_probs['1st'])}</td>
                    <td>{renderProb(t.advance_to_r32, prev?.advance_to_r32)}</td>
                    <td>{renderProb(t.advance_to_r16, prev?.advance_to_r16)}</td>
                    <td>{renderProb(t.advance_to_qf, prev?.advance_to_qf)}</td>
                    <td>{renderProb(t.advance_to_sf, prev?.advance_to_sf)}</td>
                    <td>{renderProb(t.advance_to_final, prev?.advance_to_final)}</td>
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
      
      {/* Selector de pestañas */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <button 
          className="btn" 
          onClick={() => setActiveTab('simulation')} 
          style={{ background: activeTab === 'simulation' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'simulation' ? 1 : 0.7 }}
        >
          World Cup Simulation Overview
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('classification')} 
          style={{ background: activeTab === 'classification' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'classification' ? 1 : 0.7 }}
        >
          Clasificación General
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando datos del torneo...</div>
      ) : activeTab === 'simulation' ? (
        <>
          <h2 style={{ marginBottom: '2rem', color: 'var(--accent)' }}>World Cup Simulation Overview</h2>
          {renderTable('Top 16 Favorites', 0, 16)}
          {renderTable('Contenders (17 - 32)', 16, 32)}
          {renderTable('Underdogs (33 - 48)', 32, 48)}
        </>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Clasificación General del Mundial</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Posiciones oficiales de los equipos basadas en la fase de grupos y eliminación directa. Los eliminados se ubican de acuerdo a la ronda de eliminación y rendimiento oficial.
          </p>
          <table className="custom-table" style={{ fontSize: '0.9rem', width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
                <th style={{ textAlign: 'left', paddingLeft: '1rem' }}>EQUIPO</th>
                <th style={{ textAlign: 'center' }}>PTS</th>
                <th style={{ textAlign: 'center' }}>PJ</th>
                <th style={{ textAlign: 'center' }}>PG</th>
                <th style={{ textAlign: 'center' }}>PE</th>
                <th style={{ textAlign: 'center' }}>PP</th>
                <th style={{ textAlign: 'center' }}>GF</th>
                <th style={{ textAlign: 'center' }}>GC</th>
                <th style={{ textAlign: 'center' }}>DIF</th>
                <th style={{ textAlign: 'right', paddingRight: '1rem' }}>REND</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const genClass = getGeneralClassification();
                return genClass.map((t, idx) => {
                  const rank = idx + 1;
                  const isElim = elimStatus[t.code]?.eliminated;
                  
                  return (
                    <tr key={t.code} style={{ opacity: isElim ? 0.65 : 1, color: isElim ? 'var(--text-muted)' : 'inherit' }}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{rank}</td>
                      <td className="team-cell" style={{ paddingLeft: '1rem', fontWeight: isElim ? 'normal' : 'bold' }}>
                        <img src={getFlagUrl(t.code)} alt={t.code} className="flag-icon" />
                        {t.name}
                        {isElim && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: '6px' }}>(Eliminado)</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{t.pts}</td>
                      <td style={{ textAlign: 'center' }}>{t.pj}</td>
                      <td style={{ textAlign: 'center' }}>{t.pg}</td>
                      <td style={{ textAlign: 'center' }}>{t.pe}</td>
                      <td style={{ textAlign: 'center' }}>{t.pp}</td>
                      <td style={{ textAlign: 'center' }}>{t.gf}</td>
                      <td style={{ textAlign: 'center' }}>{t.gc}</td>
                      <td style={{ textAlign: 'center', color: t.dif > 0 ? '#4ade80' : t.dif < 0 ? '#ef4444' : 'inherit', fontWeight: 'bold' }}>
                        {t.dif > 0 ? `+${t.dif}` : t.dif}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: 'bold' }}>{t.rend.toFixed(1)}%</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
