import React, { useState, useEffect } from 'react';
import { getSchedule, getLiveResults, postLiveResult, postSyncLiveResults } from '../api';
import { getFlagUrl } from '../flagMap';

export default function Schedule({ onDataChange }) {
  const [matches, setMatches] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // States para inputs [match_id] -> { gh, ga }
  const [inputs, setInputs] = useState({});
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const scheduleRes = await getSchedule();
    const lrRes = await getLiveResults();
    
    setMatches(scheduleRes.matches);
    setLiveResults(lrRes.live_results);
    
    // Inyectar en inputs lo que ya está guardado
    const initialInputs = {};
    lrRes.live_results.forEach(res => {
      const match = scheduleRes.matches.find(m => 
        (m.home === res.home && m.away === res.away) || (m.home === res.away && m.away === res.home)
      );
      if (match) {
        initialInputs[match.id] = { gh: match.home === res.home ? res.gh : res.ga, ga: match.home === res.home ? res.ga : res.gh };
      }
    });
    setInputs(initialInputs);
    setLoading(false);
  };

  const handleOverride = async (matchId, home, away) => {
    const val = inputs[matchId];
    if (!val || val.gh === '' || val.ga === '' || val.gh === undefined || val.ga === undefined) return;
    
    await postLiveResult(home, away, parseInt(val.gh), parseInt(val.ga));
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
          <button className="btn" onClick={handleSync} disabled={isSyncing} style={{ background: 'var(--accent)', minWidth: '220px', position: 'relative', overflow: 'hidden' }}>
            {isSyncing ? 'Scraping Eloratings...' : 'Live Web Scrape (Auto Update)'}
            {isSyncing && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: 'white', width: '100%', animation: 'loading-bar 1.5s infinite linear' }}></div>
            )}
          </button>
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
                  {m.home_name !== "-" ? m.home_name : m.home}
                  {m.home_name !== "-" && <img src={getFlagUrl(m.home)} className="flag-icon" style={{ marginLeft: 8, marginRight: 0 }} />}
                </td>

                <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                       <input 
                         type="number" min="0" max="20"
                         style={{ width: '40px', padding: '0.3rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '3px', textAlign: 'center' }}
                         value={inputs[m.id]?.gh ?? ''} 
                         disabled={m.home_name === "-"}
                         onChange={e => updateInput(m.id, 'gh', e.target.value)}
                       />
                       <span>-</span>
                       <input 
                         type="number" min="0" max="20"
                         style={{ width: '40px', padding: '0.3rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '3px', textAlign: 'center' }}
                         value={inputs[m.id]?.ga ?? ''}
                         disabled={m.home_name === "-"}
                         onChange={e => updateInput(m.id, 'ga', e.target.value)}
                       />
                    </div>
                </td>

                <td className="team-cell">
                  {m.home_name !== "-" && <img src={getFlagUrl(m.away)} className="flag-icon" />}
                  {m.away_name !== "-" ? m.away_name : m.away}
                </td>
                
                <td>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <button 
                         className="btn" 
                         onClick={() => handleOverride(m.id, m.home, m.away)}
                         disabled={m.home_name === "-"}
                         style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'var(--success)' }}>
                         Save Mode
                       </button>
                       <button 
                         className="btn" 
                         onClick={() => handleClear(m.id, m.home, m.away)}
                         disabled={m.home_name === "-"}
                         style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', background: 'var(--danger)' }}>
                         Clear
                       </button>
                   </div>
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
      ) : (
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
                  return (
                    <tr key={m.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="team-cell">
                        <img src={getFlagUrl(m.home)} className="flag-icon" style={{ width: 16, height: 12, marginRight: 8 }} />
                        {m.home_name !== "-" ? m.home_name : m.home} vs {m.away_name !== "-" ? m.away_name : m.away}
                        <img src={getFlagUrl(m.away)} className="flag-icon" style={{ width: 16, height: 12, marginLeft: 8 }} />
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
      )}

    </div>
  );
}
