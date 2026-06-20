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

export async function getHistoryList() {
  const res = await fetch(`${API_URL}/history/`);
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function getHistorySnapshot(snapshotId) {
  const res = await fetch(`${API_URL}/history/${snapshotId}`);
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function getInPlayTrajectory(homeCode, awayCode, homeGoalMinutes, awayGoalMinutes, currentMinute) {
  const res = await fetch(`${API_URL}/inplay/trajectory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      home_code: homeCode,
      away_code: awayCode,
      home_goal_minutes: homeGoalMinutes,
      away_goal_minutes: awayGoalMinutes,
      current_minute: currentMinute
    })
  });
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}

export async function getManualElos() {
  const response = await fetch(`${API_URL}/teams/manual_elo`);
  if (!response.ok) throw new Error('API Error');
  return response.json();
}

export async function postManualElo(teamCode, elo) {
  const response = await fetch(`${API_URL}/teams/manual_elo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_code: teamCode, elo: elo })
  });
  if (!response.ok) throw new Error('API Error');
  return response.json();
}
