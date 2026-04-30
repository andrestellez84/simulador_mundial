import React, { useState, useEffect } from 'react';
import { getSchedule } from '../api';
import { getFlagUrl } from '../flagMap';

export default function NextMatches({ resultData }) {
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

  const displayMatches = matches.filter(m => m.date === targetDate);

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {displayMatches.map(m => {
            const champHome = getChampProb(m.home);
            const champAway = getChampProb(m.away);

            return (
              <div key={m.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.stage}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{m.time}</span>
                </div>

                {/* Equipos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    {m.home_name !== "-" && <img src={getFlagUrl(m.home)} className="flag-icon" style={{ width: '40px', height: '30px', margin: '0 auto 0.5rem' }} />}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{m.home_name !== "-" ? m.home_name : m.home}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ELO: {m.predictions ? Math.round(m.predictions.elo_home) : '-'}</div>
                    {champHome !== null && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Camp: <span style={{ color: 'var(--accent)' }}>{(champHome * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontWeight: 'bold', color: 'var(--text-muted)', padding: '0 1rem' }}>VS</div>

                  <div style={{ textAlign: 'center', flex: 1 }}>
                    {m.home_name !== "-" && <img src={getFlagUrl(m.away)} className="flag-icon" style={{ width: '40px', height: '30px', margin: '0 auto 0.5rem' }} />}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{m.away_name !== "-" ? m.away_name : m.away}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ELO: {m.predictions ? Math.round(m.predictions.elo_away) : '-'}</div>
                    {champAway !== null && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Camp: <span style={{ color: 'var(--accent)' }}>{(champAway * 100).toFixed(1)}%</span>
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
