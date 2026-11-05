import React from 'react';
import {
  Play,
  KeyRound,
  Globe,
  Terminal,
  HardDrive,
  Cpu,
  UserCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { ScenarioDefinition, RunResult } from '../../types';

interface ScenarioCardProps {
  scenario: ScenarioDefinition;
  latestRun?: RunResult;
  onOpenTestModal: (scenario: ScenarioDefinition) => void;
  onRunQuickAB: (scenarioId: string) => void;
  running: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  secrets: KeyRound,
  network: Globe,
  injection: Terminal,
  filesystem: HardDrive,
  resources: Cpu,
  governance: UserCheck,
};

export function ScenarioCard({
  scenario,
  latestRun,
  onOpenTestModal,
  onRunQuickAB,
  running,
}: ScenarioCardProps) {
  const CategoryIcon = CATEGORY_ICONS[scenario.category] || HelpCircle;

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 p-5 flex flex-col justify-between group shadow-sm hover:shadow-teal-950/20">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-teal-300 border border-slate-700 flex items-center gap-1.5">
              <CategoryIcon className="h-3.5 w-3.5 text-teal-400" />
              {scenario.id}
            </span>
            <span className="text-[11px] font-mono capitalize px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
              {scenario.category}
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
              scenario.severity === 'critical'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {scenario.severity}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-base text-white mb-2 group-hover:text-teal-300 transition-colors">
          {scenario.title}
        </h3>
        <p className="text-slate-300 text-xs leading-relaxed mb-4">
          {scenario.description}
        </p>

        {/* Pass / Fail Criteria */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs mb-4">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold">PASS:</span>{' '}
              <span className="text-slate-300 text-[11px] leading-snug">{scenario.pass_criteria}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-rose-400 font-semibold">FAIL:</span>{' '}
              <span className="text-slate-300 text-[11px] leading-snug">{scenario.fail_criteria}</span>
            </div>
          </div>
        </div>

        {/* Latest Run Metric Badge if available */}
        {latestRun && (
          <div className="mb-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Último resultado:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400 text-[10px]">{latestRun.policy.name}</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                  latestRun.verdict === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {latestRun.verdict} ({latestRun.score}/100)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-800 flex gap-2">
        <button
          onClick={() => onOpenTestModal(scenario)}
          disabled={running}
          className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-teal-600 hover:text-slate-950 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          Config & Run
        </button>
        <button
          onClick={() => onRunQuickAB(scenario.id)}
          disabled={running}
          title="Run Baseline vs Hardened comparison for this scenario"
          className="py-2 px-3 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold transition border border-teal-500/20 flex items-center gap-1 disabled:opacity-50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          A/B Test
        </button>
      </div>
    </div>
  );
}

