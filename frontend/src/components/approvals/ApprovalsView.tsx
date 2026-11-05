import React, { useState, useMemo, useEffect } from 'react';
import { UserCheck, RotateCw, Filter, ShieldAlert } from 'lucide-react';
import { ApprovalRequest } from '../../types';
import { ApprovalCard } from './ApprovalCard';

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  operatorName: string;
  setOperatorName: (name: string) => void;
  decidingId: string | null;
  onDecision: (approval: ApprovalRequest, approve: boolean) => void;
  onRefresh: () => void;
}

export function ApprovalsView({
  approvals,
  operatorName,
  setOperatorName,
  decidingId,
  onDecision,
  onRefresh,
}: ApprovalsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');

  // Load operator name from localStorage if empty
  useEffect(() => {
    if (!operatorName) {
      const saved = localStorage.getItem('containbench_operator_name');
      if (saved) setOperatorName(saved);
    }
  }, [operatorName, setOperatorName]);

  const handleOperatorChange = (val: string) => {
    setOperatorName(val);
    localStorage.setItem('containbench_operator_name', val);
  };

  const pendingCount = useMemo(() => approvals.filter((a) => a.status === 'PENDING').length, [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      if (statusFilter === 'PENDING') return a.status === 'PENDING';
      if (statusFilter === 'RESOLVED') return a.status !== 'PENDING';
      return true;
    });
  }, [approvals, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header and Operator Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-teal-400" />
            Human Approvals & Governance
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Sensitive tool calls intercepted by the dispatcher (CB-006). Approving authorizes execution inside the container with a signed token; rejecting halts the action immediately.
          </p>
        </div>

        {/* Operator Badge & Input */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1 min-w-[240px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Operator Identity:</span>
            {!operatorName.trim() && (
              <span className="text-rose-400 font-mono text-[10px]">* Required</span>
            )}
          </div>
          <input
            value={operatorName}
            onChange={(e) => handleOperatorChange(e.target.value)}
            placeholder="e.g. security-lead"
            maxLength={80}
            className="bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
          />
        </div>
      </div>

      {/* Filter and Refresh Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500 ml-1 shrink-0" />
          {(['PENDING', 'RESOLVED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition ${
                statusFilter === st
                  ? st === 'PENDING' && pendingCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st} {st === 'PENDING' ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No approval requests recorded yet. Run <strong className="text-teal-400">CB-006</strong> with the hardened policy to trigger an approval request.
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono">
          No requests in this filter view.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((appr) => (
            <ApprovalCard
              key={appr.id}
              approval={appr}
              operatorName={operatorName}
              decidingId={decidingId}
              onDecision={onDecision}
            />
          ))}
        </div>
      )}
    </div>
  );
}

