import { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Groups from './components/Groups';
import Knockouts from './components/Knockouts';
import TodayMatches from './components/TodayMatches';
import EloAnalytics from './components/EloAnalytics';
import Schedule from './components/Schedule';
import NextMatches from './components/NextMatches';
import { requestSimulation, checkSimulationStatus, getTeams } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [numSims, setNumSims] = useState(1000);
  
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [teamsList, setTeamsList] = useState([]);

  useEffect(() => {
    getTeams().then(data => setTeamsList(data.teams)).catch(console.error);
  }, []);

  useEffect(() => {
    let interval;
    if (jobId && loading) {
      interval = setInterval(async () => {
        try {
          const res = await checkSimulationStatus(jobId);
          if (res.status === 'completed') {
            setResultData(res.result);
            setLoading(false);
            setProgress(100);
            clearInterval(interval);
          } else if (res.status === 'failed') {
            setLoading(false);
            clearInterval(interval);
            alert('Simulation failed: ' + res.message);
          } else {
            setProgress(res.progress);
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobId, loading]);

  const handleStartSim = async () => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await requestSimulation({ n_simulations: parseInt(numSims), refresh_elo: false });
      setJobId(res.job_id);
    } catch (e) {
      setLoading(false);
      alert('Failed to start simulation');
    }
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FIFA 2026 Simulator
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Stochastic Monte-Carlo Engine</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={() => setActiveTab('overview')} style={{ opacity: activeTab === 'overview' ? 1 : 0.7 }}>Overview</button>
          <button className="btn" onClick={() => setActiveTab('groups')} style={{ opacity: activeTab === 'groups' ? 1 : 0.7 }}>Group Stage</button>
          <button className="btn" onClick={() => setActiveTab('knockout')} style={{ opacity: activeTab === 'knockout' ? 1 : 0.7 }}>Knockouts</button>
          <button className="btn" onClick={() => setActiveTab('next')} style={{ opacity: activeTab === 'next' ? 1 : 0.7 }}>Próxima Fecha</button>
          <button className="btn" onClick={() => setActiveTab('schedule')} style={{ opacity: activeTab === 'schedule' ? 1 : 0.7 }}>Live Schedule</button>
          <button className="btn" onClick={() => setActiveTab('elo')} style={{ opacity: activeTab === 'elo' ? 1 : 0.7 }}>ELO Analytics</button>
        </div>
      </header>
      
      <main className="animate-fade-in" style={{ minHeight: '60vh' }}>
        {activeTab === 'overview' && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Simulation Control</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Execute parallel simulation across all 192 matches</p>
              </div>
              <div style={{ width: '55%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Simulaciones:</span>
            <input 
              type="number"
              value={numSims} 
              onChange={e => setNumSims(parseInt(e.target.value) || 100)}
              style={{ width: '80px', padding: '0.5rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
              min="1"
              max="20000"
            />
          </div>
                  <button className="btn" onClick={handleStartSim} disabled={loading} style={{ background: 'var(--success)' }}>
                    {loading ? 'Simulating...' : 'Run Engine'}
                  </button>
                </div>
                {loading && (
                  <div style={{ width: '100%', marginTop: '0.5rem' }}>
                    <div className="progress-container" style={{ margin: 0 }}>
                       <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
                       {progress.toFixed(1)}% ({numSims} sim)
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Overview resultData={resultData} teamsList={teamsList} />
          </div>
        )}

        {activeTab === 'groups' && <Groups resultData={resultData} teamsList={teamsList} />}
        {activeTab === 'knockout' && <Knockouts resultData={resultData} teamsList={teamsList} />}
        {activeTab === 'next' && <NextMatches resultData={resultData} />}
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'elo' && <EloAnalytics resultData={resultData} teamsList={teamsList} />}
        
      </main>
    </div>
  )
}

export default App
