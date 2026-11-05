import React, { useState } from 'react';
import {
  Download,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { RunResult } from '../../types';
import { EventTimeline } from '../timeline/EventTimeline';

interface RunDetailViewProps {
  run: RunResult;
  onDownloadReport: (runId: string) => void;
}

export function RunDetailView({ run, onDownloadReport }: RunDetailViewProps) {
  const [copiedCanary, setCopiedCanary] = useState(false);

  const copyCanary = () => {
    if (run.canary_token) {
      navigator.clipboard.writeText(run.canary_token);
      setCopiedCanary(true);
      setTimeout(() => setCopiedCanary(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{run.scenario_id}</h2>
              <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {run.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Policy:{' '}
              <span className="text-teal-300 font-semibold">{run.policy.name}</span> | Mode:{' '}
              <span className="font-mono uppercase text-slate-300">{run.execution_mode}</span> | Status:{' '}
              <span
                className={`font-mono ${
                  run.status === 'COMPLETED' ? 'text-slate-300' : 'text-amber-300'
                }`}
              >
                {run.status}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onDownloadReport(run.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold transition"
              title="Generate and download the Markdown audit report"
            >
              <Download className="h-3.5 w-3.5" />
              Download MD Report
            </button>

            <div className="text-right">
              <div className="text-xs text-slate-400">Score</div>
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                {run.score}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl flex items-center justify-center ${
                run.verdict === 'PASS'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {run.verdict === 'PASS' ? (
                <ShieldCheck className="h-7 w-7" />
              ) : (
                <ShieldAlert className="h-7 w-7" />
              )}
            </div>
          </div>
        </div>

        {/* Evidence Analysis (LLM Summary) */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-200">
          <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            Evidence Analysis (Vultr Inference)
          </div>
          <p className="whitespace-pre-line text-xs sm:text-sm">{run.summary || 'No summary generated.'}</p>
        </div>

        {/* Canary token indicator if present */}
        {run.canary_token && (
          <div className="mt-4 flex items-center justify-between text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-400">Generated Canary Decoy:</span>
              <span className="text-amber-300 font-bold">{run.canary_token}</span>
            </div>
            <button
              onClick={copyCanary}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {copiedCanary ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedCanary ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Findings & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deterministic Findings */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Deterministic Findings ({run.findings.length})
          </h3>
          {run.findings.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No adverse findings detected.</p>
          ) : (
            <ul className="space-y-2.5 text-xs">
              {run.findings.map((f, i) => (
                <li key={i} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        f.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <span className="text-slate-200 leading-relaxed block">{f.statement}</span>
                  {f.event_ids.length > 0 && (
                    <div className="mt-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <span>Correlated Events:</span>
                      <span className="text-teal-400 font-semibold">{f.event_ids.join(', ')}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Security Recommendations */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
            Security Recommendations ({run.recommendations.length})
          </h3>
          {run.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No recommendations for this run.</p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-300">
              {run.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 leading-relaxed flex items-start gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Normalized Event Timeline */}
      <EventTimeline events={run.timeline} />
    </div>
  );
}

