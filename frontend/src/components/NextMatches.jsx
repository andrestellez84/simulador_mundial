import React, { useState, useEffect } from 'react';
import { getSchedule } from '../api';
import { getFlagUrl } from '../flagMap';
import { renderProb, getTeamStatusColor, isPositionDefined } from '../utils';

export default function NextMatches({ resultData, prevResultData }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const scheduleRes = await getSchedule();
    setMatches(scheduleRes.matches);
    setLoading(false);
  };

  const todayDate = new Date();
  const todayStr = currentTime.getFullYear() + '-' + 
                   String(currentTime.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(currentTime.getDate()).padStart(2, '0');

  const allDates = [...new Set(matches.map(m => m.date).filter(d => d !== "TBD"))].sort();

  let defaultDate = "TBD";
  const upcomingDates = allDates.filter(d => d >= todayStr);
  if (upcomingDates.length > 0) {
    defaultDate = upcomingDates[0];
  } else if (allDates.length > 0) {
    defaultDate = allDates[allDates.length - 1];
  }

  useEffect(() => {
    if (matches.length > 0 && !selectedDate && defaultDate !== "TBD") {
      setSelectedDate(defaultDate);
    }
  }, [matches, selectedDate, defaultDate]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;

  const targetDate = selectedDate || defaultDate;

  // Navegación
  const currentIndex = allDates.indexOf(targetDate);
  const handlePrev = () => { if (currentIndex > 0) setSelectedDate(allDates[currentIndex - 1]); };
  const handleNext = () => { if (currentIndex < allDates.length - 1) setSelectedDate(allDates[currentIndex + 1]); };

  const parseTime = (timeStr) => {
    if (!timeStr || timeStr === "TBD") return 9999;
    let [time, ampm] = timeStr.split(' ');
    if (!time || !ampm) return 9999;
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    if (ampm === 'p.m.' && hours !== 12) hours += 12;
    if (ampm === 'a.m.' && hours === 12) hours = 0;
    return hours * 60 + parseInt(minutes);
  };

  const displayMatches = matches
    .filter(m => m.date === targetDate)
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  // Helper para extraer probabilidad de campeón de resultData
  const getChampProb = (teamCode) => {
    if (!resultData || !resultData.teams || !resultData.teams[teamCode]) return null;
    return resultData.teams[teamCode].champion;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handlePrev} disabled={currentIndex <= 0} className="btn" style={{ padding: '0.5rem 1rem' }}>&larr; Anterior</button>
        <div>
          <h2 style={{ color: 'var(--accent)', margin: 0 }}>Próxima Fecha: {targetDate}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Hora Local Actual: <strong>{todayStr} {currentTime.toLocaleTimeString()}</strong>
          </p>
        </div>
        <button onClick={handleNext} disabled={currentIndex >= allDates.length - 1} className="btn" style={{ padding: '0.5rem 1rem' }}>Siguiente &rarr;</button>
      </div>

      {displayMatches.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay partidos programados para mostrar.
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 
            displayMatches.length === 6 ? 'repeat(3, 1fr)' :
            displayMatches.length === 4 ? 'repeat(2, 1fr)' : 
            displayMatches.length === 3 ? 'repeat(3, 1fr)' : 
            displayMatches.length === 2 ? 'repeat(2, 1fr)' : '1fr', 
          gap: '1.5rem' 
        }}>
          {displayMatches.map(m => {
            const champHome = getChampProb(m.home);
            const champAway = getChampProb(m.away);

            return (
              <div key={m.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.stage}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{m.time}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{m.venue}</div>
                  </div>
                </div>

                {/* Equipos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center', flex: 1, color: getTeamStatusColor(m.home, resultData) || 'inherit' }}>
                    {m.home_name !== "-" && <img src={getFlagUrl(m.home)} className="flag-icon" style={{ width: '40px', height: '30px', margin: '0 auto 0.5rem' }} />}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {m.home_name !== "-" ? m.home_name : m.home}
                      {isPositionDefined(m.home, resultData) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ELO: {m.predictions ? Math.round(m.predictions.elo_home) : '-'}
                      {m.predictions && m.predictions.extra_elo_home > 0 && (
                        <span style={{ color: '#4ade80', marginLeft: '4px' }}>
                          (+{Math.round(m.predictions.extra_elo_home)})
                        </span>
                      )}
                    </div>
                    {champHome !== null && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Camp: <span style={{ color: 'var(--accent)' }}>{renderProb(champHome, prevResultData?.teams[m.home]?.champion)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem' }}>
                    {m.result ? (
                      <>
                        <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--accent)' }}>
                          {m.result.gh} - {m.result.ga}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: m.result.surprise > 0.7 ? '#ef4444' : m.result.surprise > 0.4 ? '#fbbf24' : 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                          Sorpresa: {(m.result.surprise * 100).toFixed(1)}%
                          {m.result.surpriser && <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>por {m.result.surpriser}</div>}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>VS</div>
                    )}
                    {champHome !== null && champAway !== null && (
                      <div 
                        title="Suma de probabilidad de campeón de ambos equipos"
                        style={{ 
                          marginTop: '0.4rem',
                          fontWeight: 'bold',
                          fontSize: ((champHome + champAway) * 100) > 1.5 ? '1.1rem' : '0.75rem',
                          color: ((champHome + champAway) * 100) > 1.5 ? '#ef4444' : 'var(--text-muted)'
                        }}
                      >
                        ⭐ {((champHome + champAway) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, color: getTeamStatusColor(m.away, resultData) || 'inherit' }}>
                    {m.home_name !== "-" && <img src={getFlagUrl(m.away)} className="flag-icon" style={{ width: '40px', height: '30px', margin: '0 auto 0.5rem' }} />}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {m.away_name !== "-" ? m.away_name : m.away}
                      {isPositionDefined(m.away, resultData) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(DEF)</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ELO: {m.predictions ? Math.round(m.predictions.elo_away) : '-'}
                      {m.predictions && m.predictions.extra_elo_away > 0 && (
                        <span style={{ color: '#4ade80', marginLeft: '4px' }}>
                          (+{Math.round(m.predictions.extra_elo_away)})
                        </span>
                      )}
                    </div>
                    {champAway !== null && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Camp: <span style={{ color: 'var(--accent)' }}>{renderProb(champAway, prevResultData?.teams[m.away]?.champion)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Predicciones */}
                {m.predictions ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', textAlign: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Win Home</div>
                        <div style={{ fontWeight: 'bold', color: '#4ade80' }}>{(m.predictions.p_home * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Draw</div>
                        <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{(m.predictions.p_draw * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Win Away</div>
                        <div style={{ fontWeight: 'bold', color: '#f87171' }}>{(m.predictions.p_away * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>Top Probable Scores</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        {m.predictions.top_scores.slice(0, 3).map((score, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{score.score}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{(score.prob * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Predicciones no disponibles (Fase de Eliminatorias sin definir)</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
