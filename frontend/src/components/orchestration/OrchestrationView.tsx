import React from 'react';
import { Sparkles, GitBranch, RotateCw, Terminal, Shield } from 'lucide-react';
import { ScenarioDefinition, PolicyConfig } from '../../types';

interface OrchestrationViewProps {
  scenarios: ScenarioDefinition[];
  policies: PolicyConfig[];
  orchScenario: string;
  setOrchScenario: (id: string) => void;
  orchPolicyId: string;
  setOrchPolicyId: (id: string) => void;
  orchStimulus: any;
  orchPlan: any;
  orchLoading: 'stimulus' | 'plan' | null;
  onGenerateStimulus: () => void;
  onGeneratePlan: () => void;
}

export function OrchestrationView({
  scenarios,
  policies,
  orchScenario,
  setOrchScenario,
  orchPolicyId,
  setOrchPolicyId,
  orchStimulus,
  orchPlan,
  orchLoading,
  onGenerateStimulus,
  onGeneratePlan,
}: OrchestrationViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-teal-400" />
          Autonomous Orchestration Preview
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Inspect how the adversarial orchestrator constructs the bounded attack payload and how the sandbox planner drafts advisory execution steps.
        </p>
      </div>

      {/* Control selectors */}
      <div className="flex flex-wrap gap-3 items-end bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Target Scenario</label>
          <select
            value={orchScenario}
            onChange={(e) => setOrchScenario(e.target.value)}
            className="bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-white outline-none"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} - {s.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Defense Policy</label>
          <select
            value={orchPolicyId}
            onChange={(e) => setOrchPolicyId(e.target.value)}
            className="bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-white outline-none"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onGenerateStimulus}
          disabled={orchLoading !== null}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
        >
          {orchLoading === 'stimulus' ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Generate Adversarial Stimulus
        </button>

        <button
          onClick={onGeneratePlan}
          disabled={orchLoading !== null}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
        >
          {orchLoading === 'plan' ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" />
          )}
          Generate Advisory Plan
        </button>
      </div>

      {/* Two Columns Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adversarial Stimulus */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Adversarial Stimulus (Bounded Payload)
            </h3>
            {orchStimulus ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-bold">
                    {orchStimulus.status}
                  </span>
                  <span className="text-slate-300 font-semibold">{orchStimulus.attack_name}</span>
                </div>

                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
                  {orchStimulus.stimulus?.content || 'No stimulus payload content.'}
                </pre>

                {orchStimulus.safety_constraints?.length > 0 && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block font-mono">
                      Safety & Blast-Radius Constraints:
                    </span>
                    <ul className="text-slate-300 list-disc pl-4 space-y-0.5">
                      {orchStimulus.safety_constraints.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Click "Generate Adversarial Stimulus" to preview bounded payload generation.
              </div>
            )}
          </div>
        </div>

        {/* Advisory Execution Plan */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-teal-400" />
              Execution Plan <span className="text-[10px] font-normal text-slate-500">(advisory)</span>
            </h3>
            {orchPlan ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-bold">
                    {orchPlan.status}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    Source: {orchPlan.source}
                  </span>
                </div>

                <ol className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                  {(orchPlan.steps || []).map((s: any) => (
                    <li
                      key={s.id}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-slate-500">#{s.id}</span>
                        <span className="font-mono text-teal-300 text-[11px] font-bold bg-teal-950/40 px-1.5 py-0.2 rounded border border-teal-800/40">
                          {s.tool}
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">{s.purpose}</div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Click "Generate Advisory Plan" to view proposed simulation steps.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

