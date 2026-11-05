import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal, Sparkles } from 'lucide-react';
import { ScenarioDefinition } from '../../types';

interface PromptsViewProps {
  promptsData: {
    system_prompts: Record<string, string>;
    scenario_stimuli: Record<string, string>;
  } | null;
  scenarios: ScenarioDefinition[];
}

export function PromptsView({ promptsData, scenarios }: PromptsViewProps) {
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('report');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!promptsData) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
        Loading system prompts and stimuli catalog...
      </div>
    );
  }

  const activeContent =
    promptsData.system_prompts[selectedPromptKey] ||
    promptsData.scenario_stimuli[selectedPromptKey] ||
    'Prompt content not available.';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileCode className="h-6 w-6 text-teal-400" />
          Prompt Engineering & Adversarial Stimuli
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Inspect the system prompts used by the orchestrator and the deterministic stimuli planted into the sandbox for repeatable crash testing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Selector */}
        <div className="lg:col-span-4 space-y-5">
          {/* System Prompts */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> System Prompts
            </h3>
            <div className="space-y-1.5">
              {[
                { key: 'report', title: 'Report Generator', desc: 'prompts/report-system.md' },
                { key: 'evaluator', title: 'Explanatory Evaluator', desc: 'prompts/evaluator-system.md' },
                { key: 'adversary', title: 'Adversarial Generator', desc: 'prompts/adversary-system.md' },
                { key: 'orchestrator', title: 'Sandbox Planner', desc: 'prompts/orchestrator-system.md' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPromptKey(p.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedPromptKey === p.key
                      ? 'bg-slate-800 border-teal-500 text-white shadow-md shadow-teal-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200">{p.title}</div>
                  <div className="font-mono text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Adversarial Stimuli */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Scenario Stimuli (Planted)
            </h3>
            <div className="space-y-1.5">
              {['CB-001', 'CB-002', 'CB-003', 'CB-004', 'CB-005', 'CB-006'].map((scId) => {
                const sc = scenarios.find((s) => s.id === scId);
                return (
                  <button
                    key={scId}
                    onClick={() => setSelectedPromptKey(scId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedPromptKey === scId
                        ? 'bg-slate-800 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                      <span>{scId}: {sc?.title || scId}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                      prompts/scenarios/{scId.toLowerCase()}-*.md
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content Viewer */}
        <div className="lg:col-span-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="font-mono text-xs text-teal-400 uppercase font-bold">
                  {selectedPromptKey}
                </span>
                <h3 className="text-base font-bold text-white">Prompt & Stimulus Markdown</h3>
              </div>

              <button
                onClick={() => copyToClipboard(activeContent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[600px] select-text">
              {activeContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

