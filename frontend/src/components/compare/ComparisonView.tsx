import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  GitCompare,
  ArrowRight,
} from 'lucide-react';
import { RunResult, ComparisonResult } from '../../types';
import { PolicyDiffTable } from './PolicyDiffTable';

interface ComparisonViewProps {
  runs: RunResult[];
  compRunA: string;
  compRunB: string;
  setCompRunA: (id: string) => void;
  setCompRunB: (id: string) => void;
  comparison: ComparisonResult | null;
  comparing: boolean;
  onRunComparison: () => void;
  onQuickDemo: () => void;
  running: boolean;
}

export function ComparisonView({
  runs,
  compRunA,
  compRunB,
  setCompRunA,
  setCompRunB,
  comparison,
  comparing,
  onRunComparison,
  onQuickDemo,
  running,
}: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Comparison Selector Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-teal-400" />
              A/B Comparison: Permissive Baseline vs Hardened Policy
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Demonstrates the value of ContainBench: how strict infrastructure controls stop compromise that succeeds under default or permissive setups.
            </p>
          </div>

          <button
            onClick={onQuickDemo}
            disabled={running}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold border border-teal-500/30 transition disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Launch Default CB-001 A/B Demo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Run A (Permissive Baseline)
            </label>
            <select
              value={compRunA}
              onChange={(e) => setCompRunA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2.5 text-xs text-white outline-none"
            >
              <option value="">Select a run...</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.scenario_id} · {r.policy.name} ({r.verdict} {r.score}/100)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Run B (Hardened Policy)
            </label>
            <select
              value={compRunB}
              onChange={(e) => setCompRunB(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2.5 text-xs text-white outline-none"
            >
              <option value="">Select a run...</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.scenario_id} · {r.policy.name} ({r.verdict} {r.score}/100)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onRunComparison}
          disabled={!compRunA || !compRunB || comparing}
          className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition disabled:opacity-50 flex items-center gap-2"
        >
          {comparing ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
          {comparing ? 'Comparing...' : 'Compare Timelines & Policies'}
        </button>
      </div>

      {/* Comparison Results */}
      {comparison ? (
        <div className="space-y-6">
          {/* Metric Banner: Blast Radius Reduction */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 border border-teal-500/30 flex flex-wrap items-center justify-between gap-6 shadow-xl shadow-teal-950/20">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Blast Radius Reduction
              </span>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {comparison.containment_gain}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {comparison.difference_summary}
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2 min-w-[260px]">
              <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider font-mono">
                Decisive Defensive Controls:
              </div>
              {comparison.effective_controls.length === 0 ? (
                <p className="text-slate-500 italic text-[11px]">No decisive controls identified.</p>
              ) : (
                comparison.effective_controls.map((ctrl, i) => (
                  <div key={i} className="flex items-center gap-2 text-teal-300 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>{ctrl}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Policy Diff Matrix */}
          <PolicyDiffTable policyA={comparison.run_a.policy} policyB={comparison.run_b.policy} />

          {/* Side by Side Timeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Run A (Permissive) */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400">{comparison.run_a.id}</span>
                    <h4 className="font-bold text-white text-sm">{comparison.run_a.policy.name}</h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {comparison.run_a.verdict} ({comparison.run_a.score}/100)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {comparison.run_a.timeline.map((e) => (
                    <div
                      key={e.event_id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 font-mono text-[10px]">#{e.sequence}</span>
                        <span className="truncate font-mono text-slate-200 text-[11px]">{e.target}</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0 ${
                          e.decision === 'allow'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {e.decision}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-rose-400/80 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>Hostile actions succeeded due to unconstrained environment.</span>
              </div>
            </div>

            {/* Run B (Hardened) */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-teal-500/35 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400">{comparison.run_b.id}</span>
                    <h4 className="font-bold text-white text-sm">{comparison.run_b.policy.name}</h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {comparison.run_b.verdict} ({comparison.run_b.score}/100)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {comparison.run_b.timeline.map((e) => (
                    <div
                      key={e.event_id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 font-mono text-[10px]">#{e.sequence}</span>
                        <span className="truncate font-mono text-slate-200 text-[11px]">{e.target}</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0 ${
                          e.decision === 'deny'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {e.decision}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Deterministic containment held: blast radius bounded.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          Select Run A and Run B above, or click "Launch Default CB-001 A/B Demo".
        </div>
      )}
    </div>
  );
}

