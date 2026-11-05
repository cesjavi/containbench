import React, { useState } from 'react';
import {
  UserCheck,
  XCircle,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { ApprovalRequest } from '../../types';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  operatorName: string;
  decidingId: string | null;
  onDecision: (approval: ApprovalRequest, approve: boolean) => void;
}

export function ApprovalCard({
  approval,
  operatorName,
  decidingId,
  onDecision,
}: ApprovalCardProps) {
  const [copied, setCopied] = useState(false);
  const isDeciding = decidingId === approval.id;
  const isPending = approval.status === 'PENDING';
  const hasEmergencyOverride = Boolean(approval.arguments?.emergency_override);

  const copyArgs = () => {
    navigator.clipboard.writeText(JSON.stringify(approval.arguments, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 ${
        isPending
          ? 'bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {approval.tool}
            </span>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider ${
                approval.status === 'PENDING'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                  : approval.status === 'APPROVED'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {approval.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Request: <span className="text-slate-300 font-semibold">{approval.id}</span> · Scenario: {approval.scenario_id} · Run: {approval.run_id}
          </div>
        </div>

        {/* Action Buttons or Decision Info */}
        {isPending ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDecision(approval, false)}
              disabled={isDeciding || !operatorName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
              title={!operatorName.trim() ? 'Enter operator name first' : 'Reject tool execution'}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
            <button
              onClick={() => onDecision(approval, true)}
              disabled={isDeciding || !operatorName.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-md shadow-teal-500/20"
              title={!operatorName.trim() ? 'Enter operator name first' : 'Authorize tool execution'}
            >
              {isDeciding ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            {approval.status === 'APPROVED' ? (
              <span className="text-emerald-400 font-semibold">Approved</span>
            ) : (
              <span className="text-rose-400 font-semibold">Rejected</span>
            )}{' '}
            by <span className="text-slate-200 font-bold">{approval.decided_by || 'Unknown'}</span>
            {approval.decided_at && (
              <span className="text-slate-500 text-[10px] ml-1.5">
                ({new Date(approval.decided_at).toLocaleTimeString()})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Emergency Override Flag Alert */}
      {hasEmergencyOverride && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong className="font-semibold">Agent requested emergency_override:</strong> The agent attempted to bypass approval controls. The dispatcher safely intercepted the call and demands human validation.
          </div>
        </div>
      )}

      {/* Arguments Preview */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Terminal className="h-3 w-3 text-teal-400" /> Intercepted Tool Payload:
          </span>
          <button
            onClick={copyArgs}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-auto max-h-40 leading-relaxed">
          {JSON.stringify(approval.arguments, null, 2)}
        </pre>
      </div>
    </div>
  );
}

