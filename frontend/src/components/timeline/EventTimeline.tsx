import React, { useState, useMemo } from 'react';
import { Terminal, Search, ShieldAlert, ShieldCheck, AlertTriangle, Filter } from 'lucide-react';
import { Event } from '../../types';
import { EventItem } from './EventItem';

interface EventTimelineProps {
  events: Event[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'deny' | 'allow' | 'intercept'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Counts
  const counts = useMemo(() => {
    let deny = 0;
    let allow = 0;
    let intercept = 0;
    events.forEach((e) => {
      if (e.decision === 'deny') deny++;
      else if (e.decision === 'allow') allow++;
      else if (e.decision === 'intercept') intercept++;
    });
    return { all: events.length, deny, allow, intercept };
  }, [events]);

  // Filtered
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchDecision = decisionFilter === 'all' || e.decision === decisionFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        e.target.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        JSON.stringify(e.metadata || {}).toLowerCase().includes(q);
      return matchDecision && matchSearch;
    });
  }, [events, decisionFilter, searchQuery]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Terminal className="h-4 w-4 text-teal-400" />
          Normalized Event Timeline
          <span className="text-xs font-mono font-normal text-slate-400">({events.length} total)</span>
        </h3>

        {/* Quick Decision Counts */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> {counts.deny} Denied
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> {counts.allow} Allowed
          </span>
          {counts.intercept > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {counts.intercept} Intercepted
            </span>
          )}
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Filter className="h-3.5 w-3.5 text-slate-500 ml-1 mr-1 shrink-0" />
          {(['all', 'deny', 'allow', 'intercept'] as const).map((dec) => (
            <button
              key={dec}
              onClick={() => setDecisionFilter(dec)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition ${
                decisionFilter === dec
                  ? dec === 'deny'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : dec === 'allow'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : dec === 'intercept'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dec}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter target, action, tool..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Event Items List */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs font-mono">
            No events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((evt) => <EventItem key={evt.event_id} event={evt} />)
        )}
      </div>
    </div>
  );
}

