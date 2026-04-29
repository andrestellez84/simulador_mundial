import React, { useState, useEffect } from 'react';
import { getPrediction, getTeams } from '../api';
import { getFlagUrl } from '../flagMap';

export default function TodayMatches() {
  const [teams, setTeams] = useState([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTeams().then(data => {
      setTeams(data.teams);
      setHomeTeam(data.teams[0].code);
      setAwayTeam(data.teams[1].code);
    }).catch(console.error);
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const result = await getPrediction(homeTeam, awayTeam);
      setPrediction(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Daily Match Predictor</h2>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Home Team</label>
          <select 
            value={homeTeam} 
            onChange={e => setHomeTeam(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
          >
            {teams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
          </select>
        </div>
        <div style={{ fontWeight: 'bold', color: 'var(--text-muted)', paddingTop: '1.5rem' }}>VS</div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Away Team</label>
          <select 
            value={awayTeam} 
            onChange={e => setAwayTeam(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
          >
            {teams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
          </select>
        </div>
        <div style={{ paddingTop: '1.5rem' }}>
          <button className="btn" onClick={handlePredict} disabled={loading}>{loading ? 'Computing...' : 'Predict'}</button>
        </div>
      </div>

      {prediction && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            
            <div style={{ textAlign: 'center', width: '30%' }}>
              <img src={getFlagUrl(prediction.home_code)} style={{ height: 40, borderRadius: 4, marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem' }}>{prediction.home_code}</h3>
              <p style={{ color: 'var(--success)', fontSize: '1.5rem', fontWeight: 'bold' }}>{(prediction.win_prob * 100).toFixed(1)}%</p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win</div>
            </div>
            
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>DRAW</div>
              <p style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 'bold' }}>{(prediction.draw_prob * 100).toFixed(1)}%</p>
            </div>

            <div style={{ textAlign: 'center', width: '30%' }}>
              <img src={getFlagUrl(prediction.away_code)} style={{ height: 40, borderRadius: 4, marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem' }}>{prediction.away_code}</h3>
              <p style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 'bold' }}>{(prediction.loss_prob * 100).toFixed(1)}%</p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win</div>
            </div>

          </div>

          <div>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Most Probable Exact Scores (Poisson)</h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {prediction.top_scores.map((s, idx) => (
                <div key={idx} style={{ flex: 1, textAlign: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{s.score.replace('-', ' - ')}</div>
                  <div style={{ color: 'var(--success)' }}>{(s.prob * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
