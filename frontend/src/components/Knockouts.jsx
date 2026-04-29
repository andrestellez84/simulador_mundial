import React, { useState } from 'react';
import { getFlagUrl } from '../flagMap';

export default function Knockouts({ resultData, teamsList }) {
  const [selectedTeam, setSelectedTeam] = useState('ARG');
  const [viewMode, setViewMode] = useState('paths'); // paths | bracket

  if (!resultData || !teamsList) {
    return <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>No simulation data available.</div>
  }

  const sortedTeams = [...teamsList].sort((a,b) => a.name.localeCompare(b.name));
  const teamRes = resultData.teams[selectedTeam];
  const teamInfo = teamsList.find(t => t.code === selectedTeam);
  
  const modalBracket = resultData.modal_bracket || {};

  const SLOT_DESCRIPTIONS = {
    73: ["Runner-up A", "Runner-up B"],
    74: ["Winner E", "Best 3rd A/B/C/D/F"],
    75: ["Winner F", "Runner-up C"],
    76: ["Winner C", "Runner-up F"],
    77: ["Winner I", "Best 3rd C/D/F/G/H"],
    78: ["Runner-up E", "Runner-up I"],
    79: ["Winner A", "Best 3rd C/E/F/H/I"],
    80: ["Winner L", "Best 3rd E/H/I/J/K"],
    81: ["Winner D", "Best 3rd B/E/F/I/J"],
    82: ["Winner G", "Best 3rd A/E/H/I/J"],
    83: ["Runner-up K", "Runner-up L"],
    84: ["Winner H", "Runner-up J"],
    85: ["Winner B", "Best 3rd E/F/G/I/J"],
    86: ["Winner J", "Runner-up H"],
    87: ["Winner K", "Best 3rd D/E/I/J/L"],
    88: ["Runner-up D", "Runner-up G"]
  };
  
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Switcher */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '0.5rem' }}>
          <button className="btn" onClick={() => setViewMode('paths')} style={{ padding: '0.5rem 1rem', background: viewMode === 'paths' ? 'var(--accent)' : 'transparent' }}>Team Paths</button>
          <button className="btn" onClick={() => setViewMode('bracket')} style={{ padding: '0.5rem 1rem', background: viewMode === 'bracket' ? 'var(--accent)' : 'transparent' }}>Most Likely Bracket</button>
        </div>
      </div>
      
      {viewMode === 'paths' ? (
      <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--accent)' }}>Path to Final (Knockouts)</h2>
        <select 
          value={selectedTeam} 
          onChange={e => setSelectedTeam(e.target.value)}
          style={{ padding: '0.5rem 1rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', fontSize: '1.1rem' }}
        >
          {sortedTeams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <img src={getFlagUrl(selectedTeam)} style={{ width: 60, borderRadius: 4 }} />
        <div>
          <h3 style={{ fontSize: '1.5rem' }}>{teamInfo?.name}</h3>
          <p style={{ color: 'var(--text-muted)' }}>Group {teamRes.group} | {(teamRes.advance_to_r32 * 100).toFixed(1)}% Advancing</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', textAlign: 'center' }}>
        
        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>R32</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(teamRes.advance_to_r32 * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {teamRes.most_likely_opponents?.R32?.map ? 
                teamRes.most_likely_opponents.R32.map((opp, i) => <span key={i}>vs {opp.code} ({(opp.prob * 100).toFixed(1)}%)</span>) 
                : <span>Group Pass</span>
             }
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Round of 16</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{(teamRes.advance_to_r16 * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {teamRes.most_likely_opponents?.R16?.map ? 
                teamRes.most_likely_opponents.R16.map((opp, i) => <span key={i}>vs {opp.code} ({(opp.prob * 100).toFixed(1)}%)</span>) 
                : <span>-</span>
             }
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Quarter-Finals</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{(teamRes.advance_to_qf * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {teamRes.most_likely_opponents?.QF?.map ? 
                teamRes.most_likely_opponents.QF.map((opp, i) => <span key={i}>vs {opp.code} ({(opp.prob * 100).toFixed(1)}%)</span>) 
                : <span>-</span>
             }
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Semi-Finals</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{(teamRes.advance_to_sf * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {teamRes.most_likely_opponents?.SF?.map ? 
                teamRes.most_likely_opponents.SF.map((opp, i) => <span key={i}>vs {opp.code} ({(opp.prob * 100).toFixed(1)}%)</span>) 
                : <span>-</span>
             }
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.8)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Final</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{(teamRes.advance_to_final * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {teamRes.most_likely_opponents?.Final?.map ? 
                teamRes.most_likely_opponents.Final.map((opp, i) => <span key={i}>vs {opp.code} ({(opp.prob * 100).toFixed(1)}%)</span>) 
                : <span>-</span>
             }
          </div>
        </div>

      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '1rem 2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '2rem', color: 'var(--success)', fontWeight: 'bold', fontSize: '1.5rem', border: '1px solid var(--success)' }}>
          Champion Probability: {(teamRes.champion * 100).toFixed(1)}%
        </div>
      </div>

    </div>
      ) : (
      <div className="glass-card" style={{ textAlign: 'center', width: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--accent)', margin: 0 }}>Global Modal Bracket</h2>
          <select 
            value={selectedTeam} 
            onChange={e => setSelectedTeam(e.target.value)}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', fontSize: '1rem' }}
          >
            {sortedTeams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
          </select>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'left' }}>El torneo matemáticamente más probable. Selecciona un equipo para trazar su camino.</p>
        
        <div style={{ width: '100%', overflowX: 'auto', padding: '2rem 1rem', background: 'var(--bg-dark)', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
          
          <div style={{ display: 'flex', width: 'max-content', margin: '0 auto', gap: '40px' }}>
            {[
              { title: "R32", matchIds: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87], flexSpace: 1 },
              { title: "R16", matchIds: [89, 90, 93, 94, 91, 92, 95, 96], flexSpace: 2 },
              { title: "QF", matchIds: [97, 98, 99, 100], flexSpace: 4 },
              { title: "SF", matchIds: [101, 102], flexSpace: 8 },
              { title: "Final", matchIds: [104], flexSpace: 16 }
            ].map((stage, colIdx) => (
               <div key={stage.title} style={{ display: 'flex', flexDirection: 'column', width: '180px', position: 'relative', zIndex: 2 }}>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '2rem', textAlign: 'center', height: '20px' }}>{stage.title}</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', position: 'relative' }}>
                    {stage.matchIds.map((mId, idx) => {
                       const codes = modalBracket[mId];
                       const hInfo = codes ? teamsList.find(t => t.code === codes[0]) : null;
                       const aInfo = codes ? teamsList.find(t => t.code === codes[1]) : null;
                       
                       const hasSelected = codes && codes.includes(selectedTeam);
                       
                       // Todas las líneas serán blanco brillante para que se vean claramente
                       let lineBg = 'rgba(255, 255, 255, 0.6)'; 
                       if (hasSelected) {
                          lineBg = 'var(--success)';
                       }
                       
                       return (
                          <div key={mId} style={{ 
                              position: 'relative', 
                              marginBottom: colIdx === 4 ? 0 : '1rem'
                          }}>
                             {/* Connection lines */}
                             {colIdx < 4 && (
                                <div style={{
                                   position: 'absolute',
                                   top: '50%',
                                   right: '-40px',
                                   width: '40px',
                                   height: '3px',
                                   background: lineBg,
                                   zIndex: 1
                                }}/>
                             )}
                             
                             <div style={{ 
                                background: 'var(--bg-card)', 
                                border: hasSelected ? '2px solid var(--success)' : '1px solid var(--border-color)', 
                                borderRadius: '0.5rem', 
                                padding: '0.5rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.4rem',
                                boxShadow: hasSelected ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)',
                                position: 'relative',
                                zIndex: 2,
                                minHeight: '65px'
                             }}>
                                {!codes ? (
                                   <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>TBD</div>
                                ) : (
                                   <>
                                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', position: 'absolute', top: '0.2rem', right: '0.4rem' }}>M{mId}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.8rem', marginTop: '0.4rem', opacity: codes[0] === selectedTeam ? 1 : (hasSelected ? 0.5 : 1) }}>
                                         <img src={getFlagUrl(codes[0])} style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 2 }} />
                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', color: codes[0] === selectedTeam ? 'var(--success)' : 'inherit' }}>{hInfo?.name || codes[0]}</span>
                                            {SLOT_DESCRIPTIONS[mId] && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{SLOT_DESCRIPTIONS[mId][0]}</span>}
                                         </div>
                                      </div>
                                      <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.8rem', opacity: codes[1] === selectedTeam ? 1 : (hasSelected ? 0.5 : 1) }}>
                                         <img src={getFlagUrl(codes[1])} style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 2 }} />
                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', color: codes[1] === selectedTeam ? 'var(--success)' : 'inherit' }}>{aInfo?.name || codes[1]}</span>
                                            {SLOT_DESCRIPTIONS[mId] && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{SLOT_DESCRIPTIONS[mId][1]}</span>}
                                         </div>
                                      </div>
                                   </>
                                )}
                             </div>
                          </div>
                       );
                    })}
                  </div>
               </div>
            ))}
          </div>
          
        </div>
      </div>
      )}
    </div>
  );
}
