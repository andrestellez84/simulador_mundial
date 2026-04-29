import React, { useState } from 'react';
import { getFlagUrl } from '../flagMap';

export default function EloAnalytics({ resultData, teamsList = [] }) {
  const [selectedTeamsCodes, setSelectedTeamsCodes] = useState(['MEX']);
  const [sortKey, setSortKey] = useState('elo');
  const [sortDir, setSortDir] = useState('desc');

  const sortedTeams = [...teamsList].sort((a, b) => a.name.localeCompare(b.name));

  if (!resultData || !teamsList) {
    return <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>No simulation data available.</div>
  }

  const dataPoints = sortedTeams.map(tInfo => {
    const t = resultData.teams[tInfo.code];
    const initialElo = tInfo.elo || 1500;
    return {
      code: tInfo.code,
      name: tInfo.name,
      initial: initialElo,
      expected: t?.elo_history_bands?.median?.[8] || initialElo,
      delta: (t?.elo_history_bands?.median?.[8] || initialElo) - initialElo,
      bands: t?.elo_history_bands
    };
  }).sort((a, b) => {
    let valA = 0; let valB = 0;
    if (sortKey === 'elo') { valA = a.initial; valB = b.initial; }
    else if (sortKey === 'name') { valA = a.name; valB = b.name; }

    if (sortKey === 'name') {
      if (sortDir === 'asc') return valA.localeCompare(valB);
      return valB.localeCompare(valA);
    }

    if (sortDir === 'asc') return valA - valB;
    return valB - valA;
  });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return null;
    return <span style={{ marginLeft: '5px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const selectedData = selectedTeamsCodes.map(code => dataPoints.find(d => d.code === code)).filter(Boolean);

  const addTeam = (code) => {
    if (!selectedTeamsCodes.includes(code) && selectedTeamsCodes.length < 5) {
      setSelectedTeamsCodes([...selectedTeamsCodes, code]);
    }
  };

  const removeTeam = (code) => {
    if (selectedTeamsCodes.length > 1) {
      setSelectedTeamsCodes(selectedTeamsCodes.filter(c => c !== code));
    }
  };

  const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];

  const VIEW_W = 1000;
  const VIEW_H = 400;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--accent)' }}>ELO Evolution Sandbox</h2>
          <p style={{ color: 'var(--text-muted)' }}>See expected ELO rating shifts after 192 matches</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {selectedTeamsCodes.map((c, i) => (
              <div key={c} style={{ background: colors[i], color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {c} <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => removeTeam(c)}>×</span>
              </div>
            ))}
          </div>
          <select
            value=""
            onChange={e => addTeam(e.target.value)}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
          >
            <option value="" disabled>+ Add Country</option>
            {sortedTeams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Sombreado Probabilístico de Monte-Carlo (Time-Series)</h3>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '2.5', overflow: 'visible' }}>
          {(selectedData.length === 0 || !selectedData[0].bands || selectedData[0].bands.median.length === 0) ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Cargando datos temporales...</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {(() => {
                  const dataLen = 9;
                  let overallMax = 0;
                  let overallMin = 5000;

                  selectedData.forEach(d => {
                    if (!d.bands || !d.bands.p90) return;
                    const tMax = Math.max(...d.bands.p90);
                    const tMin = Math.min(...d.bands.p10);
                    if (tMax > overallMax) overallMax = tMax;
                    if (tMin < overallMin) overallMin = tMin;
                  });

                  overallMax += 20;
                  overallMin -= 20;
                  const valueRange = Math.max(overallMax - overallMin, 1);

                  const getX = (idx) => 50 + (idx / (dataLen - 1)) * (VIEW_W - 100);
                  const getY = (val) => VIEW_H - 50 - ((val - overallMin) / valueRange) * (VIEW_H - 100);

                  return (
                    <>
                      {selectedData.map((d, tIdx) => {
                        if (!d.bands) return null;
                        const p10 = d.bands.p10;
                        const med = d.bands.median;
                        const p90 = d.bands.p90;
                        const color = colors[tIdx % colors.length];

                        let polyPoints = "";
                        for (let i = 0; i < dataLen; i++) polyPoints += `${getX(i)},${getY(p90[i])} `;
                        for (let i = dataLen - 1; i >= 0; i--) polyPoints += `${getX(i)},${getY(p10[i])} `;

                        let linePoints = "";
                        for (let i = 0; i < dataLen; i++) linePoints += `${getX(i)},${getY(med[i])} `;

                        return (
                          <g key={d.code}>
                            <polygon points={polyPoints} fill={color} opacity="0.15" />
                            <polyline points={linePoints} fill="none" stroke={color} strokeWidth="3" />
                            {med.map((v, i) => (
                              <g key={i}>
                                <circle cx={getX(i)} cy={getY(v)} r="5" fill="#fff" stroke={color} strokeWidth="2" />
                                <text x={getX(i)} y={getY(v) - 15} fill={color} fontSize="14" textAnchor="middle" fontWeight="bold">
                                  {v.toFixed(0)}
                                </text>
                              </g>
                            ))}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%' }}>
                {["Initial", "M1", "M2", "Groups", "R32", "R16", "QF", "SF", "Final"].map((lbl, i) => {
                  const xPercent = (((50 + (i / 8) * (VIEW_W - 100))) / VIEW_W) * 100;
                  return (
                    <span key={lbl} style={{ position: 'absolute', left: `${xPercent}%`, transform: 'translateX(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {lbl}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Curva de Supervivencia (Opción A)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Probabilidad acumulada de avanzar a cada fase.</p>
          
          <div style={{ position: 'relative', width: '100%', aspectRatio: '2', overflow: 'visible' }}>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {(() => {
                const stages = ["R32", "R16", "QF", "SF", "Final", "Champ"];
                const getX = (idx) => 50 + (idx / (stages.length - 1)) * (VIEW_W - 100);
                const getY = (val) => VIEW_H - 50 - val * (VIEW_H - 100);
                
                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(v => (
                      <g key={`grid-a-${v}`}>
                        <line x1="50" y1={getY(v)} x2={VIEW_W - 50} y2={getY(v)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
                        <text x="40" y={getY(v) + 4} fill="var(--text-muted)" fontSize="12" textAnchor="end">{v * 100}%</text>
                      </g>
                    ))}
                    
                    {selectedData.map((d, tIdx) => {
                      const tInfo = resultData.teams[d.code];
                      if (!tInfo) return null;
                      const probs = [
                        tInfo.advance_to_r32, tInfo.advance_to_r16, tInfo.advance_to_qf,
                        tInfo.advance_to_sf, tInfo.advance_to_final, tInfo.champion
                      ];
                      const color = colors[tIdx % colors.length];

                      let linePoints = "";
                      for (let i = 0; i < stages.length; i++) linePoints += `${getX(i)},${getY(probs[i])} `;

                      return (
                        <g key={`surv-${d.code}`}>
                          <polyline points={linePoints} fill="none" stroke={color} strokeWidth="3" />
                          {probs.map((v, i) => (
                            <g key={i}>
                              <circle cx={getX(i)} cy={getY(v)} r="5" fill="#fff" stroke={color} strokeWidth="2" />
                              <text x={getX(i)} y={getY(v) - 15} fill={color} fontSize="14" textAnchor="middle" fontWeight="bold">
                                {(v * 100).toFixed(1)}%
                              </text>
                            </g>
                          ))}
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%' }}>
              {["R32", "R16", "QF", "SF", "Final", "Champ"].map((lbl, i) => {
                const xPercent = (((50 + (i / 5) * (VIEW_W - 100))) / VIEW_W) * 100;
                return (
                  <span key={`surv-lbl-${lbl}`} style={{ position: 'absolute', left: `${xPercent}%`, transform: 'translateX(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {lbl}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Histograma de Eliminación (Opción B)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Probabilidad exacta de ser eliminado en esa fase específica.</p>
          
          <div style={{ position: 'relative', width: '100%', aspectRatio: '2', overflow: 'visible' }}>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {(() => {
                const stages = ["Grupos", "R32", "R16", "QF", "SF", "Final", "Champ"];
                const numTeams = selectedData.length;
                const barWidth = Math.max(10, Math.min(40, (VIEW_W - 100) / (stages.length * numTeams * 1.5)));
                const groupSpacing = (VIEW_W - 100) / stages.length;
                
                // Find max prob to scale Y axis dynamically
                let maxProb = 0.2; // minimum scale
                selectedData.forEach(d => {
                  const tInfo = resultData.teams[d.code];
                  if (!tInfo) return;
                  const elimProbs = [
                    1 - tInfo.advance_to_r32,
                    tInfo.advance_to_r32 - tInfo.advance_to_r16,
                    tInfo.advance_to_r16 - tInfo.advance_to_qf,
                    tInfo.advance_to_qf - tInfo.advance_to_sf,
                    tInfo.advance_to_sf - tInfo.advance_to_final,
                    tInfo.advance_to_final - tInfo.champion,
                    tInfo.champion
                  ];
                  maxProb = Math.max(maxProb, ...elimProbs);
                });
                
                // Round maxProb to nearest 10%
                maxProb = Math.ceil(maxProb * 10) / 10;
                
                const getX = (stageIdx, teamIdx) => 50 + stageIdx * groupSpacing + (teamIdx - numTeams/2 + 0.5) * barWidth * 1.2;
                const getY = (val) => VIEW_H - 50 - (val / maxProb) * (VIEW_H - 100);

                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                      const v = frac * maxProb;
                      return (
                        <g key={`grid-b-${v}`}>
                          <line x1="50" y1={getY(v)} x2={VIEW_W} y2={getY(v)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
                          <text x="40" y={getY(v) + 4} fill="var(--text-muted)" fontSize="12" textAnchor="end">{(v * 100).toFixed(0)}%</text>
                        </g>
                      )
                    })}
                    
                    {selectedData.map((d, tIdx) => {
                      const tInfo = resultData.teams[d.code];
                      if (!tInfo) return null;
                      const elimProbs = [
                        Math.max(0, 1 - tInfo.advance_to_r32),
                        Math.max(0, tInfo.advance_to_r32 - tInfo.advance_to_r16),
                        Math.max(0, tInfo.advance_to_r16 - tInfo.advance_to_qf),
                        Math.max(0, tInfo.advance_to_qf - tInfo.advance_to_sf),
                        Math.max(0, tInfo.advance_to_sf - tInfo.advance_to_final),
                        Math.max(0, tInfo.advance_to_final - tInfo.champion),
                        Math.max(0, tInfo.champion)
                      ];
                      const color = colors[tIdx % colors.length];

                      return (
                        <g key={`elim-${d.code}`}>
                          {elimProbs.map((val, stageIdx) => {
                            const barH = (val / maxProb) * (VIEW_H - 100);
                            const x = getX(stageIdx, tIdx);
                            const y = getY(val);
                            return (
                              <g key={`elim-${d.code}-${stageIdx}`}>
                                <rect x={x - barWidth/2} y={y} width={barWidth} height={barH} fill={color} opacity="0.8" rx="2" />
                                {val > 0.05 && (
                                  <text x={x} y={y - 5} fill={color} fontSize="10" textAnchor="middle" fontWeight="bold">
                                    {(val * 100).toFixed(1)}%
                                  </text>
                                )}
                              </g>
                            )
                          })}
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%' }}>
              {["Grupos", "R32", "R16", "QF", "SF", "Final", "Champ"].map((lbl, i) => {
                const xPercent = (((50 + i * ((VIEW_W - 100) / 7))) / VIEW_W) * 100;
                return (
                  <span key={`elim-lbl-${lbl}`} style={{ position: 'absolute', left: `${xPercent}%`, transform: 'translateX(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {lbl}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Current Global ELOs</h3>
        <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
          <table className="custom-table" style={{ width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Team{renderSortIcon('name')}</th>
                <th onClick={() => handleSort('elo')} style={{ cursor: 'pointer' }}>Current ELO{renderSortIcon('elo')}</th>
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((d, i) => (
                <tr key={d.code}>
                  <td style={{ color: 'var(--text-muted)' }}>#{i + 1}</td>
                  <td className="team-cell">
                    <img src={getFlagUrl(d.code)} className="flag-icon" />
                    {d.name}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{d.initial.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
