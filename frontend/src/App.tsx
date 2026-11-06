import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchScenarios,
  fetchPolicies,
  fetchRuns,
  createRun,
  compareRuns,
  fetchVultrStatus,
  fetchPrompts,
  fetchApprovals,
  decideApproval,
  generateAdversaryStimulus,
  generateExecutionPlan,
  VultrStatus,
} from './api';
import {
  ScenarioDefinition,
  PolicyConfig,
  RunResult,
  ComparisonResult,
  ApprovalRequest,
} from './types';
import { ToastProvider, useToast } from './components/ui/Toast';
import { LiveExecutionModal } from './components/ui/LiveExecutionModal';
import { SplashScreen } from './components/ui/SplashScreen';
import { Header } from './components/layout/Header';
import { NavigationTabs, TabKey } from './components/layout/NavigationTabs';
import { ScenarioGrid } from './components/scenarios/ScenarioGrid';
import { RunHistoryList } from './components/runs/RunHistoryList';
import { RunDetailView } from './components/runs/RunDetailView';
import { ComparisonView } from './components/compare/ComparisonView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { PromptsView } from './components/prompts/PromptsView';
import { OrchestrationView } from './components/orchestration/OrchestrationView';
import { RunTestModal } from './components/modals/RunTestModal';
import { ReportModal } from './components/modals/ReportModal';
import { agentLabel } from './components/modals/AgentPicker';
import { SuiteRunModal, SuiteSummaryModal, SuiteEntry, SuiteSummary } from './components/modals/SuiteModals';

const LLM_AGENT = 'llm';

function MainApp() {
  const toast = useToast();

  // Core Data
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('scenarios');

  // Vultr & System Status
  const [vultrStatus, setVultrStatus] = useState<VultrStatus | null>(null);
  const llmAgent = vultrStatus?.agent;
  const llmAgentLabel = llmAgent?.provider === 'vultr' ? 'LLM (Vultr)' : 'LLM (Local)';

  // Approvals State
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [operatorName, setOperatorName] = useState<string>('');
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Orchestration State
  const [orchScenario, setOrchScenario] = useState<string>('CB-001');
  const [orchPolicyId, setOrchPolicyId] = useState<string>('hardened');
  const [orchStimulus, setOrchStimulus] = useState<any | null>(null);
  const [orchPlan, setOrchPlan] = useState<any | null>(null);
  const [orchLoading, setOrchLoading] = useState<'stimulus' | 'plan' | null>(null);

  // Prompts State
  const [promptsData, setPromptsData] = useState<{
    system_prompts: Record<string, string>;
    scenario_stimuli: Record<string, string>;
  } | null>(null);

  // Execution & Stepper Modal State
  const [running, setRunning] = useState(false);
  const [activeExecutionInfo, setActiveExecutionInfo] = useState<{
    customTitle?: string;
    scenarioId?: string;
    policyName?: string;
  } | null>(null);
  const [modalScenario, setModalScenario] = useState<ScenarioDefinition | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('hardened');
  const [agentEndpoint, setAgentEndpoint] = useState<string>(LLM_AGENT);

  // Suite dialog, suite report and run report pop-ups
  const [suiteDialogOpen, setSuiteDialogOpen] = useState(false);
  const [suitePolicyId, setSuitePolicyId] = useState<string>('hardened');
  const [suiteAgent, setSuiteAgent] = useState<string>(LLM_AGENT);
  const [suiteSummary, setSuiteSummary] = useState<SuiteSummary | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const closeReport = useCallback(() => setReportRunId(null), []);
  const closeSuiteDialog = useCallback(() => setSuiteDialogOpen(false), []);
  const closeSuiteSummary = useCallback(() => setSuiteSummary(null), []);

  // A/B Comparison State
  const [compRunA, setCompRunA] = useState<string>('');
  const [compRunB, setCompRunB] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  // Splash & Initial Loading State
  const [initialLoading, setInitialLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  // Initial Load
  const loadData = useCallback(async () => {
    const load = async <T,>(fetcher: () => Promise<T>, apply: (value: T) => void, label: string) => {
      try {
        apply(await fetcher());
      } catch (err) {
        console.error(`Error loading ${label}:`, err);
      }
    };

    try {
      await Promise.all([
        load(fetchScenarios, setScenarios, 'scenarios'),
        load(fetchPolicies, setPolicies, 'policies'),
        load(
          fetchRuns,
          (r) => {
            setRuns(r);
            if (r.length > 0) setSelectedRun((prev) => prev ?? r[0]);
          },
          'runs'
        ),
        load(fetchVultrStatus, setVultrStatus, 'Vultr status'),
        load(fetchPrompts, setPromptsData, 'prompts'),
        load(fetchApprovals, setApprovals, 'approvals'),
      ]);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshApprovals = async () => {
    try {
      const data = await fetchApprovals();
      setApprovals(data);
    } catch (err: any) {
      toast.error('Failed to reload approvals', err.message);
    }
  };

  // Launch Single Scenario Test
  const handleLaunchTest = async () => {
    if (!modalScenario) return;
    const pol = policies.find((p) => p.id === selectedPolicyId);
    setRunning(true);
    setActiveExecutionInfo({
      scenarioId: modalScenario.id,
      policyName: pol?.name || selectedPolicyId,
    });

    try {
      const newRun = await createRun(modalScenario.id, selectedPolicyId, agentEndpoint);
      setRuns((prev) => [newRun, ...prev]);
      setSelectedRun(newRun);
      setModalScenario(null);
      setActiveTab('runs');
      refreshApprovals();
      toast.success(
        `Test Completed: ${newRun.scenario_id}`,
        `Verdict: ${newRun.verdict} (${newRun.score}/100) under ${newRun.policy.name}`
      );
    } catch (err: any) {
      toast.error('Execution Failed', err.message || String(err));
    } finally {
      setRunning(false);
      setActiveExecutionInfo(null);
    }
  };

  // Run Quick A/B Comparison Demo
  const runQuickDemoAB = async (scenarioId: string = 'CB-001') => {
    setRunning(true);
    setActiveExecutionInfo({
      customTitle: `A/B Crash Test: ${scenarioId}`,
      scenarioId,
      policyName: 'Baseline Permissive vs Hardened',
    });

    try {
      toast.info('A/B Test Started', `Executing ${scenarioId} under Permissive Baseline and Hardened Policy...`);
      const runA = await createRun(scenarioId, 'baseline_permissive', LLM_AGENT);
      setRuns((prev) => [runA, ...prev]);

      const runB = await createRun(scenarioId, 'hardened', LLM_AGENT);
      setRuns((prev) => [runB, ...prev]);

      setCompRunA(runA.id);
      setCompRunB(runB.id);

      const comp = await compareRuns(runA.id, runB.id);
      setComparison(comp);
      setActiveTab('compare');
      toast.success('A/B Comparison Ready', `Containment Gain: ${comp.containment_gain}`);
    } catch (err: any) {
      toast.error('Quick Demo Error', err.message || String(err));
    } finally {
      setRunning(false);
      setActiveExecutionInfo(null);
    }
  };

  // Run Complete Suite (all scenarios sequentially, with the policy and agent chosen in the dialog)
  const handleRunAllSuite = async () => {
    if (scenarios.length === 0 || running) return;
    const pol = policies.find((p) => p.id === suitePolicyId);
    const policyName = pol?.name || suitePolicyId;
    const agent = agentLabel(suiteAgent, llmAgentLabel, llmAgent?.model);
    setSuiteDialogOpen(false);
    setRunning(true);
    toast.info('Suite Started', `Running ${scenarios.length} scenarios under ${policyName} with ${agent}...`);

    const entries: SuiteEntry[] = [];
    for (let i = 0; i < scenarios.length; i++) {
      const sc = scenarios[i];
      setActiveExecutionInfo({
        customTitle: `Suite [${i + 1}/${scenarios.length}]: ${sc.id}`,
        scenarioId: sc.id,
        policyName,
      });

      try {
        const newRun = await createRun(sc.id, suitePolicyId, suiteAgent);
        setRuns((prev) => [newRun, ...prev]);
        entries.push({ scenarioId: sc.id, run: newRun });
      } catch (err: any) {
        console.error(`Error running ${sc.id}:`, err);
        entries.push({ scenarioId: sc.id, error: err?.message || String(err) });
      }
    }

    setRunning(false);
    setActiveExecutionInfo(null);
    setActiveTab('runs');
    const lastRun = [...entries].reverse().find((e) => e.run)?.run;
    if (lastRun) setSelectedRun(lastRun);
    refreshApprovals();
    setSuiteSummary({ policyName, agent, entries });

    const count = (v: string) => entries.filter((e) => e.run?.verdict === v).length;
    const errors = entries.filter((e) => e.error).length;
    toast.success(
      'Suite Completed',
      `${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('INCONCLUSIVE')} INCONCLUSIVE` +
        (errors ? `, ${errors} error(s)` : '') +
        ` across ${scenarios.length} scenarios.`
    );
  };

  // Human Approval Decision
  const handleDecision = async (approval: ApprovalRequest, approve: boolean) => {
    if (!operatorName.trim()) {
      toast.error('Operator Required', 'Please enter your operator name before making a decision.');
      return;
    }
    setDecidingId(approval.id);
    try {
      const { approval: decided, run } = await decideApproval(
        approval.id,
        approve,
        operatorName.trim()
      );
      setApprovals((prev) => prev.map((a) => (a.id === decided.id ? decided : a)));
      setRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
      if (selectedRun?.id === run.id) setSelectedRun(run);
      toast.success(
        approve ? 'Tool Call Authorized' : 'Tool Call Rejected',
        `Request ${approval.id} marked as ${decided.status} by ${operatorName.trim()}`
      );
    } catch (err: any) {
      toast.error('Decision Error', err.message || String(err));
    } finally {
      setDecidingId(null);
    }
  };

  // Compare Selected Runs
  const handleRunComparison = async () => {
    if (!compRunA || !compRunB) return;
    setComparing(true);
    try {
      const comp = await compareRuns(compRunA, compRunB);
      setComparison(comp);
      toast.success('Timelines Compared', `Blast radius reduction: ${comp.containment_gain}`);
    } catch (err: any) {
      toast.error('Comparison Error', err.message || String(err));
    } finally {
      setComparing(false);
    }
  };

  // Generate Orchestration Stimulus
  const handleGenerateStimulus = async () => {
    setOrchLoading('stimulus');
    try {
      const res = await generateAdversaryStimulus(orchScenario, orchPolicyId);
      setOrchStimulus(res);
      toast.success('Stimulus Generated', `Bounded attack payload for ${orchScenario} created.`);
    } catch (err: any) {
      toast.error('Generation Error', err.message || String(err));
    } finally {
      setOrchLoading(null);
    }
  };

  // Generate Orchestration Plan
  const handleGeneratePlan = async () => {
    setOrchLoading('plan');
    try {
      const res = await generateExecutionPlan(orchScenario, orchPolicyId);
      setOrchPlan(res);
      toast.success('Execution Plan Generated', `Advisory sandbox plan for ${orchScenario} generated.`);
    } catch (err: any) {
      toast.error('Generation Error', err.message || String(err));
    } finally {
      setOrchLoading(null);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        vultrStatus={vultrStatus}
        running={running}
        onRunQuickDemo={() => runQuickDemoAB('CB-001')}
        onRunAllScenarios={() => setSuiteDialogOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        onNavigateToApprovals={() => {
          setActiveTab('approvals');
          refreshApprovals();
        }}
      />

      {/* Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'approvals') refreshApprovals();
        }}
        scenariosCount={scenarios.length}
        runsCount={runs.length}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Tab Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: SCENARIOS */}
        {activeTab === 'scenarios' && (
          <ScenarioGrid
            scenarios={scenarios}
            runs={runs}
            onOpenTestModal={(sc) => {
              setModalScenario(sc);
              setSelectedPolicyId('hardened');
            }}
            onRunQuickAB={runQuickDemoAB}
            onRunAll={() => setSuiteDialogOpen(true)}
            running={running}
          />
        )}

        {/* TAB 2: RUNS & TIMELINE */}
        {activeTab === 'runs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <RunHistoryList
                runs={runs}
                selectedRunId={selectedRun?.id}
                onSelectRun={setSelectedRun}
              />
            </div>
            <div className="lg:col-span-8">
              {selectedRun ? (
                <RunDetailView
                  run={selectedRun}
                  onOpenReport={setReportRunId}
                />
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                  Select a run from the history to view its details, findings and event timeline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: A/B COMPARISON */}
        {activeTab === 'compare' && (
          <ComparisonView
            runs={runs}
            compRunA={compRunA}
            compRunB={compRunB}
            setCompRunA={setCompRunA}
            setCompRunB={setCompRunB}
            comparison={comparison}
            comparing={comparing}
            onRunComparison={handleRunComparison}
            onQuickDemo={() => runQuickDemoAB('CB-001')}
            running={running}
          />
        )}

        {/* TAB 4: PROMPTS & STIMULI */}
        {activeTab === 'prompts' && (
          <PromptsView promptsData={promptsData} scenarios={scenarios} />
        )}

        {/* TAB 5: HUMAN APPROVALS */}
        {activeTab === 'approvals' && (
          <ApprovalsView
            approvals={approvals}
            operatorName={operatorName}
            setOperatorName={setOperatorName}
            decidingId={decidingId}
            onDecision={handleDecision}
            onRefresh={refreshApprovals}
          />
        )}

        {/* TAB 6: ORCHESTRATION */}
        {activeTab === 'orchestration' && (
          <OrchestrationView
            scenarios={scenarios}
            policies={policies}
            orchScenario={orchScenario}
            setOrchScenario={setOrchScenario}
            orchPolicyId={orchPolicyId}
            setOrchPolicyId={setOrchPolicyId}
            orchStimulus={orchStimulus}
            orchPlan={orchPlan}
            orchLoading={orchLoading}
            onGenerateStimulus={handleGenerateStimulus}
            onGeneratePlan={handleGeneratePlan}
          />
        )}
      </main>

      {/* Configure & Run Single Scenario Modal */}
      <RunTestModal
        scenario={modalScenario}
        policies={policies}
        selectedPolicyId={selectedPolicyId}
        setSelectedPolicyId={setSelectedPolicyId}
        agentEndpoint={agentEndpoint}
        setAgentEndpoint={setAgentEndpoint}
        running={running}
        llmAgentLabel={llmAgentLabel}
        llmAgentModel={llmAgent?.model}
        llmAgentModels={llmAgent?.models}
        onClose={() => setModalScenario(null)}
        onLaunch={handleLaunchTest}
      />

      {/* Configure & Run Complete Suite */}
      <SuiteRunModal
        open={suiteDialogOpen}
        scenarioCount={scenarios.length}
        policies={policies}
        policyId={suitePolicyId}
        setPolicyId={setSuitePolicyId}
        agentEndpoint={suiteAgent}
        setAgentEndpoint={setSuiteAgent}
        llmAgentLabel={llmAgentLabel}
        llmAgentModel={llmAgent?.model}
        llmAgentModels={llmAgent?.models}
        running={running}
        onClose={closeSuiteDialog}
        onLaunch={handleRunAllSuite}
      />

      {/* Suite report: one row per scenario */}
      <SuiteSummaryModal
        summary={suiteSummary}
        onClose={closeSuiteSummary}
        onOpenRun={(run) => {
          setSelectedRun(run);
          setActiveTab('runs');
          setSuiteSummary(null);
        }}
        onOpenReport={setReportRunId}
        covered={reportRunId !== null}
      />

      {/* Audit report of one run (stacks above the suite report) */}
      <ReportModal runId={reportRunId} onClose={closeReport} />

      {/* Live Stepper Execution Modal */}
      <LiveExecutionModal
        isOpen={running}
        customTitle={activeExecutionInfo?.customTitle}
        scenarioId={activeExecutionInfo?.scenarioId}
        policyName={activeExecutionInfo?.policyName}
      />

      {/* Initial Application Splash Screen */}
      {!splashDone && (
        <SplashScreen
          isLoading={initialLoading}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
