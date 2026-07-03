import React, { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Groups from './components/Groups';
import Knockouts from './components/Knockouts';
import TodayMatches from './components/TodayMatches';
import EloAnalytics from './components/EloAnalytics';
import Schedule from './components/Schedule';
import NextMatches from './components/NextMatches';
import LiveMatchTracker from './components/LiveMatchTracker';
import { requestSimulation, checkSimulationStatus, getTeams, getHistoryList, getHistorySnapshot, deleteHistorySnapshot, getActualStandings } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [numSims, setNumSims] = useState(1000);
  
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const officialBaselineRef = React.useRef(null);
  const [currentResultData, setCurrentResultData] = useState(null);
  const [prevResultData, setPrevResultData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalPrevData, setHistoricalPrevData] = useState(null);
  const [configVersion, setConfigVersion] = useState(0);
  const [teamsList, setTeamsList] = useState([]);
  
  const [historyList, setHistoryList] = useState([]);
  const [actualStandings, setActualStandings] = useState(null);

  const fetchHistory = async (isInitialLoad = false) => {
    try {
      const res = await getHistoryList();
      setHistoryList(res.snapshots);
      if (res.snapshots.length > 0) {
          const latest = res.snapshots[0];
          getHistorySnapshot(latest.id).then(async (data) => {
              if (isInitialLoad) {
                  setCurrentResultData(data);
              }
              
              let baselineData = null;
              for (let i = 1; i < res.snapshots.length; i++) {
                  try {
                      const prevData = await getHistorySnapshot(res.snapshots[i].id);
                      if (prevData._metadata?.hash !== data._metadata?.hash) {
                          baselineData = prevData;
                          break;
                      }
                  } catch(e) {}
              }
              
              if (baselineData) {
                  setPrevResultData(baselineData);
                  officialBaselineRef.current = baselineData;
              } else {
                  setPrevResultData(null);
                  officialBaselineRef.current = data;
              }
          }).catch(e => console.error(e));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeamsData = () => {
    getTeams().then(data => setTeamsList(data.teams)).catch(console.error);
  };
  
  const fetchActualStandingsData = () => {
    getActualStandings().then(data => setActualStandings(data)).catch(console.error);
  };

  useEffect(() => {
    fetchTeamsData();
    fetchHistory(true);
  }, []);

  useEffect(() => {
    if (historicalData && historicalData._metadata?.inputs?.live_results) {
       getActualStandings(historicalData._metadata.inputs.live_results)
         .then(data => setActualStandings(data)).catch(console.error);
    } else {
       getActualStandings().then(data => setActualStandings(data)).catch(console.error);
    }
  }, [historicalData]);

  useEffect(() => {
    let interval;
    if (jobId && loading) {
      interval = setInterval(async () => {
        try {
          const res = await checkSimulationStatus(jobId);
          if (res.status === 'completed') {
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.value = 600;
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              oscillator.start();
              setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 300);
            } catch(e) { console.log("Audio not supported"); }

            const newResult = res.result;
            const newSims = newResult._metadata?.simulations || 0;
            
            // Always show arrows against the baseline, regardless of simulation size
            if (officialBaselineRef.current) {
                setPrevResultData(officialBaselineRef.current);
            }
            
            setCurrentResultData(newResult);
            setLoading(false);
            setProgress(100);
            clearInterval(interval);
            fetchHistory(); // Refresh history list
            fetchActualStandingsData(); // Refresh actual standings
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
      setHistoricalPrevData(null);
      return;
    }
    try {
      const data = await getHistorySnapshot(id);
      data._snapshotId = id;
      setHistoricalData(data);
      // DO NOT overwrite officialBaselineRef.current here! It belongs to the present.
      
      const currentIndex = historyList.findIndex(h => h.id === id);
      if (currentIndex !== -1 && currentIndex + 1 < historyList.length) {
          const prevId = historyList[currentIndex + 1].id;
          getHistorySnapshot(prevId).then(prevData => {
              setHistoricalPrevData(prevData);
          }).catch(console.error);
      } else {
          setHistoricalPrevData(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load snapshot');
    }
  };

  const handleDeleteSnapshot = async () => {
    if (!historicalData || !historicalData._snapshotId) return;
    if (window.confirm("¿Seguro que deseas borrar este historial?")) {
      try {
        await deleteHistorySnapshot(historicalData._snapshotId);
        setHistoricalData(null);
        fetchHistory();
      } catch (err) {
        console.error("Error deleting snapshot", err);
      }
    }
  };

  const activeData = historicalData || currentResultData;
  const activePrevData = historicalData ? historicalPrevData : prevResultData;
  const activeInputs = historicalData ? historicalData._metadata?.inputs : null;

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                      {historicalData && (
                        <button onClick={handleDeleteSnapshot} className="btn btn-noscale" style={{ background: '#ef4444', padding: '0.4rem 0.6rem', color: 'white' }} title="Borrar Historial">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      )}
                    </div>
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
            
            <Overview resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} actualStandings={actualStandings} />
          </div>
        )}

        {activeTab === 'groups' && <Groups resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} actualStandings={actualStandings} activeInputs={activeInputs} />}
        {activeTab === 'knockout' && <Knockouts resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} actualStandings={actualStandings} />}
        {activeTab === 'next' && <NextMatches resultData={activeData} prevResultData={activePrevData} teamsList={teamsList} liveResults={activeInputs?.live_results} actualStandings={actualStandings} />}
        {activeTab === 'inplay' && <LiveMatchTracker teamsList={teamsList} activeInputs={activeInputs} />}
        {activeTab === 'schedule' && <Schedule activeInputs={activeInputs} resultData={activeData} teamsList={teamsList} actualStandings={actualStandings} onDataChange={() => {
           getTeams().then(data => setTeamsList(data.teams)).catch(console.error);
           fetchActualStandingsData();
           setConfigVersion(v => v + 1);
        }} />}
        {activeTab === 'elo' && <EloAnalytics resultData={activeData} teamsList={teamsList} refreshTeams={fetchTeamsData} />}
        
      </main>
    </div>
  )
}

export default App
