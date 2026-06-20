import React, { useState, useEffect } from 'react';
import { getInPlayTrajectory } from '../api';
import { getFlagUrl } from '../flagMap';

export default function LiveMatchTracker({ teamsList }) {
  const [homeCode, setHomeCode] = useState('ARG');
  const [awayCode, setAwayCode] = useState('BRA');
  const [homeGoalMinutes, setHomeGoalMinutes] = useState([]);
  const [awayGoalMinutes, setAwayGoalMinutes] = useState([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  
  const [modelType, setModelType] = useState('average'); // linear, empirical, state_dependent, average
  
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamsList || teamsList.length === 0) return;
    let isActive = true;

    const fetchTrajectory = async () => {
      setLoading(true);
      try {
        const data = await getInPlayTrajectory(homeCode, awayCode, homeGoalMinutes, awayGoalMinutes, currentMinute);
        if (isActive) {
          setTrajectoryData(data);
        }
      } catch (e) {
        console.error(e);
        if (isActive) setTrajectoryData(null); // Clear data on error so it doesn't stay green
      }
      if (isActive) setLoading(false);
    };
    
    fetchTrajectory();
    
    return () => { isActive = false; };
  }, [homeCode, awayCode, homeGoalMinutes, awayGoalMinutes, currentMinute, teamsList]);

  const sortedTeams = teamsList ? [...teamsList].sort((a,b) => a.name.localeCompare(b.name)) : [];
  
  let chartData = [];
  if (trajectoryData && trajectoryData[modelType]) {
    chartData = trajectoryData[modelType].map(point => ({
      minute: point.minute,
      p_home: point.p_home * 100,
      p_draw: point.p_draw * 100,
      p_away: point.p_away * 100
    }));
  }

  const currentProbs = chartData.find(d => d.minute === currentMinute);

  // Generar Polígonos SVG
  let awayPolygon = "";
  let drawPolygon = "";
  if (chartData.length > 0) {
    const awayPoints = chartData.map(d => `${(d.minute / 90) * 100},${100 - d.p_away}`).join(' ');
    awayPolygon = `0,100 ${awayPoints} 100,100`;

    const drawPoints = chartData.map(d => `${(d.minute / 90) * 100},${100 - (d.p_away + d.p_draw)}`).join(' ');
    drawPolygon = `0,100 ${drawPoints} 100,100`;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Match Setup */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', position: 'relative' }}>
          
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <select value={homeCode} onChange={e => setHomeCode(e.target.value)} className="btn" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.3)' }}>
              {sortedTeams.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
            <div><img src={getFlagUrl(homeCode)} style={{ width: 60, borderRadius: 4 }} alt="flag" /></div>
            
            {trajectoryData && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4ade80' }}>
                ELO: {Math.round(trajectoryData.home_elo)}
                {trajectoryData.hfa_bonus > 0 && ` (+${Math.round(trajectoryData.hfa_bonus)} HFA)`}
              </div>
            )}

            <div style={{ marginTop: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
              {homeGoalMinutes.filter(m => m <= currentMinute).length}
            </div>
            <button className="btn" onClick={() => setHomeGoalMinutes([...homeGoalMinutes, currentMinute].sort((a,b)=>a-b))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)' }}>
              + Gol Local (al {currentMinute}')
            </button>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {homeGoalMinutes.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                   ⚽ {m}' 
                   <button onClick={() => setHomeGoalMinutes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--text-muted)', marginTop: '2rem', zIndex: 1 }}>VS</div>
          
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <select value={awayCode} onChange={e => setAwayCode(e.target.value)} className="btn" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.3)' }}>
              {sortedTeams.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
            <div><img src={getFlagUrl(awayCode)} style={{ width: 60, borderRadius: 4 }} alt="flag" /></div>
            
            {trajectoryData && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#f87171' }}>
                ELO: {Math.round(trajectoryData.away_elo)}
                {trajectoryData.hfa_bonus < 0 && ` (+${Math.round(-trajectoryData.hfa_bonus)} HFA)`}
              </div>
            )}
            <div style={{ marginTop: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
              {awayGoalMinutes.filter(m => m <= currentMinute).length}
            </div>
            <button className="btn" onClick={() => setAwayGoalMinutes([...awayGoalMinutes, currentMinute].sort((a,b)=>a-b))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)' }}>
              + Gol Visita (al {currentMinute}')
            </button>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {awayGoalMinutes.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                   ⚽ {m}' 
                   <button onClick={() => setAwayGoalMinutes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          </div>
          
        </div>
        
        {/* Time Setup */}
        <div style={{ flex: 1, minWidth: '300px', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Minuto Actual: {currentMinute}'</h3>
          <input 
            type="range" 
            min="0" 
            max="90" 
            value={currentMinute} 
            onChange={e => setCurrentMinute(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>Inicio (0')</span>
            <span>Medio Tiempo (45')</span>
            <span>Final (90')</span>
          </div>
        </div>
      </div>
      
      {/* Model Selection */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['linear', 'empirical', 'state_dependent', 'average'].map(model => (
          <button 
            key={model}
            className="btn" 
            onClick={() => setModelType(model)} 
            style={{ padding: '0.5rem 1rem', background: modelType === model ? 'var(--accent)' : 'var(--bg-dark)' }}
          >
            {model === 'linear' && 'Decaimiento Lineal'}
            {model === 'empirical' && 'Curva Empírica'}
            {model === 'state_dependent' && 'Dependiente del Estado'}
            {model === 'average' && 'Promedio de los 3'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ height: 450, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Evolución de Probabilidades ({modelType})</span>
          {currentProbs && (
             <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>
                <span style={{ color: '#4ade80', marginRight: 15 }}>L: {currentProbs.p_home.toFixed(1)}%</span>
                <span style={{ color: '#9ca3af', marginRight: 15 }}>E: {currentProbs.p_draw.toFixed(1)}%</span>
                <span style={{ color: '#f87171' }}>V: {currentProbs.p_away.toFixed(1)}%</span>
             </span>
          )}
        </h3>
        
        {loading && !chartData.length ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>Cargando trayectoria...</div>
        ) : (
          <div style={{ flex: 1, position: 'relative', background: chartData.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
            {/* El fondo verde (Home) ocupa todo. Arriba dibujamos el empate y encima el away */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
              {chartData.length > 0 && (
                <>
                  <polygon points={drawPolygon} fill="#9ca3af" />
                  <polygon points={awayPolygon} fill="#f87171" />
                </>
              )}
            </svg>
            
            {/* Línea marcadora del tiempo actual */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              bottom: 0, 
              left: `${(currentMinute / 90) * 100}%`, 
              borderLeft: '2px dashed white',
              pointerEvents: 'none'
            }}>
              <div style={{ background: 'white', color: 'black', fontSize: '0.7rem', padding: '2px 4px', borderRadius: '4px', position: 'absolute', top: '10px', left: '-20px', fontWeight: 'bold' }}>AHORA</div>
            </div>
            
            {/* Etiquetas de los ejes */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'black', fontWeight: 'bold', fontSize: '0.8rem', opacity: 0.7 }}>0'</div>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', color: 'black', fontWeight: 'bold', fontSize: '0.8rem', opacity: 0.7 }}>90'</div>
          </div>
        )}
      </div>

    </div>
  );
}
