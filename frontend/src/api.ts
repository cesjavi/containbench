import { ScenarioDefinition, PolicyConfig, RunResult, ComparisonResult } from './types';

const API_BASE = '/api';

export async function fetchScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Error al cargar escenarios');
  return res.json();
}

export async function fetchPolicies(): Promise<PolicyConfig[]> {
  const res = await fetch(`${API_BASE}/policies`);
  if (!res.ok) throw new Error('Error al cargar políticas');
  return res.json();
}

export async function fetchVultrStatus(): Promise<{ connected: boolean; status: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/vultr/status`);
    if (!res.ok) return { connected: false, status: 'error' };
    return res.json();
  } catch {
    return { connected: false, status: 'offline' };
  }
}

export async function createRun(scenarioId: string, policyId: string): Promise<RunResult> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, policy_id: policyId }),
  });
  if (!res.ok) throw new Error('Error al ejecutar el crash test');
  return res.json();
}

export async function fetchRuns(): Promise<RunResult[]> {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error('Error al cargar ejecuciones');
  return res.json();
}

export async function compareRuns(runIdA: string, runIdB: string): Promise<ComparisonResult> {
  const res = await fetch(`${API_BASE}/runs/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id_a: runIdA, run_id_b: runIdB }),
  });
  if (!res.ok) throw new Error('Error al comparar ejecuciones');
  return res.json();
}
