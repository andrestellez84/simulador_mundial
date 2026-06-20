import { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Groups from './components/Groups';
import Knockouts from './components/Knockouts';
import TodayMatches from './components/TodayMatches';
import EloAnalytics from './components/EloAnalytics';
import Schedule from './components/Schedule';
import NextMatches from './components/NextMatches';
import LiveMatchTracker from './components/LiveMatchTracker';
import { requestSimulation, checkSimulationStatus, getTeams, getHistoryList, getHistorySnapshot } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [numSims, setNumSims] = useState(1000);
  
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentResultData, setCurrentResultData] = useState(null);
  const [prevResultData, setPrevResultData] = useState(null);
  const [configVersion, setConfigVersion] = useState(0);
  const [teamsList, setTeamsList] = useState([]);
  
  const [historyList, setHistoryList] = useState([]);
  const [historicalData, setHistoricalData] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await getHistoryList();
      setHistoryList(res.snapshots);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeamsData = () => {
    getTeams().then(data => setTeamsList(data.teams)).catch(console.error);
  };

  useEffect(() => {
    fetchTeamsData();
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval;
    if (jobId && loading) {
      interval = setInterval(async () => {
        try {
          const res = await checkSimulationStatus(jobId);
          if (res.status === 'completed') {
            setCurrentResultData(current => {
              const currentHash = current?._metadata?.hash;
              const newHash = res.result?._metadata?.hash;
              
              if (current && currentHash && newHash && currentHash !== newHash) {
                // Sólo guardar como base de comparación si tuvo buena convergencia (>= 100k)
                if (current._metadata && current._metadata.simulations >= 100000) {
                  setPrevResultData(current);
                }
              }
              return res.result;
            });
            setLoading(false);
            setProgress(100);
            clearInterval(interval);
            fetchHistory(); // Refresh history list
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
      // Salir de modo histórico si simulamos
      setHistoricalData(null);
    } catch (e) {
      setLoading(false);
      alert('Failed to start simulation');
    }
  };

  const loadHistorySnapshot = async (id) => {
    if (!id) {
      setHistoricalData(null);
      return;
    }
    try {
      const data = await getHistorySnapshot(id);
      data._snapshotId = id;
      setHistoricalData(data);
    } catch (e) {
      console.error(e);
      alert('Failed to load snapshot');
    }
  };

  const activeData = historicalData || currentResultData;
  const activePrevData = historicalData ? null : prevResultData;

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
          <button className="btn" onClick={() => setActiveTab('inplay')} style={{ opacity: activeTab === 'inplay' ? 1 : 0.7 }}>Live Tracker</button>
          <button className="btn" onClick={() => setActiveTab('schedule')} style={{ opacity: activeTab === 'schedule' ? 1 : 0.7 }}>Live Schedule</button>
          <button className="btn" onClick={() => setActiveTab('elo')} style={{ opacity: activeTab === 'elo' ? 1 : 0.7 }}>ELO Analytics</button>
        </div>
      </header>
      
      <main className="animate-fade-in" style={{ minHeight: '60vh' }}>
        
        {historicalData && (
          <div style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#facc15', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🕒</span> Modo Máquina del Tiempo Activado
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Estás visualizando una simulación del pasado. Las modificaciones en vivo no surtirán efecto en esta vista.
              </p>
            </div>
            <button className="btn" onClick={() => loadHistorySnapshot("")} style={{ background: '#eab308', color: 'black', fontWeight: 'bold' }}>
              Volver al Presente
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Simulation Control</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Execute parallel simulation across all 192 matches</p>
              </div>
              <div style={{ width: '55%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  
                  {historyList.length > 0 && (
                    <select 
                      onChange={e => loadHistorySnapshot(e.target.value)}
                      value={historicalData ? historicalData._snapshotId || "" : ""}
                      style={{ padding: '0.5rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                    >
                      <option value="">-- Presente --</option>
                      {historyList.map(h => (
                        <option key={h.id} value={h.id}>{h.label}</option>
                      ))}
                    </select>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Simulaciones:</span>
            <input 
              type="number"
              value={numSims} 
              onChange={e => setNumSims(parseInt(e.target.value) || 100)}
              style={{ width: '80px', padding: '0.5rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
              min="1"
              max="20000"
              disabled={!!historicalData}
            />
          </div>
                  <button className="btn" onClick={handleStartSim} disabled={loading || !!historicalData} style={{ background: 'var(--success)' }}>
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
            
            <Overview resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} />
          </div>
        )}

        {activeTab === 'groups' && <Groups resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} />}
        {activeTab === 'knockout' && <Knockouts resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} />}
        {activeTab === 'next' && <NextMatches resultData={activeData} prevResultData={activePrevData} />}
        {activeTab === 'inplay' && <LiveMatchTracker teamsList={teamsList} />}
        {activeTab === 'schedule' && <Schedule onDataChange={() => {
           getTeams().then(data => setTeamsList(data.teams)).catch(console.error);
           setConfigVersion(v => v + 1);
        }} />}
        {activeTab === 'elo' && <EloAnalytics resultData={activeData} teamsList={teamsList} refreshTeams={fetchTeamsData} />}
        
      </main>
    </div>
  )
}

export default App
