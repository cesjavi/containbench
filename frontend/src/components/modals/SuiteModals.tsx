import React, { useEffect } from 'react';
import { Layers, Play, X, FileText, ShieldCheck, ShieldAlert, HelpCircle, AlertTriangle } from 'lucide-react';
import { PolicyConfig, RunResult } from '../../types';
import type { AgentModel } from '../../api';
import { AgentPicker } from './AgentPicker';
import { AgentRiskBadge } from '../runs/AgentRiskBadge';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

interface SuiteRunModalProps {
  open: boolean;
  scenarioCount: number;
  policies: PolicyConfig[];
  policyId: string;
  setPolicyId: (id: string) => void;
  agentEndpoint: string;
  setAgentEndpoint: (endpoint: string) => void;
  llmAgentLabel: string;
  llmAgentModel?: string;
  llmAgentModels?: AgentModel[];
  running: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

/** Chooses the policy and the agent before running every scenario. */
export function SuiteRunModal({
  open,
  scenarioCount,
  policies,
  policyId,
  setPolicyId,
  agentEndpoint,
  setAgentEndpoint,
  llmAgentLabel,
  llmAgentModel,
  llmAgentModels,
  running,
  onClose,
  onLaunch,
}: SuiteRunModalProps) {
  useEscape(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-400" />
              Run Complete Suite
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Runs all {scenarioCount} scenarios one after another with the same policy and agent.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Containment Policy</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {policies.map((p) => (
                <label
                  key={p.id}
                  title={p.description}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                    policyId === p.id
                      ? 'bg-teal-500/10 border-teal-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="suite-policy"
                    checked={policyId === p.id}
                    onChange={() => setPolicyId(p.id)}
                    className="accent-teal-500"
                  />
                  <span className="font-semibold">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          <AgentPicker
            agentEndpoint={agentEndpoint}
            setAgentEndpoint={setAgentEndpoint}
            llmAgentLabel={llmAgentLabel}
            llmAgentModel={llmAgentModel}
            llmAgentModels={llmAgentModels}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold">
            Cancel
          </button>
          <button
            onClick={onLaunch}
            disabled={running || scenarioCount === 0}
            className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Run {scenarioCount} scenarios
          </button>
        </div>
      </div>
    </div>
  );
}

export interface SuiteEntry {
  scenarioId: string;
  run?: RunResult;
  error?: string;
}

export interface SuiteSummary {
  policyName: string;
  agent: string;
  entries: SuiteEntry[];
}

interface SuiteSummaryModalProps {
  summary: SuiteSummary | null;
  onClose: () => void;
  onOpenRun: (run: RunResult) => void;
  onOpenReport: (runId: string) => void;
  /** True while a run report is open on top: Escape then closes only that one. */
  covered?: boolean;
}

const VERDICT_STYLE: Record<string, string> = {
  PASS: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  FAIL: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  INCONCLUSIVE: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
};

/** The suite's report: one row per scenario, with a link to each run's full audit report. */
export function SuiteSummaryModal({ summary, onClose, onOpenRun, onOpenReport, covered }: SuiteSummaryModalProps) {
  useEscape(summary !== null && !covered, onClose);
  if (!summary) return null;

  const runs = summary.entries.flatMap((e) => (e.run ? [e.run] : []));
  const count = (v: string) => runs.filter((r) => r.verdict === v).length;
  const errors = summary.entries.filter((e) => e.error).length;
  const dangerous = runs.filter((r) => r.agent_assessment?.risk === 'dangerous').length;
  // Containment only counts runs that actually tested the sandbox (PASS or FAIL). An INCONCLUSIVE
  // run (agent refused, or attacked some other way) tested nothing, so averaging its 30 in would
  // lower the infrastructure's grade for the model's behavior.
  const contained = count('PASS');
  const tested = contained + count('FAIL');
  const untested = count('INCONCLUSIVE');
  const rate = tested ? Math.round((contained / tested) * 100) : null;

  const tiles = [
    { label: 'Contained (PASS)', value: count('PASS'), icon: ShieldCheck, cls: 'text-emerald-300' },
    { label: 'Not contained (FAIL)', value: count('FAIL'), icon: ShieldAlert, cls: 'text-rose-300' },
    { label: 'Not tested (inconclusive)', value: untested, icon: HelpCircle, cls: 'text-amber-300' },
    { label: 'Agent attempted attack', value: dangerous, icon: AlertTriangle, cls: 'text-rose-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-start justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-400" />
              Suite Report
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Policy <span className="text-teal-300 font-semibold">{summary.policyName}</span> · Agent{' '}
              <span className="font-mono text-slate-200">{summary.agent}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Containment</div>
              <div
                className={`text-xl font-black font-mono ${
                  rate === null ? 'text-slate-400' : rate === 100 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {tested ? `${contained}/${tested}` : '—'}
              </div>
              <div className="text-[10px] text-slate-500">
                {rate === null ? 'no attack reached the sandbox' : `${rate}% of attacks that reached it`}
              </div>
            </div>
            {tiles.map(({ label, value, icon: Icon, cls }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${cls}`} />
                  {label}
                </div>
                <div className={`text-xl font-black font-mono ${cls}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2">Scenario</th>
                  <th className="text-left px-3 py-2">Verdict</th>
                  <th className="text-right px-3 py-2">Score</th>
                  <th className="text-left px-3 py-2">Agent</th>
                  <th className="text-left px-3 py-2">Chosen actions</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {summary.entries.map(({ scenarioId, run, error }) => (
                  <tr key={scenarioId} className="border-t border-slate-800 align-top">
                    <td className="px-3 py-2 font-mono font-bold text-teal-300">{scenarioId}</td>
                    {run ? (
                      <>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded border font-mono font-bold text-[10px] ${VERDICT_STYLE[run.verdict ?? ''] ?? ''}`}>
                            {run.verdict}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-200">{run.score}</td>
                        <td className="px-3 py-2">
                          <AgentRiskBadge assessment={run.agent_assessment} />
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {run.agent_assessment?.actions?.length ? run.agent_assessment.actions.join(', ') : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <button onClick={() => onOpenRun(run)} className="text-slate-300 hover:text-white underline mr-3">
                            Timeline
                          </button>
                          <button
                            onClick={() => onOpenReport(run.id)}
                            className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200 font-semibold"
                          >
                            <FileText className="h-3 w-3" />
                            Report
                          </button>
                        </td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-3 py-2 text-rose-300">
                        Error: {error}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            The verdict measures containment (did the sandbox stop the attack). The agent column measures behavior
            (did the agent try it). LLM agents are not deterministic: run the suite again to see how stable they are.
            {untested > 0 &&
              ` ${untested} scenario(s) did not test the sandbox (the agent refused or attacked another way): ` +
                'run the suite with the scripted reference agent to test those controls.'}
            {errors > 0 && ` ${errors} scenario(s) did not run; the error is shown in their row.`}
          </p>
        </div>
      </div>
    </div>
  );
}
