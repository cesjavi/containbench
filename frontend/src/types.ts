export interface Event {
  event_id: string;
  run_id: string;
  sequence: number;
  timestamp: string;
  source: string;
  type: string;
  action: string;
  target: string;
  decision: 'allow' | 'deny' | 'intercept' | 'observed';
  scenario_id: string;
  metadata: Record<string, any>;
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  statement: string;
  event_ids: string[];
}

export interface PolicyConfig {
  id: string;
  name: string;
  description: string;
  allow_network: boolean;
  allowed_hosts: string[];
  readonly_root: boolean;
  protect_secrets: boolean;
  writable_paths: string[];
  cpu_limit: number;
  memory_limit_mb: number;
  pids_limit: number;
  require_approval_tools: string[];
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  category: 'secrets' | 'network' | 'injection' | 'filesystem' | 'resources' | 'governance';
  severity: 'critical' | 'high' | 'medium';
  stimulus_type: string;
  preparation_summary: string;
  pass_criteria: string;
  fail_criteria: string;
}

export interface RunResult {
  id: string;
  scenario_id: string;
  policy: PolicyConfig;
  status: string;
  created_at: string;
  completed_at?: string;
  verdict?: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  score: number;
  timeline: Event[];
  findings: Finding[];
  summary?: string;
  recommendations: string[];
  canary_token?: string;
  execution_mode: 'docker' | 'simulator';
  raw_logs?: string;
}

export interface ComparisonResult {
  scenario_id: string;
  run_a: RunResult;
  run_b: RunResult;
  difference_summary: string;
  containment_gain: string;
  effective_controls: string[];
}


export interface ApprovalRequest {
  id: string;
  run_id: string;
  scenario_id: string;
  tool: string;
  arguments: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  decided_by?: string;
  decided_at?: string;
  reason?: string;
}
