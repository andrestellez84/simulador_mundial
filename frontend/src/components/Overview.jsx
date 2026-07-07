import React, { useState, useEffect, useRef } from 'react';
import { getFlagUrl } from '../flagMap';
import { renderProb, renderRankDiff, getTeamStatusColor, isPositionDefined } from '../utils';
import { getSchedule, getLiveResults, getHistoryList, getHistorySnapshot } from '../api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts';

export default function Overview({ resultData, prevResultData, teamsList, actualStandings }) {
  const [sortKey, setSortKey] = useState('champion');
  const [sortDir, setSortDir] = useState('desc');
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation', 'classification', or 'history_timeline'

  // History timeline states
  const [historyTimelineData, setHistoryTimelineData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyProgress, setHistoryProgress] = useState({ current: 0, total: 0 });
  const [selectedHistoryTeams, setSelectedHistoryTeams] = useState(['FRA', 'ARG', 'BRA', 'MEX', 'ESP']);
  const [targetMetric, setTargetMetric] = useState('champion');
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);

  // GIF states
  const [gifDuration, setGifDuration] = useState(5);
  const [generatingGif, setGeneratingGif] = useState(false);

  const handleDownloadGif = async () => {
    if (selectedHistoryTeams.length === 0) {
      alert("Por favor selecciona al menos un equipo.");
      return;
    }
    setGeneratingGif(true);
    try {
      const teamsParam = selectedHistoryTeams.join(",");
      const url = `/api/history/generate_gif?teams=${teamsParam}&metric=${targetMetric}&duration=${gifDuration}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to generate GIF");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `probabilidades_${targetMetric}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Error generating GIF:", e);
      alert("Hubo un error al generar o descargar el GIF.");
    } finally {
      setGeneratingGif(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history_timeline' && historyTimelineData.length === 0 && !loadingHistory) {
      const loadAllHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await getHistoryList();
          const snapshots = (res.snapshots || []).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          
          if (snapshots.length > 0) {
            setHistoryProgress({ current: 0, total: snapshots.length });
            const loaded = [];
            for (let i = 0; i < snapshots.length; i++) {
              setHistoryProgress(prev => ({ ...prev, current: i + 1 }));
              const data = await getHistorySnapshot(snapshots[i].id);
              loaded.push({
                timestamp: snapshots[i].timestamp,
                label: snapshots[i].label,
                teams: data.teams || {}
              });
            }
            setHistoryTimelineData(loaded);
            setTimelineIndex(loaded.length - 1); // Start at latest
          }
        } catch (e) {
          console.error("Error loading history timeline:", e);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadAllHistory();
    }
  }, [activeTab]);

  // Handle player playback loop
  useEffect(() => {
    let interval = null;
    if (isPlaying && historyTimelineData.length > 0) {
      interval = setInterval(() => {
        setTimelineIndex(prev => {
          if (prev >= historyTimelineData.length - 1) {
            return 0; // Loop back to start
          }
          return prev + 1;
        });
      }, animationSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, historyTimelineData.length, animationSpeed]);

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

  const getCurrentTournamentStageKey = (matchesList) => {
    if (!matchesList || matchesList.length === 0) return 'r32';
    
    // 1. Check if group stage is finished
    const groupMatches = matchesList.filter(m => m.stage.startsWith("Group"));
    const groupFinished = groupMatches.length === 72 && groupMatches.every(m => m.result && typeof m.result.gh === 'number');
    if (!groupFinished) return 'r32';

    // 2. Check if R32 is finished
    const r32Matches = matchesList.filter(m => m.stage === "Round of 32");
    const r32Finished = r32Matches.length === 16 && r32Matches.every(m => m.result && typeof m.result.gh === 'number');
    if (!r32Finished) return 'r16';

    // 3. Check if R16 is finished
    const r16Matches = matchesList.filter(m => m.stage === "Round of 16");
    const r16Finished = r16Matches.length === 8 && r16Matches.every(m => m.result && typeof m.result.gh === 'number');
    if (!r16Finished) return 'qf';

    // 4. Check if QF is finished
    const qfMatches = matchesList.filter(m => m.stage === "Quarter-Finals");
    const qfFinished = qfMatches.length === 4 && qfMatches.every(m => m.result && typeof m.result.gh === 'number');
    if (!qfFinished) return 'sf';

    // 5. Check if SF is finished
    const sfMatches = matchesList.filter(m => m.stage === "Semi-Finals");
    const sfFinished = sfMatches.length === 2 && sfMatches.every(m => m.result && typeof m.result.gh === 'number');
    if (!sfFinished) return 'final';

    return 'champ';
  };

  const stageKey = getCurrentTournamentStageKey(matches);

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
        <button 
          className="btn" 
          onClick={() => setActiveTab('history_timeline')} 
          style={{ background: activeTab === 'history_timeline' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'history_timeline' ? 1 : 0.7 }}
        >
          Línea de Tiempo de Probabilidades
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
      ) : activeTab === 'classification' ? (
        <div style={{ overflowX: 'auto' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Clasificación General del Mundial</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Posiciones oficiales de los equipos basadas en la fase de grupos y eliminación directa.
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
                const teamsList = getGeneralClassification();
                return teamsList.map((t, index) => {
                  const isAlive = !elimStatus[t.code]?.eliminated;
                  return (
                    <tr key={t.code} style={{ opacity: isAlive ? 1 : 0.65 }}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td className="team-cell" style={{ paddingLeft: '1rem', fontWeight: 'bold' }}>
                        <img src={getFlagUrl(t.code)} alt={t.code} className="flag-icon" />
                        {t.name}
                        {!isAlive && <span style={{ fontSize: '0.65rem', color: '#ef4444', marginLeft: '4px' }}>(Eliminado)</span>}
                      </td>
                      <td style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 'bold' }}>{t.pts}</td>
                      <td style={{ textAlign: 'center' }}>{t.pj}</td>
                      <td style={{ textAlign: 'center' }}>{t.pg}</td>
                      <td style={{ textAlign: 'center' }}>{t.pe}</td>
                      <td style={{ textAlign: 'center' }}>{t.pp}</td>
                      <td style={{ textAlign: 'center' }}>{t.gf}</td>
                      <td style={{ textAlign: 'center' }}>{t.gc}</td>
                      <td style={{ textAlign: 'center', color: t.dif > 0 ? '#4ade80' : t.dif < 0 ? '#ef4444' : 'inherit', fontWeight: 'bold' }}>{t.dif > 0 ? `+${t.dif}` : t.dif}</td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: 'bold' }}>{t.rend.toFixed(1)}%</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'history_timeline' ? (
        loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--accent)', fontWeight: 'bold' }}>
              Cargando historial de probabilidades...
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Descargando instantánea {historyProgress.current} de {historyProgress.total}
            </div>
            <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${(historyProgress.current / historyProgress.total) * 100}%`, transition: 'width 0.1s ease-out' }} />
            </div>
          </div>
        ) : historyTimelineData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No se encontraron instantáneas de historial.
          </div>
        ) : (() => {
          const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#a855f7', '#06b6d4',
            '#6366f1', '#84cc16', '#22c55e', '#0ea5e9', '#d946ef'
          ];
          
          const chartData = historyTimelineData.map((s, idx) => {
            const row = { name: s.label };
            selectedHistoryTeams.forEach(code => {
              if (idx <= timelineIndex) {
                const val = s.teams[code]?.[targetMetric] || 0;
                row[code] = parseFloat((val * 100).toFixed(1));
              } else {
                row[code] = undefined; // Do not draw future points
              }
            });
            return row;
          });

          // Find max value plotted up to timelineIndex to scale Y-axis dynamically (+5% additional)
          let maxVal = 10;
          historyTimelineData.slice(0, timelineIndex + 1).forEach(s => {
            selectedHistoryTeams.forEach(code => {
              const val = (s.teams[code]?.[targetMetric] || 0) * 100;
              if (val > maxVal) {
                maxVal = val;
              }
            });
          });
          const computedMaxY = Math.min(100, Math.ceil(maxVal + 5));

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ color: 'var(--accent)', margin: 0 }}>Línea de Tiempo de Probabilidades</h2>
                  <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0', fontSize: '0.9rem' }}>
                    Visualiza y reproduce la evolución de las probabilidades de las selecciones a lo largo del torneo.
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Métrica:</span>
                  <select
                    value={targetMetric}
                    onChange={e => setTargetMetric(e.target.value)}
                    className="btn"
                    style={{ padding: '0.5rem 1rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                  >
                    <option value="champion">Campeón</option>
                    <option value="advance_to_final">Llegar a la Final</option>
                    <option value="advance_to_sf">Semifinales</option>
                    <option value="advance_to_qf">Cuartos de Final</option>
                    <option value="advance_to_r16">Octavos de Final</option>
                    <option value="advance_to_r32">Dieciseisavos (R32)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem', minHeight: '400px' }}>
                {/* Tendencia */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Tendencia Histórica</h3>
                  <div style={{ flex: 1, minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" fontSize={11} />
                        <YAxis stroke="#888" fontSize={11} unit="%" domain={[0, computedMaxY]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
                          formatter={(value) => `${value}%`}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        
                        {historyTimelineData[timelineIndex] && (
                          <ReferenceLine 
                            x={historyTimelineData[timelineIndex].label} 
                            stroke="var(--accent)" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                          />
                        )}

                        {selectedHistoryTeams.map((code, idx) => (
                          <Line
                            key={code}
                            type="monotone"
                            dataKey={code}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 2 }}
                            activeDot={{ r: 6 }}
                            name={teamsList?.find(t => t.code === code)?.name || code}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Reproductor y ranking */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {historyTimelineData[timelineIndex]?.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Snapshot {timelineIndex + 1} / {historyTimelineData.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn"
                        onClick={() => {
                          if (!isPlaying && timelineIndex >= historyTimelineData.length - 1) {
                            setTimelineIndex(0);
                          }
                          setIsPlaying(!isPlaying);
                        }}
                        style={{ 
                          background: isPlaying ? 'var(--danger)' : 'var(--success)', 
                          color: 'white', 
                          minWidth: '80px',
                          padding: '0.5rem 1rem' 
                        }}
                      >
                        {isPlaying ? 'Pausa' : 'Reproducir'}
                      </button>

                      <select
                        value={animationSpeed}
                        onChange={e => setAnimationSpeed(parseInt(e.target.value))}
                        className="btn"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        <option value={10000}>Súper Lento (10s)</option>
                        <option value={2000}>Lento (2s)</option>
                        <option value={1000}>Normal (1s)</option>
                        <option value={500}>Rápido (0.5s)</option>
                        <option value={250}>Súper Rápido (0.25s)</option>
                      </select>
                    </div>

                    {/* Controles para descargar GIF */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duración GIF:</span>
                        <select 
                          value={gifDuration}
                          onChange={e => setGifDuration(parseInt(e.target.value))}
                          className="btn"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: '80px' }}
                        >
                          <option value={3}>3 seg</option>
                          <option value={5}>5 seg</option>
                          <option value={10}>10 seg</option>
                          <option value={15}>15 seg</option>
                          <option value={20}>20 seg</option>
                        </select>
                      </div>
                      <button
                        className="btn"
                        onClick={handleDownloadGif}
                        disabled={generatingGif}
                        style={{ 
                          background: 'var(--accent)', 
                          color: 'black', 
                          fontSize: '0.75rem', 
                          padding: '0.4rem 0.8rem',
                          alignSelf: 'flex-end'
                        }}
                      >
                        {generatingGif ? 'Generando...' : 'Descargar GIF'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input 
                        type="range"
                        min="0"
                        max={historyTimelineData.length - 1}
                        value={timelineIndex}
                        onChange={e => {
                          setIsPlaying(false);
                          setTimelineIndex(parseInt(e.target.value));
                        }}
                        style={{ flex: 1, accentColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', maxHeight: '350px', paddingRight: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Ranking Probabilidades en esta fecha:
                    </h4>
                    {(() => {
                      const currentSnap = historyTimelineData[timelineIndex];
                      if (!currentSnap) return null;
                      
                      const sortedSlice = selectedHistoryTeams.map(code => {
                        const prob = currentSnap.teams[code]?.[targetMetric] || 0;
                        return { code, prob };
                      }).sort((a,b) => b.prob - a.prob);

                      if (sortedSlice.length === 0) {
                        return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Selecciona países abajo para comparar.</div>;
                      }

                      return sortedSlice.map(({ code, prob }, index) => {
                        const teamInfo = teamsList?.find(t => t.code === code);
                        const colorIndex = selectedHistoryTeams.indexOf(code);
                        const barColor = colors[colorIndex % colors.length] || 'var(--accent)';
                        
                        return (
                          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {index + 1}
                            </span>
                            <img src={getFlagUrl(code)} alt={code} style={{ width: '20px', height: '15px', borderRadius: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{teamInfo?.name || code}</span>
                                <span style={{ fontWeight: 'bold', color: barColor }}>{(prob * 100).toFixed(1)}%</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    background: barColor, 
                                    width: `${prob * 100}%`, 
                                    transition: 'width 0.3s ease-out' 
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Selección de Equipos */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Selección de Equipos</h3>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                      Selecciona qué países deseas incluir en la comparación (máximo 15 recomendados).
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn" 
                      onClick={() => setSelectedHistoryTeams(teamsList?.map(t => t.code) || [])}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--bg-dark)' }}
                    >
                      Seleccionar Todos
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => {
                        const alive = teamsList?.filter(t => !elimStatus[t.code]?.eliminated).map(t => t.code) || [];
                        setSelectedHistoryTeams(alive);
                      }}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--bg-dark)' }}
                    >
                      Solo Vivos
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => setSelectedHistoryTeams([])}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--bg-dark)' }}
                    >
                      Limpiar Todos
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {(teamsList || []).sort((a,b) => a.name.localeCompare(b.name)).map(t => {
                    const isSelected = selectedHistoryTeams.includes(t.code);
                    const isAlive = !elimStatus[t.code]?.eliminated;
                    return (
                      <div 
                        key={t.code}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHistoryTeams(selectedHistoryTeams.filter(c => c !== t.code));
                          } else {
                            setSelectedHistoryTeams([...selectedHistoryTeams, t.code]);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '4px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : isAlive ? 'rgba(255,255,255,0.08)' : 'rgba(239, 68, 68, 0.2)'}`,
                          cursor: 'pointer',
                          opacity: isAlive ? 1 : 0.6,
                          transition: 'all 0.15s ease'
                        }}
                        title={isAlive ? 'Activo en el torneo' : 'Eliminado'}
                      >
                        <img src={getFlagUrl(t.code)} alt={t.code} style={{ width: '16px', height: '12px' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.code}
                        </span>
                        {!isAlive && <span style={{ fontSize: '0.6rem', color: '#ef4444', marginLeft: 'auto' }}>❌</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
};
