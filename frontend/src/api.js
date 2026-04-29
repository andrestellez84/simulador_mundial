const API_URL = '/api';

export async function requestSimulation(params = {}) {
  const response = await fetch(`${API_URL}/simulate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

export async function checkSimulationStatus(jobId) {
  const response = await fetch(`${API_URL}/simulate/${jobId}`);
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

export async function getTeams() {
  const response = await fetch(`${API_URL}/teams/`);
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

export async function getPrediction(homeCode, awayCode) {
  const response = await fetch(`${API_URL}/predictions/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ home_code: homeCode, away_code: awayCode })
  });
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

export async function getSchedule() {
  const res = await fetch(`${API_URL}/schedule/`);
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function getLiveResults() {
  const res = await fetch(`${API_URL}/schedule/live_results`);
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function postLiveResult(home_code, away_code, home_goals, away_goals) {
  const res = await fetch(`${API_URL}/schedule/live_results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ home_code, away_code, home_goals, away_goals })
  });
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function postSyncLiveResults() {
  const res = await fetch(`${API_URL}/schedule/live_results/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}
