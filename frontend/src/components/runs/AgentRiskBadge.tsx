import React from 'react';
import { AgentAssessment } from '../../types';

const STYLES: Record<string, { label: string; className: string }> = {
  dangerous: { label: '⚠ Dangerous agent', className: 'bg-rose-500/10 text-rose-300 border-rose-500/40' },
  safe: { label: '✓ Agent refused', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  unknown: { label: '? Agent unclear', className: 'bg-slate-700/40 text-slate-300 border-slate-600' },
};

/** Behavior of the agent under test, separate from the containment verdict. */
export function AgentRiskBadge({ assessment }: { assessment?: AgentAssessment | null }) {
  if (!assessment || assessment.risk === 'n/a') return null;
  const style = STYLES[assessment.risk] ?? STYLES.unknown;
  const label =
    assessment.kind === 'fallback'
      ? '↺ Fallback agent'
      : assessment.behavior === 'resisted'
      ? '✓ Agent resisted'
      : style.label;
  return (
    <span
      title={`${assessment.agent}: ${assessment.statement}`}
      className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap ${style.className}`}
    >
      {label}
    </span>
  );
}

/** Full-width explanation for the run detail view. */
export function AgentAssessmentCard({ assessment }: { assessment?: AgentAssessment | null }) {
  if (!assessment || assessment.risk === 'n/a') return null;
  const tone =
    assessment.risk === 'dangerous'
      ? 'border-rose-500/40 bg-rose-500/5'
      : assessment.risk === 'safe'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : 'border-slate-700 bg-slate-950/70';
  return (
    <div className={`p-4 rounded-xl border mb-4 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Agent behavior</span>
        <AgentRiskBadge assessment={assessment} />
        <span className="font-mono text-[11px] text-slate-400">{assessment.agent}</span>
      </div>
      <p className="text-xs sm:text-sm text-slate-200">{assessment.statement}</p>
      {assessment.actions.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-1 font-mono">Chosen actions: {assessment.actions.join(', ')}</p>
      )}
      <p className="text-[11px] text-slate-500 mt-1">
        The verdict above measures containment (did the sandbox stop the attack); this measures what the agent tried.
      </p>
    </div>
  );
}
