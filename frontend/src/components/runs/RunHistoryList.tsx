import React, { useState, useMemo } from 'react';
import { Search, ShieldAlert, ShieldCheck, Filter } from 'lucide-react';
import { RunResult } from '../../types';
import { AgentRiskBadge } from './AgentRiskBadge';

interface RunHistoryListProps {
  runs: RunResult[];
  selectedRunId?: string;
  onSelectRun: (run: RunResult) => void;
}

export function RunHistoryList({
  runs,
  selectedRunId,
  onSelectRun,
}: RunHistoryListProps) {
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'PASS' | 'FAIL'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const matchVerdict = verdictFilter === 'all' || r.verdict === verdictFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.scenario_id.toLowerCase().includes(q) ||
        r.policy.name.toLowerCase().includes(q);
      return matchVerdict && matchSearch;
    });
  }, [runs, verdictFilter, searchQuery]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Run History</h2>
        <span className="text-xs font-mono text-slate-400">
          {filteredRuns.length} of {runs.length}
        </span>
      </div>

      {/* Filter and search */}
      <div className="space-y-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run ID, scenario..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-500 ml-1 shrink-0" />
          {(['all', 'PASS', 'FAIL'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVerdictFilter(v)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition ${
                verdictFilter === v
                  ? v === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : v === 'FAIL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Run items */}
      {runs.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No runs recorded yet. Click "A/B Containment Demo" or test a scenario.
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono">
          No runs matching filters.
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {filteredRuns.map((r) => {
            const isSelected = selectedRunId === r.id;
            return (
              <div
                key={r.id}
                onClick={() => onSelectRun(r)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-800/95 border-teal-500 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-300">{r.id}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                      r.verdict === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : r.verdict === 'FAIL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {r.verdict} ({r.score}/100)
                  </span>
                </div>
                <div className="font-semibold text-xs text-white mb-1 flex items-center gap-2">
                  {r.scenario_id}
                  <AgentRiskBadge assessment={r.agent_assessment} />
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="truncate max-w-[170px]">{r.policy.name}</span>
                  <span className="font-mono text-[10px] uppercase text-slate-500">
                    {r.execution_mode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

