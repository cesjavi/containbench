import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Event } from '../../types';

interface EventItemProps {
  event: Event;
}

export function EventItem({ event }: EventItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  const copyMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'deny':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3" />
            deny
          </span>
        );
      case 'allow':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-3 w-3" />
            allow
          </span>
        );
      case 'intercept':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            intercept
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
            <Eye className="h-3 w-3" />
            {decision}
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`rounded-xl border transition-all cursor-pointer select-none ${
        expanded
          ? 'bg-slate-900/90 border-slate-700 shadow-lg'
          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      <div className="flex items-center gap-3 p-3 text-xs">
        {/* Sequence & Chevron */}
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] w-12 shrink-0">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span>#{event.sequence.toString().padStart(2, '0')}</span>
        </div>

        {/* Decision Badge */}
        <div className="shrink-0">{getDecisionBadge(event.decision)}</div>

        {/* Source & Action */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          <span className="text-teal-300 font-bold font-mono text-[11px] bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-800/40">
            {event.source}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">({event.action})</span>
          <span className="text-white font-mono text-xs truncate max-w-sm" title={event.target}>
            {event.target}
          </span>
        </div>

        {/* Timestamp */}
        <div className="hidden sm:block text-[10px] font-mono text-slate-500 shrink-0">
          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
        </div>
      </div>

      {/* Expanded Metadata Drawer */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t border-slate-800/80 p-3.5 bg-slate-950/90 rounded-b-xl space-y-2 cursor-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-400 flex items-center gap-1">
              <Terminal className="h-3 w-3 text-teal-400" /> Event Details & Forensics
            </span>
            <button
              onClick={copyMetadata}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Copy event JSON"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy Event JSON'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-500">Event ID:</span>{' '}
              <span className="text-slate-300">{event.event_id}</span>
            </div>
            <div>
              <span className="text-slate-500">Type:</span>{' '}
              <span className="text-slate-300">{event.type}</span>
            </div>
            <div>
              <span className="text-slate-500">Scenario:</span>{' '}
              <span className="text-slate-300">{event.scenario_id}</span>
            </div>
            <div>
              <span className="text-slate-500">Decision:</span>{' '}
              <span className="text-slate-300 uppercase font-bold">{event.decision}</span>
            </div>
          </div>

          {hasMetadata ? (
            <div>
              <span className="text-[10px] text-slate-500 block mb-1 font-mono uppercase">Metadata:</span>
              <pre className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No additional payload metadata recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

