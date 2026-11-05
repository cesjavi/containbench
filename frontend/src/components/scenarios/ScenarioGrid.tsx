import React, { useState, useMemo } from 'react';
import { Search, Filter, Layers, Play } from 'lucide-react';
import { ScenarioDefinition, RunResult } from '../../types';
import { ScenarioCard } from './ScenarioCard';

interface ScenarioGridProps {
  scenarios: ScenarioDefinition[];
  runs: RunResult[];
  onOpenTestModal: (scenario: ScenarioDefinition) => void;
  onRunQuickAB: (scenarioId: string) => void;
  onRunAll: () => void;
  running: boolean;
}

export function ScenarioGrid({
  scenarios,
  runs,
  onOpenTestModal,
  onRunQuickAB,
  onRunAll,
  running,
}: ScenarioGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map latest run by scenario_id
  const latestRunsByScenario = useMemo(() => {
    const map = new Map<string, RunResult>();
    for (const r of runs) {
      if (!map.has(r.scenario_id)) {
        map.set(r.scenario_id, r);
      }
    }
    return map;
  }, [runs]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    scenarios.forEach((s) => set.add(s.category));
    return ['all', ...Array.from(set)];
  }, [scenarios]);

  // Filtered scenarios
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesCategory =
        selectedCategory === 'all' || s.category.toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.id.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [scenarios, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-400" />
            Attack & Containment Scenarios
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Standard crash tests to verify whether your infrastructure halts hostile behaviors before blast radius expands.
          </p>
        </div>

        <button
          onClick={onRunAll}
          disabled={running || scenarios.length === 0}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition disabled:opacity-50"
        >
          <Play className="h-4 w-4 fill-current" />
          Run Complete Suite ({scenarios.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <Filter className="h-4 w-4 text-slate-500 ml-1 mr-1 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenario or ID..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Scenario Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No scenarios match your search or category filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredScenarios.map((sc) => (
            <ScenarioCard
              key={sc.id}
              scenario={sc}
              latestRun={latestRunsByScenario.get(sc.id)}
              onOpenTestModal={onOpenTestModal}
              onRunQuickAB={onRunQuickAB}
              running={running}
            />
          ))}
        </div>
      )}
    </div>
  );
}

