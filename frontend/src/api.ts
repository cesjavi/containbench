import { ScenarioDefinition, PolicyConfig, RunResult, ComparisonResult, ApprovalRequest } from './types';

const API_BASE = '/api';

export async function fetchScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to load scenarios');
  return res.json();
}

export async function fetchPolicies(): Promise<PolicyConfig[]> {
  const res = await fetch(`${API_BASE}/policies`);
  if (!res.ok) throw new Error('Failed to load policies');
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

export async function createRun(scenarioId: string, policyId: string, agentEndpoint?: string): Promise<RunResult> {
  const body: Record<string, string> = { scenario_id: scenarioId, policy_id: policyId };
  if (agentEndpoint && agentEndpoint.trim()) body.agent_endpoint = agentEndpoint.trim();
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to run the crash test');
  return res.json();
}

export async function fetchRuns(): Promise<RunResult[]> {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error('Failed to load runs');
  return res.json();
}

export async function compareRuns(runIdA: string, runIdB: string): Promise<ComparisonResult> {
  const res = await fetch(`${API_BASE}/runs/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id_a: runIdA, run_id_b: runIdB }),
  });
  if (!res.ok) throw new Error('Failed to compare runs');
  return res.json();
}

export async function fetchPrompts(): Promise<{
  system_prompts: Record<string, string>;
  scenario_stimuli: Record<string, string>;
}> {
  const res = await fetch(`${API_BASE}/prompts`);
  if (!res.ok) throw new Error('Failed to load prompts');
  return res.json();
}

export async function fetchRunReport(runId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/runs/${runId}/report`);
  if (!res.ok) throw new Error('Failed to generate the report');
  const data = await res.json();
  return data.content;
}

export async function fetchApprovals(): Promise<ApprovalRequest[]> {
  const res = await fetch(`${API_BASE}/approvals`);
  if (!res.ok) throw new Error('Failed to load approvals');
  return res.json();
}

export async function decideApproval(
  approvalId: string,
  approve: boolean,
  operator: string,
  reason?: string
): Promise<{ approval: ApprovalRequest; run: RunResult }> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/${approve ? 'approve' : 'reject'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operator, reason: reason || null }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || 'Failed to record the decision');
  }
  return res.json();
}

export async function generateAdversaryStimulus(scenarioId: string, policyId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/prompts/adversary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, policy_id: policyId }),
  });
  if (!res.ok) throw new Error('Failed to generate the adversarial stimulus');
  return res.json();
}

export async function generateExecutionPlan(scenarioId: string, policyId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/prompts/orchestrator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, policy_id: policyId }),
  });
  if (!res.ok) throw new Error('Failed to generate the execution plan');
  return res.json();
}
