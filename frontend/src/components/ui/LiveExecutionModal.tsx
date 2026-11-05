import React, { useEffect, useState } from 'react';
import { Shield, RotateCw, CheckCircle2, Terminal, AlertTriangle } from 'lucide-react';

export interface ExecutionStep {
  title: string;
  detail: string;
  delayMs: number;
}

const DEFAULT_STEPS: ExecutionStep[] = [
  { title: 'Provisioning Sandbox', detail: 'Creating ephemeral container with read-only root and cgroup limits...', delayMs: 400 },
  { title: 'Planting Canary Decoy', detail: 'Writing decoy secrets and adversarial stimulus into /workspace...', delayMs: 900 },
  { title: 'Agent Execution (LLM)', detail: 'Awaiting model inference and intercepting tool / syscall dispatches...', delayMs: 1600 },
  { title: 'Deterministic Evaluation', detail: 'Checking objective criteria: exfiltration, file modifications, limits...', delayMs: 2500 },
  { title: 'Evidence Assembly', detail: 'Generating structured timeline, audit verdict and explanation report...', delayMs: 3200 },
];

interface LiveExecutionModalProps {
  isOpen: boolean;
  scenarioId?: string;
  policyName?: string;
  onCancel?: () => void;
  customTitle?: string;
}

export function LiveExecutionModal({
  isOpen,
  scenarioId,
  policyName,
  customTitle
}: LiveExecutionModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setLogs([]);
      return;
    }

    const startTime = Date.now();
    const formatElapsed = () => {
      const ms = Date.now() - startTime;
      const s = Math.floor(ms / 1000);
      const frac = Math.floor((ms % 1000) / 10);
      return `[+${s.toString().padStart(2, '0')}.${frac.toString().padStart(2, '0')}s]`;
    };

    setLogs([`${formatElapsed()} Initializing ContainBench test environment...`]);

    const timeouts = DEFAULT_STEPS.map((step, idx) => {
      return setTimeout(() => {
        setCurrentStepIndex(idx);
        setLogs((prev) => [
          ...prev,
          `${formatElapsed()} Phase ${idx + 1}: ${step.title} — ${step.detail}`
        ]);
      }, step.delayMs);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const progress = Math.min(100, Math.round(((currentStepIndex + 1) / DEFAULT_STEPS.length) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-cyan-950/30 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Shield className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {customTitle || `Crash Testing: ${scenarioId || 'Suite'}`}
                <RotateCw className="h-4 w-4 text-teal-400 animate-spin" />
              </h3>
              <p className="text-xs text-slate-400">
                Policy: <span className="text-teal-300 font-semibold">{policyName || 'Evaluating'}</span> · Ephemeral Container Active
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stepper Steps */}
        <div className="space-y-2.5">
          {DEFAULT_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? 'bg-teal-500/10 border-teal-500/40 text-white'
                    : isDone
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                    : 'bg-slate-950/20 border-transparent text-slate-600'
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <RotateCw className="h-4 w-4 text-teal-400 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] font-mono">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isCurrent ? 'text-teal-300 font-bold' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Mini Log Terminal */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-[11px] text-slate-300 max-h-28 overflow-y-auto space-y-1 select-none">
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-800/80">
            <Terminal className="h-3 w-3 text-teal-400" /> Live Orchestrator Feed
          </div>
          {logs.map((log, i) => (
            <div key={i} className="text-slate-400 leading-tight">
              {log}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400/80" /> Strict isolation guarantees containment.
          </span>
          <span>Awaiting deterministic evaluator...</span>
        </div>
      </div>
    </div>
  );
}

