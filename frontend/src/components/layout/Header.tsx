import React from 'react';
import { Shield, Server, RotateCw, Play, UserCheck, Layers } from 'lucide-react';
import { VultrStatus } from '../../api';

interface HeaderProps {
  vultrStatus: VultrStatus | null;
  running: boolean;
  onRunQuickDemo: () => void;
  onRunAllScenarios: () => void;
  pendingApprovalsCount: number;
  onNavigateToApprovals: () => void;
}

export function Header({
  vultrStatus,
  running,
  onRunQuickDemo,
  onRunAllScenarios,
  pendingApprovalsCount,
  onNavigateToApprovals,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Shield className="h-6 w-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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

      {/* Status Badges & Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Vultr Inference Status */}
        <div
          className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60"
          title={vultrStatus?.message || vultrStatus?.status || ''}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              vultrStatus?.connected
                ? 'bg-emerald-400 animate-pulse'
                : vultrStatus?.status === 'auth_error'
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300">Inference:</span>
          <span className="text-slate-400">
            {vultrStatus?.connected
              ? 'Vultr Serverless'
              : vultrStatus?.status === 'auth_error'
              ? 'Vultr key rejected'
              : 'Deterministic Mode'}
          </span>
        </div>

        {/* Pending Approvals Shortcut Badge */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={onNavigateToApprovals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-bold transition animate-pulse"
            title="Pending Human Approvals awaiting decision"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} Pending</span>
          </button>
        )}

        {/* Run All Suite Button */}
        <button
          onClick={onRunAllScenarios}
          disabled={running}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition disabled:opacity-50"
          title="Sequentially execute all 6 scenarios with the hardened policy"
        >
          <Layers className="h-3.5 w-3.5 text-teal-400" />
          <span>Run All Suite</span>
        </button>

        {/* Quick A/B Demo Button */}
        <button
          onClick={onRunQuickDemo}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
        >
          {running ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          A/B Containment Demo
        </button>
      </div>
    </header>
  );
}

