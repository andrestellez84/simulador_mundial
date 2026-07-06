import React, { useState, useEffect, useMemo } from 'react';
import { getSchedule, getLiveResults, postLiveResult, postSyncLiveResults, getPrediction } from '../api';
import { getFlagUrl } from '../flagMap';
import { resolveTeamByPosition, renderProb, getTeamStatusColor } from '../utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function Schedule({ onDataChange, activeInputs, resultData, teamsList, actualStandings }) {

  const [matches, setMatches] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedStrat, setExpandedStrat] = useState(null);

  // States para inputs [match_id] -> { gh, ga }
  const [inputs, setInputs] = useState({});
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    fetchData();
  }, [activeInputs, resultData, teamsList, actualStandings]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const scheduleRes = await getSchedule();
      
      const lrRes = await getLiveResults();
      let lrList = lrRes.live_results || [];
      
      let updatedMatches = [...scheduleRes.matches];
      for (let m of updatedMatches) {
          // ONLY inject result if both teams are officially resolved (no modal_bracket fallback)
          if (!m.result) {
              const isGroup = m.stage.startsWith("Group");
              let hCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || null);
              let aCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || null);
              
              if (hCode && aCode && teamsList?.some(t => t.code === hCode) && teamsList?.some(t => t.code === aCode)) {
                  const liveMatch = lrList.find(res => (res.home === hCode && res.away === aCode) || (res.away === hCode && res.home === aCode));
                  if (liveMatch) {
                      let gh = liveMatch.home === hCode ? liveMatch.gh : liveMatch.ga;
                      let ga = liveMatch.home === hCode ? liveMatch.ga : liveMatch.gh;
                      
                      let surprise = 0;
                      let surpriser = null;
                      if (m.predictions) {
                          let p_actual = gh > ga ? m.predictions.p_home : (gh < ga ? m.predictions.p_away : m.predictions.p_draw);
                          surprise = 1.0 - p_actual;
                          surpriser = gh > ga ? hCode : (gh < ga ? aCode : (m.predictions.p_home < m.predictions.p_away ? hCode : aCode));
                      } else {
                          // If no predictions (knockout match), fetch them real quick to calculate surprise
                          try {
                              const pred = await getPrediction(hCode, aCode, m.id);
                              m.predictions = {
                                  p_home: pred.win_prob,
                                  p_draw: pred.draw_prob,
                                  p_away: pred.loss_prob,
                                  top_scores: pred.top_scores,
                                  elo_home: pred.home_elo,
                                  elo_away: pred.away_elo,
                                  extra_elo_home: pred.extra_elo_home,
                                  extra_elo_away: pred.extra_elo_away
                              };
                              let p_actual = gh > ga ? m.predictions.p_home : (gh < ga ? m.predictions.p_away : m.predictions.p_draw);
                              surprise = 1.0 - p_actual;
                              surpriser = gh > ga ? hCode : (gh < ga ? aCode : (pred.win_prob < pred.loss_prob ? hCode : aCode));
                          } catch(e) {}
                      }
                      m.result = { gh, ga, surprise, surpriser };
                  }
              }
          }
      }
      
      setMatches(updatedMatches);
      setLiveResults(lrList);
      
      // Inyectar en inputs lo que ya está guardado
      const initialInputs = {};
      lrList.forEach(res => {
        const match = scheduleRes.matches.find(m => {
          const isGroup = m.stage.startsWith("Group");
          let hCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || null);
          let aCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || null);
          if (!hCode || !aCode) return false;
          return (hCode === res.home && aCode === res.away) || (hCode === res.away && aCode === res.home);
        });
        
        if (match) {
          const isGroup = match.stage.startsWith("Group");
          let hCode = isGroup ? match.home : (actualStandings?.r32_bracket?.[match.id]?.[0] || match.home);
          initialInputs[match.id] = { 
            gh: hCode === res.home ? res.gh : res.ga, 
            ga: hCode === res.home ? res.ga : res.gh,
            penalty_winner: res.penalty_winner || null
          };
        }
      });
      setInputs(initialInputs);
    } catch(err) {
      console.error("Error loading Match Calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (matchId, home, away) => {
    const val = inputs[matchId];
    if (!val || val.gh === '' || val.ga === '' || val.gh === undefined || val.ga === undefined) return;
    
    const isGroup = matches.find(m => m.id === matchId)?.stage.startsWith("Group");
    if (!isGroup && parseInt(val.gh) === parseInt(val.ga) && !val.penalty_winner) {
        alert("Por favor selecciona el ganador de la tanda de penales.");
        return;
    }
    
    await postLiveResult(home, away, parseInt(val.gh), parseInt(val.ga), val.penalty_winner || null);
    if (onDataChange) onDataChange();
    fetchData();
  };

  const handleClear = async (matchId, home, away) => {
    await postLiveResult(home, away, null, null);
    setInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[matchId];
        return newInputs;
    });
    if (onDataChange) onDataChange();
    fetchData();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await postSyncLiveResults();
      if (onDataChange) onDataChange();
      await fetchData();
      alert(res.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateInput = (matchId, key, value) => {
    setInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [key]: value
      }
    }));
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Match Calendar...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2 style={{ color: 'var(--accent)' }}>Live Match Center (All 104 Matches)</h2>
           <p style={{ color: 'var(--text-muted)' }}>Inject real-life scores into the simulation paths.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          {activeInputs ? (
              <div style={{ color: '#ef4444', fontWeight: 'bold' }}>Solo Lectura (Viaje en el Tiempo)</div>
          ) : (
          <button className="btn" onClick={handleSync} disabled={isSyncing} style={{ background: 'var(--accent)', minWidth: '220px', position: 'relative', overflow: 'hidden' }}>
            {isSyncing ? 'Scraping Eloratings...' : 'Live Web Scrape (Auto Update)'}
            {isSyncing && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: 'white', width: '100%', animation: 'loading-bar 1.5s infinite linear' }}></div>
            )}
          </button>
          )}
          {isSyncing && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>This takes ~5 seconds...</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className="btn" 
          onClick={() => setActiveTab('editor')} 
          style={{ background: activeTab === 'editor' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'editor' ? 1 : 0.7 }}
        >
          Match Editor
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('surprise')} 
          style={{ background: activeTab === 'surprise' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'surprise' ? 1 : 0.7 }}
        >
          Ranking de Sorpresas
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('confederations')} 
          style={{ background: activeTab === 'confederations' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'confederations' ? 1 : 0.7 }}
        >
          Desempeño por Confederación
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('betting')} 
          style={{ background: activeTab === 'betting' ? 'var(--accent)' : 'var(--bg-dark)', opacity: activeTab === 'betting' ? 1 : 0.7 }}
        >
          Simulador de Apuestas
        </button>
      </div>

      {activeTab === 'editor' ? (
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Match #</th>
              <th>Date & Venue</th>
              <th>Stage</th>
              <th style={{ textAlign: 'right', width: '25%' }}>Home</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Score</th>
              <th style={{ width: '25%' }}>Away</th>
              <th>Deploy</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => (
              <tr key={m.id} onMouseEnter={() => setHoveredMatch(m.id)} onMouseLeave={() => setHoveredMatch(null)} style={{ position: 'relative' }}>
                <td style={{ color: 'var(--text-muted)' }}>{m.id}</td>
                <td>
                   <div style={{ fontWeight: 'bold' }}>{m.date}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.time}</div>
                   <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{m.venue}</div>
                </td>
                <td>
                   <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem' }}>
                     {m.stage}
                   </span>
                </td>
                
                <td style={{ textAlign: 'right' }} className="team-cell">
                  {(() => {
                    const isGroup = m.stage.startsWith("Group");
                    const homeCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || m.home);
                    const tInfo = teamsList?.find(t => t.code === homeCode);
                    const displayName = tInfo ? tInfo.name : (m.home_name !== "-" ? m.home_name : m.home);
                    const showFlag = teamsList?.some(t => t.code === homeCode);
                    return (
                      <>
                        {displayName}
                        {showFlag && <img src={getFlagUrl(homeCode)} className="flag-icon" style={{ marginLeft: 8, marginRight: 0 }} />}
                      </>
                    );
                  })()}
                </td>

                <td style={{ textAlign: 'center' }}>
                  {(() => {
                    const isGroup = m.stage.startsWith("Group");
                    const homeCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || m.home);
                    const awayCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || m.away);
                    const showHomeFlag = teamsList?.some(t => t.code === homeCode);
                    const showAwayFlag = teamsList?.some(t => t.code === awayCode);
                    
                    const tInfoHome = teamsList?.find(t => t.code === homeCode);
                    const tInfoAway = teamsList?.find(t => t.code === awayCode);
                    const homeName = tInfoHome ? tInfoHome.name : homeCode;
                    const awayName = tInfoAway ? tInfoAway.name : awayCode;
                    
                    const isDraw = inputs[m.id]?.gh !== '' && inputs[m.id]?.ga !== '' && inputs[m.id]?.gh !== undefined && inputs[m.id]?.ga !== undefined && parseInt(inputs[m.id]?.gh) === parseInt(inputs[m.id]?.ga);
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <input 
                            type="number" min="0" max="20"
                            style={{ width: '40px', padding: '0.3rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '3px', textAlign: 'center' }}
                            value={inputs[m.id]?.gh ?? ''} 
                            disabled={!showHomeFlag || !showAwayFlag || !!activeInputs}
                            onChange={e => updateInput(m.id, 'gh', e.target.value)}
                          />
                          <span>-</span>
                          <input 
                            type="number" min="0" max="20"
                            style={{ width: '40px', padding: '0.3rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '3px', textAlign: 'center' }}
                            value={inputs[m.id]?.ga ?? ''}
                            disabled={!showHomeFlag || !showAwayFlag || !!activeInputs}
                            onChange={e => updateInput(m.id, 'ga', e.target.value)}
                          />
                        </div>
                        {!isGroup && isDraw && (
                          <select
                            value={inputs[m.id]?.penalty_winner ?? ''}
                            disabled={!showHomeFlag || !showAwayFlag || !!activeInputs}
                            onChange={e => updateInput(m.id, 'penalty_winner', e.target.value)}
                            style={{
                              marginTop: '0.3rem',
                              display: 'block',
                              width: '120px',
                              padding: '0.2rem',
                              background: 'var(--bg-dark)',
                              color: 'white',
                              border: '1px solid var(--border-color)',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              textAlign: 'center'
                            }}
                          >
                            <option value="">-- Ganador Penales --</option>
                            <option value={homeCode}>{homeName}</option>
                            <option value={awayCode}>{awayName}</option>
                          </select>
                        )}
                      </div>
                    );
                  })()}
                </td>

                <td className="team-cell">
                  {(() => {
                    const isGroup = m.stage.startsWith("Group");
                    const awayCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || m.away);
                    const tInfo = teamsList?.find(t => t.code === awayCode);
                    const displayName = tInfo ? tInfo.name : (m.away_name !== "-" ? m.away_name : m.away);
                    const showFlag = teamsList?.some(t => t.code === awayCode);
                    return (
                      <>
                        {showFlag && <img src={getFlagUrl(awayCode)} className="flag-icon" style={{ marginRight: 8, marginLeft: 0 }} />}
                        {displayName}
                      </>
                    );
                  })()}
                </td>
                
                <td>
                   {(() => {
                     const isGroup = m.stage.startsWith("Group");
                     const homeCode = isGroup ? m.home : (actualStandings?.r32_bracket?.[m.id]?.[0] || m.home);
                     const awayCode = isGroup ? m.away : (actualStandings?.r32_bracket?.[m.id]?.[1] || m.away);
                     const showHomeFlag = teamsList?.some(t => t.code === homeCode);
                     const showAwayFlag = teamsList?.some(t => t.code === awayCode);
                     return !activeInputs && (
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <button 
                             className="btn" 
                             onClick={() => handleOverride(m.id, homeCode, awayCode)}
                             disabled={!showHomeFlag || !showAwayFlag}
                             style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'var(--success)' }}>
                             Save Mode
                           </button>
                           <button 
                             className="btn" 
                             onClick={() => handleClear(m.id, homeCode, awayCode)}
                             disabled={!showHomeFlag || !showAwayFlag}
                             style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'var(--danger)' }}>
                             Clear
                           </button>
                       </div>
                     );
                   })()}
                </td>
                
                {/* TOOLTIP DE PREDICCIONES */}
                {hoveredMatch === m.id && m.predictions && (
                   <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      zIndex: 100,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      width: '300px',
                      pointerEvents: 'none'
                   }}>
                      <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Expected Outcomes</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1</div>
                            <div style={{ fontWeight: 'bold' }}>{(m.predictions.p_home * 100).toFixed(1)}%</div>
                         </div>
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>X</div>
                            <div style={{ fontWeight: 'bold' }}>{(m.predictions.p_draw * 100).toFixed(1)}%</div>
                         </div>
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>2</div>
                            <div style={{ fontWeight: 'bold' }}>{(m.predictions.p_away * 100).toFixed(1)}%</div>
                         </div>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                         {m.predictions.top_scores.map((score, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                               <span style={{ color: 'var(--text-muted)' }}>Score {score.score}</span>
                               <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{(score.prob * 100).toFixed(1)}%</span>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : activeTab === 'surprise' ? (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Ranking Histórico de Sorpresas</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Partidos ordenados del resultado más sorpresivo al más predecible según las expectativas pre-partido.
          </p>
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th>Partido</th>
                <th>Marcador</th>
                <th>Índice Sorpresa</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const results = matches.filter(m => m.result).sort((a, b) => b.result.surprise - a.result.surprise);
                if (results.length === 0) return <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay partidos con resultado oficial. Ingresa un resultado en el Match Editor para ver datos.</td></tr>;
                return results.map((m, idx) => {
                  // Resolve team codes/names for knockout matches
                  const isGroup = m.stage.startsWith("Group");
                  let homeCode = null;
                  let awayCode = null;
                  if (!isGroup && actualStandings?.r32_bracket?.[m.id]) {
                    homeCode = actualStandings.r32_bracket[m.id][0];
                    awayCode = actualStandings.r32_bracket[m.id][1];
                  }
                  
                  if (!homeCode) {
                    const rHome = resolveTeamByPosition(m.home, resultData, teamsList);
                    homeCode = rHome ? rHome.code : m.home;
                  }
                  if (!awayCode) {
                    const rAway = resolveTeamByPosition(m.away, resultData, teamsList);
                    awayCode = rAway ? rAway.code : m.away;
                  }
                  
                  const homeTeamInfo = teamsList?.find(t => t.code === homeCode);
                  const awayTeamInfo = teamsList?.find(t => t.code === awayCode);
                  const homeName = homeTeamInfo ? homeTeamInfo.name : (m.home_name !== "-" ? m.home_name : homeCode);
                  const awayName = awayTeamInfo ? awayTeamInfo.name : (m.away_name !== "-" ? m.away_name : awayCode);
                  return (
                    <tr key={m.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="team-cell">
                        <img src={getFlagUrl(homeCode)} className="flag-icon" style={{ width: 16, height: 12, marginRight: 8 }} />
                        {homeName} vs {awayName}
                        <img src={getFlagUrl(awayCode)} className="flag-icon" style={{ width: 16, height: 12, marginLeft: 8 }} />
                      </td>
                      <td style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>{m.result.gh} - {m.result.ga}</td>
                      <td style={{ 
                        fontWeight: 'bold', 
                        fontSize: '1.1rem',
                        color: m.result.surprise > 0.7 ? '#ef4444' : m.result.surprise > 0.4 ? '#fbbf24' : 'var(--text-muted)' 
                      }}>
                        {(m.result.surprise * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'confederations' ? (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '60px' }}>#</th>
                <th>Confederación</th>
                <th style={{ textAlign: 'center' }}>Partidos Jugados</th>
                <th style={{ textAlign: 'center' }}>Puntos Obtenidos</th>
                <th style={{ textAlign: 'center' }}>Puntos Esperados</th>
                <th style={{ textAlign: 'center' }}>Puntos Posibles</th>
                <th style={{ textAlign: 'right' }}>Efectividad</th>
                <th style={{ textAlign: 'right' }}>Efectividad Esp.</th>
                <th style={{ textAlign: 'right' }}>Ratio (Ef/EfEsp)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                 const stats = {};
                 
                 if (teamsList) {
                   teamsList.forEach(t => {
                     if (!stats[t.confederation]) {
                       stats[t.confederation] = { matchesPlayed: 0, points: 0, expectedPoints: 0 };
                     }
                   });
                 }
             
                 matches.forEach(m => {
                    if (m.result && typeof m.result.gh === 'number' && typeof m.result.ga === 'number') {
                      const isGroup = m.stage.startsWith("Group");
                      let homeCode = null;
                      let awayCode = null;
                      if (!isGroup && actualStandings?.r32_bracket?.[m.id]) {
                        homeCode = actualStandings.r32_bracket[m.id][0];
                        awayCode = actualStandings.r32_bracket[m.id][1];
                      }
                      
                      if (!homeCode) {
                        const resolvedHome = resolveTeamByPosition(m.home, resultData, teamsList);
                        homeCode = resolvedHome ? resolvedHome.code : m.home;
                      }
                      if (!awayCode) {
                        const resolvedAway = resolveTeamByPosition(m.away, resultData, teamsList);
                        awayCode = resolvedAway ? resolvedAway.code : m.away;
                      }
                      
                      const homeTeamInfo = teamsList?.find(t => t.code === homeCode);
                      const awayTeamInfo = teamsList?.find(t => t.code === awayCode);
                     
                     let homePoints = 0;
                     let awayPoints = 0;
                     
                     if (m.result.gh > m.result.ga) {
                       homePoints = 3;
                     } else if (m.result.gh < m.result.ga) {
                       awayPoints = 3;
                     } else {
                       homePoints = 1;
                       awayPoints = 1;
                     }
                     
                     if (homeTeamInfo && homeTeamInfo.confederation) {
                       stats[homeTeamInfo.confederation].matchesPlayed += 1;
                       stats[homeTeamInfo.confederation].points += homePoints;
                       if (m.predictions) {
                         stats[homeTeamInfo.confederation].expectedPoints += (m.predictions.p_home * 3) + (m.predictions.p_draw * 1);
                       }
                     }
                     
                     if (awayTeamInfo && awayTeamInfo.confederation) {
                       stats[awayTeamInfo.confederation].matchesPlayed += 1;
                       stats[awayTeamInfo.confederation].points += awayPoints;
                       if (m.predictions) {
                         stats[awayTeamInfo.confederation].expectedPoints += (m.predictions.p_away * 3) + (m.predictions.p_draw * 1);
                       }
                     }
                   }
                 });
             
                 const statsArray = Object.entries(stats)
                   .filter(([conf, data]) => data.matchesPlayed > 0)
                   .map(([conf, data]) => ({
                     confederation: conf,
                     matchesPlayed: data.matchesPlayed,
                     points: data.points,
                     expectedPoints: data.expectedPoints,
                     possiblePoints: data.matchesPlayed * 3,
                     performance: data.matchesPlayed > 0 ? (data.points / (data.matchesPlayed * 3)) * 100 : 0,
                     expectedPerformance: data.matchesPlayed > 0 ? (data.expectedPoints / (data.matchesPlayed * 3)) * 100 : 0,
                     ratio: data.expectedPoints > 0 ? (data.points / data.expectedPoints) : 0
                   }))
                   .sort((a, b) => b.performance - a.performance);

                 if (statsArray.length === 0) {
                   return <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aún no hay partidos finalizados.</td></tr>;
                 }
                 return statsArray.map((conf, index) => (
                   <tr key={conf.confederation}>
                     <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</td>
                     <td style={{ fontWeight: 'bold' }}>{conf.confederation}</td>
                     <td style={{ textAlign: 'center' }}>{conf.matchesPlayed}</td>
                     <td style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 'bold' }}>{conf.points}</td>
                     <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{conf.expectedPoints.toFixed(1)}</td>
                     <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{conf.possiblePoints}</td>
                     <td style={{ textAlign: 'right', fontWeight: 'bold', color: conf.performance > 50 ? '#4ade80' : conf.performance < 30 ? '#ef4444' : '#fbbf24' }}>
                       {conf.performance.toFixed(1)}%
                     </td>
                     <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                        {conf.expectedPerformance.toFixed(1)}%
                     </td>
                     <td style={{ textAlign: 'right', fontWeight: 'bold', color: conf.ratio > 1 ? '#4ade80' : conf.ratio < 1 ? '#ef4444' : 'var(--text-muted)' }}>
                        {conf.ratio.toFixed(2)}x
                     </td>
                   </tr>
                 ));
              })()}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'betting' ? (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Simulador de Apuestas (Cuota = 1 / Probabilidad)</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Simulación de 4 estrategias de apuestas sobre todos los partidos ya finalizados, asumiendo cuotas justas sin margen de la casa.
          </p>
          
          {(() => {
            const completedMatches = matches.filter(m => m.result && m.predictions);
            if (completedMatches.length === 0) {
              return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aún no hay partidos finalizados con predicciones.</div>;
            }

            let strat1 = { bet: 0, ret: 0, hits: 0, dailyData: {} };
            let strat2 = { bet: 0, ret: 0, hits: 0, dailyData: {} };
            let strat3 = { bet: 0, ret: 0, hits: 0, dailyData: {} };
            let strat4 = { bet: 0, ret: 0, hits: 0, dailyData: {} };

            completedMatches.forEach(m => {
              const date = m.date;
              if (!strat1.dailyData[date]) strat1.dailyData[date] = { date, profit: 0 };
              if (!strat2.dailyData[date]) strat2.dailyData[date] = { date, profit: 0 };
              if (!strat3.dailyData[date]) strat3.dailyData[date] = { date, profit: 0 };
              if (!strat4.dailyData[date]) strat4.dailyData[date] = { date, profit: 0 };

              const p = m.predictions;
              const probs = [
                { type: 'home', p: p.p_home },
                { type: 'draw', p: p.p_draw },
                { type: 'away', p: p.p_away }
              ].sort((a, b) => b.p - a.p);

              let actualOutcome = 'draw';
              if (m.result.gh > m.result.ga) actualOutcome = 'home';
              if (m.result.gh < m.result.ga) actualOutcome = 'away';

              // Strategy 1: Bet 100 on the highest prob
              const bestChoice = probs[0];
              strat1.bet += 100;
              let ret1 = 0;
              if (actualOutcome === bestChoice.type) {
                strat1.hits++;
                ret1 = 100 * (1 / bestChoice.p);
                strat1.ret += ret1;
              }
              strat1.dailyData[date].profit += (ret1 - 100);

              // Strategy 2: Bet (prob * 100) on highest prob
              const bet2 = bestChoice.p * 100;
              strat2.bet += bet2;
              let ret2 = 0;
              if (actualOutcome === bestChoice.type) {
                strat2.hits++;
                ret2 = bet2 * (1 / bestChoice.p);
                strat2.ret += ret2;
              }
              strat2.dailyData[date].profit += (ret2 - bet2);

              // Strategy 3: Bet (prob1 * 100) and (prob2 * 100) on top 2
              const secondChoice = probs[1];
              const bet3a = bestChoice.p * 100;
              const bet3b = secondChoice.p * 100;
              const totalBet3 = bet3a + bet3b;
              strat3.bet += totalBet3;
              
              let ret3 = 0;
              if (actualOutcome === bestChoice.type) {
                strat3.hits++;
                ret3 = bet3a * (1 / bestChoice.p);
                strat3.ret += ret3;
              } else if (actualOutcome === secondChoice.type) {
                strat3.hits++;
                ret3 = bet3b * (1 / secondChoice.p);
                strat3.ret += ret3;
              }
              strat3.dailyData[date].profit += (ret3 - totalBet3);

              // Strategy 4: Hybrid (Strategy 3 in groups, Strategy 2 in knockouts)
              const isGroup = m.stage.startsWith("Group");
              if (isGroup) {
                const totalBet4 = bet3a + bet3b;
                strat4.bet += totalBet4;
                let ret4 = 0;
                if (actualOutcome === bestChoice.type) {
                  strat4.hits++;
                  ret4 = bet3a * (1 / bestChoice.p);
                  strat4.ret += ret4;
                } else if (actualOutcome === secondChoice.type) {
                  strat4.hits++;
                  ret4 = bet3b * (1 / secondChoice.p);
                  strat4.ret += ret4;
                }
                strat4.dailyData[date].profit += (ret4 - totalBet4);
              } else {
                strat4.bet += bet2;
                let ret4 = 0;
                if (actualOutcome === bestChoice.type) {
                  strat4.hits++;
                  ret4 = bet2 * (1 / bestChoice.p);
                  strat4.ret += ret4;
                }
                strat4.dailyData[date].profit += (ret4 - bet2);
              }
            });

            const processDaily = (dailyObj) => {
              const entries = Object.values(dailyObj).sort((a,b) => a.date.localeCompare(b.date));
              if (entries.length === 0) return [];

              const parseDate = (str) => {
                const [y, m, d] = str.split('-');
                return new Date(y, m - 1, d, 12, 0, 0); // Mediodía local para evitar shifts
              };

              const startDate = parseDate(entries[0].date);
              const endDate = parseDate(entries[entries.length - 1].date);
              
              const filledHistory = [];
              let cumulative = 0;
              let entryIdx = 0;

              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                
                let profit = 0;
                
                if (entryIdx < entries.length && entries[entryIdx].date === dateStr) {
                  profit = entries[entryIdx].profit;
                  entryIdx++;
                }
                
                cumulative += profit;
                filledHistory.push({
                  date: dateStr.substring(5), // Solo MM-DD
                  GananciaDiaria: profit,
                  BalanceAcumulado: cumulative
                });
              }
              
              return filledHistory;
            };

            strat1.history = processDaily(strat1.dailyData);
            strat2.history = processDaily(strat2.dailyData);
            strat3.history = processDaily(strat3.dailyData);
            strat4.history = processDaily(strat4.dailyData);

            const renderStrat = (id, title, desc, strat) => {
              const balance = strat.ret - strat.bet;
              const roi = strat.bet > 0 ? (balance / strat.bet) * 100 : 0;
              const color = balance > 0 ? '#4ade80' : balance < 0 ? '#ef4444' : '#fbbf24';
              const isExpanded = expandedStrat === id;
              
              return (
                <div key={id} style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${color}40` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{desc}</p>
                    </div>
                    <button 
                      className="btn" 
                      onClick={() => setExpandedStrat(isExpanded ? null : id)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                      {isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aciertos</div>
                      <div style={{ fontWeight: 'bold' }}>{strat.hits} / {completedMatches.length} ({(strat.hits/completedMatches.length*100).toFixed(1)}%)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Apostado</div>
                      <div style={{ fontWeight: 'bold' }}>${strat.bet.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Retorno</div>
                      <div style={{ fontWeight: 'bold' }}>${strat.ret.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance</div>
                      <div style={{ fontWeight: 'bold', color: color }}>${balance > 0 ? '+' : ''}{balance.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ROI</div>
                      <div style={{ fontWeight: 'bold', color: color }}>{roi > 0 ? '+' : ''}{roi.toFixed(2)}%</div>
                    </div>
                  </div>
                  
                  {isExpanded && strat.history.length > 0 && (
                    <div style={{ height: 350, marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={strat.history} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#888" fontSize={12} />
                          <YAxis yAxisId="left" stroke="#888" fontSize={12} />
                          <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
                            formatter={(value) => `$${value.toFixed(2)}`}
                          />
                          <Legend />
                          <Bar dataKey="GananciaDiaria" yAxisId="left" name="Ganancia/Pérdida Diaria">
                             {
                                strat.history.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.GananciaDiaria > 0 ? '#4ade80' : '#ef4444'} />
                                ))
                             }
                          </Bar>
                          <Line type="monotone" dataKey="BalanceAcumulado" stroke="#3b82f6" strokeWidth={3} yAxisId="right" dot={{ r: 3, fill: '#3b82f6' }} name="Balance Acumulado" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {renderStrat("strat1", "Estrategia 1: Apostar $100 Fijos", "Apostar $100 al resultado con mayor probabilidad en cada partido.", strat1)}
                {renderStrat("strat2", "Estrategia 2: Apostar Proporcional ($X)", "Apostar un monto igual al % de probabilidad del resultado favorito.", strat2)}
                {renderStrat("strat3", "Estrategia 3: Doble Oportunidad Proporcional", "Apostar montos iguales a sus % de probabilidad a los DOS resultados más probables.", strat3)}
                {renderStrat("strat4", "Estrategia 4: Híbrida (Estrat. 3 en Grupos / Estrat. 2 en Eliminatorias)", "Aplica Doble Oportunidad Proporcional en fase de grupos y cambia a Apuesta Proporcional al favorito en eliminación directa.", strat4)}
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
