import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Server,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  Cpu,
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  XCircle,
  GitBranch
} from 'lucide-react';
import {
  fetchScenarios,
  fetchPolicies,
  fetchRuns,
  createRun,
  compareRuns,
  fetchVultrStatus,
  fetchPrompts,
  fetchRunReport,
  fetchApprovals,
  decideApproval,
  generateAdversaryStimulus,
  generateExecutionPlan
} from './api';
import { ScenarioDefinition, PolicyConfig, RunResult, ComparisonResult, ApprovalRequest } from './types';

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'runs' | 'compare' | 'prompts' | 'approvals' | 'orchestration'>('scenarios');

  // Human approval state
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [operatorName, setOperatorName] = useState<string>('');
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Orchestration state (adversarial generator + execution planner)
  const [orchScenario, setOrchScenario] = useState<string>('CB-001');
  const [orchPolicyId, setOrchPolicyId] = useState<string>('hardened');
  const [orchStimulus, setOrchStimulus] = useState<any | null>(null);
  const [orchPlan, setOrchPlan] = useState<any | null>(null);
  const [orchLoading, setOrchLoading] = useState<'stimulus' | 'plan' | null>(null);
  const [vultrStatus, setVultrStatus] = useState<{ connected: boolean; status: string } | null>(null);

  // Prompts state
  const [promptsData, setPromptsData] = useState<{
    system_prompts: Record<string, string>;
    scenario_stimuli: Record<string, string>;
  } | null>(null);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('report');
  const [copied, setCopied] = useState(false);

  // Execution modal state
  const [running, setRunning] = useState(false);
  const [modalScenario, setModalScenario] = useState<ScenarioDefinition | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('hardened');

  // A/B Comparison state
  const [compRunA, setCompRunA] = useState<string>('');
  const [compRunB, setCompRunB] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sc, pol, r, v, pr, ap] = await Promise.all([
        fetchScenarios(),
        fetchPolicies(),
        fetchRuns(),
        fetchVultrStatus(),
        fetchPrompts(),
        fetchApprovals()
      ]);
      setScenarios(sc);
      setPolicies(pol);
      setRuns(r);
      setVultrStatus(v);
      setPromptsData(pr);
      setApprovals(ap);
      if (r.length > 0 && !selectedRun) {
        setSelectedRun(r[0]);
      }
    } catch (err) {
      console.error("Error loading ContainBench data:", err);
    }
  };

  const handleLaunchTest = async () => {
    if (!modalScenario) return;
    setRunning(true);
    try {
      const newRun = await createRun(modalScenario.id, selectedPolicyId);
      setRuns(prev => [newRun, ...prev]);
      setSelectedRun(newRun);
      setModalScenario(null);
      setActiveTab('runs');
      refreshApprovals();
    } catch (err) {
      alert("Error running the crash test: " + err);
    } finally {
      setRunning(false);
    }
  };

  const refreshApprovals = async () => {
    try {
      setApprovals(await fetchApprovals());
    } catch (err) {
      console.error("Error loading approvals:", err);
    }
  };

  const handleDecision = async (approval: ApprovalRequest, approve: boolean) => {
    if (!operatorName.trim()) {
      alert("Enter your operator name before deciding.");
      return;
    }
    setDecidingId(approval.id);
    try {
      const { approval: decided, run } = await decideApproval(approval.id, approve, operatorName.trim());
      setApprovals(prev => prev.map(a => (a.id === decided.id ? decided : a)));
      setRuns(prev => prev.map(r => (r.id === run.id ? run : r)));
      if (selectedRun?.id === run.id) setSelectedRun(run);
    } catch (err) {
      alert("Error recording the decision: " + err);
    } finally {
      setDecidingId(null);
    }
  };

  const handleGenerateStimulus = async () => {
    setOrchLoading('stimulus');
    try {
      setOrchStimulus(await generateAdversaryStimulus(orchScenario, orchPolicyId));
    } catch (err) {
      alert("Error generating the stimulus: " + err);
    } finally {
      setOrchLoading(null);
    }
  };

  const handleGeneratePlan = async () => {
    setOrchLoading('plan');
    try {
      setOrchPlan(await generateExecutionPlan(orchScenario, orchPolicyId));
    } catch (err) {
      alert("Error generating the plan: " + err);
    } finally {
      setOrchLoading(null);
    }
  };

  const handleRunComparison = async () => {
    if (!compRunA || !compRunB) return;
    setComparing(true);
    try {
      const comp = await compareRuns(compRunA, compRunB);
      setComparison(comp);
    } catch (err) {
      alert("Error comparing runs: " + err);
    } finally {
      setComparing(false);
    }
  };

  const runQuickDemoAB = async (scenarioId: string = 'CB-001') => {
    setRunning(true);
    try {
      const runA = await createRun(scenarioId, 'baseline_permissive');
      const runB = await createRun(scenarioId, 'hardened');
      setRuns(prev => [runB, runA, ...prev]);
      setCompRunA(runA.id);
      setCompRunB(runB.id);
      const comp = await compareRuns(runA.id, runB.id);
      setComparison(comp);
      setActiveTab('compare');
    } catch (err) {
      alert("Quick demo error: " + err);
    } finally {
      setRunning(false);
    }
  };

  const downloadReport = async (runId: string) => {
    try {
      const markdown = await fetchRunReport(runId);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `containbench-audit-${runId}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error downloading the report: " + err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Shield className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ContainBench
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-mono font-semibold border border-teal-500/20">
                MVP v0.1
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono font-medium border border-blue-500/20 hidden md:inline-flex items-center gap-1">
                <Server className="h-3 w-3" /> Vultr: Agent Rush
              </span>
            </div>
            <p className="text-xs text-slate-400">Crash-test your AI agent before production</p>
          </div>
        </div>

        {/* Status and Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <span className={`h-2 w-2 rounded-full ${vultrStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300">Inference:</span>
            <span className="text-slate-400">{vultrStatus?.connected ? 'Vultr Serverless' : 'Deterministic Mode'}</span>
          </div>

          <button
            onClick={() => runQuickDemoAB('CB-001')}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
          >
            {running ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            A/B Containment Demo
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 px-6">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'scenarios'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Scenario Suite ({scenarios.length})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'runs'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            Timeline & Findings ({runs.length})
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'compare'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            A/B Comparison (Demo Story)
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'prompts'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            Prompt Engineering & Stimuli
          </button>
          <button
            onClick={() => {
              setActiveTab('approvals');
              refreshApprovals();
            }}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Human Approvals ({approvals.filter(a => a.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('orchestration')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'orchestration'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            Orchestration
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: SCENARIOS SUITE */}
        {activeTab === 'scenarios' && (
          <div>
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Attack & Containment Scenarios</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Six crash tests designed to check whether the infrastructure stops the agent before it causes damage.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition p-5 flex flex-col justify-between group shadow-sm hover:shadow-teal-950/20"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-teal-300 border border-slate-700">
                        {sc.id}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                          sc.severity === 'critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {sc.severity}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-white mb-2 group-hover:text-teal-300 transition">
                      {sc.title}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      {sc.description}
                    </p>

                    <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold">PASS criteria:</span>{' '}
                        <span className="text-slate-300">{sc.pass_criteria}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold">FAIL criteria:</span>{' '}
                        <span className="text-slate-300">{sc.fail_criteria}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() => {
                        setModalScenario(sc);
                        setSelectedPolicyId('hardened');
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-teal-600 hover:text-slate-950 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Test Scenario
                    </button>
                    <button
                      onClick={() => runQuickDemoAB(sc.id)}
                      title="Run the Permissive vs Hardened comparison"
                      className="py-2 px-3 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold transition border border-teal-500/20"
                    >
                      A/B Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: RUNS TIMELINE & FINDINGS */}
        {activeTab === 'runs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left list of runs */}
            <div className="lg:col-span-4 space-y-3">
              <h2 className="text-lg font-bold text-white mb-3">Run History</h2>
              {runs.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
                  No runs recorded yet. Click "A/B Containment Demo" or run a scenario.
                </div>
              ) : (
                runs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      selectedRun?.id === r.id
                        ? 'bg-slate-800/90 border-teal-500 shadow-md shadow-teal-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-300">{r.id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                          r.verdict === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.verdict === 'FAIL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {r.verdict} ({r.score}/100)
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-white mb-1">{r.scenario_id}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{r.policy.name}</span>
                      <span className="font-mono text-[10px]">{r.execution_mode}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Run Details */}
            <div className="lg:col-span-8">
              {selectedRun ? (
                <div className="space-y-6">
                  {/* Run Header Card */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-white">{selectedRun.scenario_id}</h2>
                          <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {selectedRun.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Policy: <span className="text-teal-300 font-semibold">{selectedRun.policy.name}</span> | Mode: <span className="font-mono uppercase">{selectedRun.execution_mode}</span> | Status: <span className={`font-mono ${selectedRun.status === 'COMPLETED' ? 'text-slate-300' : 'text-amber-300'}`}>{selectedRun.status}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => downloadReport(selectedRun.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold transition"
                          title="Generate and download the Markdown audit report"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download MD Report
                        </button>

                        <div className="text-right">
                          <div className="text-xs text-slate-400">Score</div>
                          <div className="text-2xl font-black font-mono tracking-tight text-white">
                            {selectedRun.score}
                            <span className="text-sm font-normal text-slate-500">/100</span>
                          </div>
                        </div>
                        <div
                          className={`p-3 rounded-xl flex items-center justify-center ${
                            selectedRun.verdict === 'PASS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {selectedRun.verdict === 'PASS' ? (
                            <ShieldCheck className="h-7 w-7" />
                          ) : (
                            <ShieldAlert className="h-7 w-7" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary by Vultr */}
                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-200">
                      <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5" />
                        Evidence Analysis (Vultr Inference)
                      </div>
                      <p className="whitespace-pre-line">{selectedRun.summary}</p>
                    </div>

                    {/* Canary token indicator if present */}
                    {selectedRun.canary_token && (
                      <div className="mt-4 flex items-center justify-between text-xs font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Generated decoy secret:</span>
                        <span className="text-amber-300 font-bold">{selectedRun.canary_token}</span>
                      </div>
                    )}
                  </div>

                  {/* Findings & Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Deterministic Findings
                      </h3>
                      <ul className="space-y-2.5 text-xs">
                        {selectedRun.findings.map((f, i) => (
                          <li key={i} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono mr-2 ${
                                f.severity === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-teal-500/20 text-teal-300'
                              }`}
                            >
                              {f.severity}
                            </span>
                            <span className="text-slate-200">{f.statement}</span>
                            {f.event_ids.length > 0 && (
                              <div className="mt-1 text-[10px] font-mono text-slate-400">
                                Events: {f.event_ids.join(', ')}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                        Security Recommendations
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                        {selectedRun.recommendations.map((r, i) => (
                          <li key={i} className="leading-relaxed">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Event Timeline */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-teal-400" />
                      Normalized Event Timeline
                    </h3>
                    <div className="space-y-3 font-mono text-xs">
                      {selectedRun.timeline.map((evt) => (
                        <div
                          key={evt.event_id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                        >
                          <span className="text-slate-500 text-[10px] w-6 pt-0.5">#{evt.sequence}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              evt.decision === 'deny'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : evt.decision === 'allow'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : evt.decision === 'intercept'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {evt.decision}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-teal-300 font-bold">{evt.source}</span>
                              <span className="text-slate-400">({evt.action})</span>
                              <span className="text-white truncate max-w-sm">{evt.target}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                              Type: <code className="text-slate-300 font-mono text-[10px]">{evt.type}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                  Select a run to see its timeline and findings.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: A/B COMPARISON (THE DEMO STORY) */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-2">A/B Comparison: Baseline vs Hardened Policy</h2>
              <p className="text-sm text-slate-400 mb-6">
                Shows the value of ContainBench: how a strict isolation setup prevents the compromise that happens under a permissive baseline.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Run A (Permissive Baseline)</label>
                  <select
                    value={compRunA}
                    onChange={(e) => setCompRunA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="">Select a run...</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} - {r.scenario_id} - {r.policy.name} ({r.verdict})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Run B (Hardened Policy)</label>
                  <select
                    value={compRunB}
                    onChange={(e) => setCompRunB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="">Select a run...</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} - {r.scenario_id} - {r.policy.name} ({r.verdict})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={!compRunA || !compRunB || comparing}
                className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {comparing ? 'Comparing...' : 'Compare Timelines'}
              </button>
            </div>

            {/* Comparison Results Card */}
            {comparison && (
              <div className="space-y-6">
                {/* Metric banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Blast Radius Reduction</span>
                    <h3 className="text-3xl font-extrabold text-white mt-1">{comparison.containment_gain}</h3>
                    <p className="text-xs text-slate-300 mt-1">{comparison.difference_summary}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-400 font-semibold mb-2">Decisive Controls:</div>
                    {comparison.effective_controls.map((ctrl, i) => (
                      <div key={i} className="flex items-center gap-2 text-teal-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                        <span>{ctrl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side by side cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Run A */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/20">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <span className="text-xs font-mono text-slate-400">{comparison.run_a.id}</span>
                        <h4 className="font-bold text-white text-sm">{comparison.run_a.policy.name}</h4>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-md font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {comparison.run_a.verdict} ({comparison.run_a.score}/100)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {comparison.run_a.timeline.map((e) => (
                        <div key={e.event_id} className="p-2 rounded bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                          <span className="truncate">{e.target}</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase ${
                            e.decision === 'allow' ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {e.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Run B */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-teal-500/30">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <span className="text-xs font-mono text-slate-400">{comparison.run_b.id}</span>
                        <h4 className="font-bold text-white text-sm">{comparison.run_b.policy.name}</h4>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-md font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {comparison.run_b.verdict} ({comparison.run_b.score}/100)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {comparison.run_b.timeline.map((e) => (
                        <div key={e.event_id} className="p-2 rounded bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                          <span className="truncate">{e.target}</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase ${
                            e.decision === 'deny' ? 'text-teal-400' : 'text-slate-400'
                          }`}>
                            {e.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROMPTS & STIMULI EXPLORER */}
        {activeTab === 'prompts' && promptsData && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Prompt Engineering & Stimuli</h1>
              <p className="text-slate-400 text-sm mt-1">
                Inspect the system prompts and the adversarial stimuli applied to keep tests reproducible and deterministic.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Selector */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">System Prompts</h3>
                  <div className="space-y-1.5">
                    {[
                      { key: 'report', title: 'Report Generator', desc: 'prompts/report-system.md' },
                      { key: 'evaluator', title: 'Explanatory Evaluator', desc: 'prompts/evaluator-system.md' },
                      { key: 'adversary', title: 'Adversarial Generator', desc: 'prompts/adversary-system.md' },
                      { key: 'orchestrator', title: 'Sandbox Planner', desc: 'prompts/orchestrator-system.md' }
                    ].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setSelectedPromptKey(p.key)}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          selectedPromptKey === p.key
                            ? 'bg-slate-800 border-teal-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">{p.title}</div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Adversarial Stimuli (Per Scenario)</h3>
                  <div className="space-y-1.5">
                    {['CB-001', 'CB-002', 'CB-003', 'CB-004', 'CB-005', 'CB-006'].map(scId => (
                      <button
                        key={scId}
                        onClick={() => setSelectedPromptKey(scId)}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          selectedPromptKey === scId
                            ? 'bg-slate-800 border-amber-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">{scId}: {scenarios.find(s => s.id === scId)?.title || scId}</div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">prompts/scenarios/{scId.toLowerCase()}-*.md</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Content Viewer */}
              <div className="lg:col-span-8">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div>
                      <span className="font-mono text-xs text-teal-400 uppercase font-bold">{selectedPromptKey}</span>
                      <h3 className="text-lg font-bold text-white">Prompt / Stimulus Content</h3>
                    </div>

                    <button
                      onClick={() => {
                        const content = promptsData.system_prompts[selectedPromptKey] || promptsData.scenario_stimuli[selectedPromptKey] || '';
                        copyToClipboard(content);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[600px]">
                    {promptsData.system_prompts[selectedPromptKey] || promptsData.scenario_stimuli[selectedPromptKey] || 'Prompt not available.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HUMAN APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Human Approvals</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Sensitive tool calls intercepted by the dispatcher. Approving runs the simulated tool with a signed token; rejecting discards the call.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operator</label>
                <input
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white w-56"
                />
              </div>
            </div>

            {approvals.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
                No approval requests yet. Run CB-006 with the hardened policy to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">{a.tool}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                              a.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : a.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          {a.id} · {a.scenario_id} · {a.run_id}
                        </div>
                      </div>

                      {a.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(a, false)}
                            disabled={decidingId === a.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleDecision(a, true)}
                            disabled={decidingId === a.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          {a.status === 'APPROVED' ? 'Approved' : 'Rejected'} by <span className="text-slate-200">{a.decided_by}</span>
                        </div>
                      )}
                    </div>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto">
                      {JSON.stringify(a.arguments, null, 2)}
                    </pre>
                    {a.arguments?.emergency_override && (
                      <p className="mt-2 text-[11px] text-amber-300">
                        The agent requested emergency_override. It was recorded and ignored: only a human decision can release this call.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ORCHESTRATION (adversarial generator + execution planner) */}
        {activeTab === 'orchestration' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Orchestration</h1>
              <p className="text-slate-400 text-sm mt-1">
                Preview what the orchestrator would do: an adversarial stimulus bounded to the scenario's allowed targets, and an advisory execution plan. Both are generated for inspection and never run the agent.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Scenario</label>
                <select
                  value={orchScenario}
                  onChange={(e) => setOrchScenario(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} - {s.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Policy</label>
                <select
                  value={orchPolicyId}
                  onChange={(e) => setOrchPolicyId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerateStimulus}
                disabled={orchLoading !== null}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                {orchLoading === 'stimulus' ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Stimulus
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={orchLoading !== null}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                {orchLoading === 'plan' ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
                Generate Plan
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adversarial stimulus */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Adversarial Stimulus
                </h3>
                {orchStimulus ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">{orchStimulus.status}</span>
                      <span className="text-slate-300">{orchStimulus.attack_name}</span>
                    </div>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap">
                      {orchStimulus.stimulus?.content || ''}
                    </pre>
                    {orchStimulus.safety_constraints?.length > 0 && (
                      <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-0.5">
                        {orchStimulus.safety_constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Generate a stimulus to preview it.</p>
                )}
              </div>

              {/* Execution plan */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-teal-400" />
                  Execution Plan <span className="text-[10px] font-normal text-slate-500">(advisory)</span>
                </h3>
                {orchPlan ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">{orchPlan.status}</span>
                      <span className="text-slate-500 font-mono text-[10px]">source: {orchPlan.source}</span>
                    </div>
                    <ol className="space-y-2 text-xs">
                      {(orchPlan.steps || []).map((s: any) => (
                        <li key={s.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500">{s.id}</span>
                            <span className="font-mono text-teal-300 text-[11px]">{s.tool}</span>
                          </div>
                          <div className="text-slate-300 mt-0.5">{s.purpose}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Generate a plan to preview it.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal for Launching Single Test */}
      {modalScenario && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Configure Crash Test: {modalScenario.id}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{modalScenario.title}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Containment Policy</label>
                <div className="space-y-2">
                  {policies.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedPolicyId === p.id
                          ? 'bg-teal-500/10 border-teal-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="policy"
                        value={p.id}
                        checked={selectedPolicyId === p.id}
                        onChange={() => setSelectedPolicyId(p.id)}
                        className="mt-1 accent-teal-500"
                      />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{p.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalScenario(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchTest}
                disabled={running}
                className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-2"
              >
                {running ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                Run Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
