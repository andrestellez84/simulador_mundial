import React, { useState, useEffect } from 'react';
import { getSchedule, getLiveResults, postLiveResult, postSyncLiveResults } from '../api';
import { getFlagUrl } from '../flagMap';

export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState(null);

  // States para inputs [match_id] -> { gh, ga }
  const [inputs, setInputs] = useState({});

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
    fetchData();
  };

  const handleClear = async (matchId, home, away) => {
    await postLiveResult(home, away, null, null);
    setInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[matchId];
        return newInputs;
    });
    fetchData();
  };

  const handleSync = async () => {
    const res = await postSyncLiveResults();
    alert(res.message);
    fetchData();
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
        <button className="btn" onClick={handleSync} style={{ background: 'var(--accent)' }}>
          Live Web Scrape (Auto Update)
        </button>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Match #</th>
              <th>Date</th>
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

    </div>
  );
}
