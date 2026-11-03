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
  XCircle,
  HelpCircle,
  Cpu,
  Lock,
  ArrowRight
} from 'lucide-react';
import { fetchScenarios, fetchPolicies, fetchRuns, createRun, compareRuns, fetchVultrStatus } from './api';
import { ScenarioDefinition, PolicyConfig, RunResult, ComparisonResult, Event } from './types';

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'runs' | 'compare'>('scenarios');
  const [vultrStatus, setVultrStatus] = useState<{ connected: boolean; status: string } | null>(null);

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
      const [sc, pol, r, v] = await Promise.all([
        fetchScenarios(),
        fetchPolicies(),
        fetchRuns(),
        fetchVultrStatus()
      ]);
      setScenarios(sc);
      setPolicies(pol);
      setRuns(r);
      setVultrStatus(v);
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
    } catch (err) {
      alert("Error ejecutando el crash-test: " + err);
    } finally {
      setRunning(false);
    }
  };

  const handleRunComparison = async () => {
    if (!compRunA || !compRunB) return;
    setComparing(true);
    try {
      const comp = await compareRuns(compRunA, compRunB);
      setComparison(comp);
    } catch (err) {
      alert("Error comparando ejecuciones: " + err);
    } finally {
      setComparing(false);
    }
  };

  const runQuickDemoAB = async (scenarioId: string = 'CB-001') => {
    setRunning(true);
    try {
      // Run permissive
      const runA = await createRun(scenarioId, 'baseline_permissive');
      // Run hardened
      const runB = await createRun(scenarioId, 'hardened');
      setRuns(prev => [runB, runA, ...prev]);
      setCompRunA(runA.id);
      setCompRunB(runB.id);
      const comp = await compareRuns(runA.id, runB.id);
      setComparison(comp);
      setActiveTab('compare');
    } catch (err) {
      alert("Error en Quick Demo: " + err);
    } finally {
      setRunning(false);
    }
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
            Demo A/B Contención
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'scenarios'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Suite de Escenarios ({scenarios.length})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'runs'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            Línea de Tiempo & Hallazgos ({runs.length})
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'compare'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Comparador A/B (Historia de Demostración)
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
                <h1 className="text-2xl font-bold tracking-tight text-white">Escenarios de Ataque & Contención</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Seis pruebas de choque diseñadas para verificar si la infraestructura detiene al agente antes de provocar daño.
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
                        <span className="text-slate-400 font-semibold">Criterio PASS:</span>{' '}
                        <span className="text-slate-300">{sc.pass_criteria}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold">Criterio FAIL:</span>{' '}
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
                      Probar Escenario
                    </button>
                    <button
                      onClick={() => runQuickDemoAB(sc.id)}
                      title="Ejecutar comparativa Permisiva vs Endurecida"
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
              <h2 className="text-lg font-bold text-white mb-3">Historial de Ejecuciones</h2>
              {runs.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
                  No hay ejecuciones registradas. Haz clic en "Demo A/B Contención" o ejecuta un escenario.
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
                          Política: <span className="text-teal-300 font-semibold">{selectedRun.policy.name}</span> | Modo: <span className="font-mono uppercase">{selectedRun.execution_mode}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Puntaje Determinista</div>
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
                        Análisis de Evidencia (Vultr Inference)
                      </div>
                      <p>{selectedRun.summary}</p>
                    </div>

                    {/* Canary token indicator if present */}
                    {selectedRun.canary_token && (
                      <div className="mt-4 flex items-center justify-between text-xs font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Secreto señuelo generado:</span>
                        <span className="text-amber-300 font-bold">{selectedRun.canary_token}</span>
                      </div>
                    )}
                  </div>

                  {/* Findings & Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Hallazgos Deterministas
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
                                Eventos: {f.event_ids.join(', ')}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                      <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                        Recomendaciones de Seguridad
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
                      Línea de Tiempo de Eventos Normalizados
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
                              Tipo: <code className="text-slate-300 font-mono text-[10px]">{evt.type}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                  Selecciona una ejecución para ver su línea de tiempo y hallazgos.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: A/B COMPARISON (THE DEMO STORY) */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-2">Comparativa A/B: Baseline vs Política Endurecida</h2>
              <p className="text-sm text-slate-400 mb-6">
                Demuestra el valor de ContainBench: cómo una configuración de aislamiento estricta previene el compromiso que ocurre en una baseline permisiva.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ejecución A (Baseline Permisiva)</label>
                  <select
                    value={compRunA}
                    onChange={(e) => setCompRunA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="">Selecciona ejecución...</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} - {r.scenario_id} - {r.policy.name} ({r.verdict})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ejecución B (Política Endurecida)</label>
                  <select
                    value={compRunB}
                    onChange={(e) => setCompRunB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="">Selecciona ejecución...</option>
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
                {comparing ? 'Comparando...' : 'Comparar Líneas de Tiempo'}
              </button>
            </div>

            {/* Comparison Results Card */}
            {comparison && (
              <div className="space-y-6">
                {/* Metric banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Reducción del Radio de Daño</span>
                    <h3 className="text-3xl font-extrabold text-white mt-1">{comparison.containment_gain}</h3>
                    <p className="text-xs text-slate-300 mt-1">{comparison.difference_summary}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-400 font-semibold mb-2">Controles Determinantes:</div>
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
      </main>

      {/* Modal for Launching Single Test */}
      {modalScenario && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Configurar Crash Test: {modalScenario.id}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{modalScenario.title}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Política de Contención</label>
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
                Cancelar
              </button>
              <button
                onClick={handleLaunchTest}
                disabled={running}
                className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-2"
              >
                {running ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                Ejecutar Prueba
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
