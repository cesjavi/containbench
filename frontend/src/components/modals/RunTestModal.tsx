import React from 'react';
import { Play, RotateCw, X } from 'lucide-react';
import { ScenarioDefinition, PolicyConfig } from '../../types';
import type { AgentModel } from '../../api';
import { AgentPicker } from './AgentPicker';

interface RunTestModalProps {
  scenario: ScenarioDefinition | null;
  policies: PolicyConfig[];
  selectedPolicyId: string;
  setSelectedPolicyId: (id: string) => void;
  agentEndpoint: string;
  setAgentEndpoint: (endpoint: string) => void;
  running: boolean;
  llmAgentLabel: string;
  llmAgentModel?: string;
  llmAgentModels?: AgentModel[];
  onClose: () => void;
  onLaunch: () => void;
}

export function RunTestModal({
  scenario,
  policies,
  selectedPolicyId,
  setSelectedPolicyId,
  agentEndpoint,
  setAgentEndpoint,
  running,
  llmAgentLabel,
  llmAgentModel,
  llmAgentModels,
  onClose,
  onLaunch,
}: RunTestModalProps) {
  if (!scenario) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-cyan-950/20">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                {scenario.id}
              </span>
              <h3 className="text-base font-bold text-white">Configure Crash Test</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">{scenario.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {/* Policy Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Containment Policy (Security Controls)
            </label>
            <div className="space-y-2">
              {policies.map((p) => {
                const isSelected = selectedPolicyId === p.id;
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value={p.id}
                      checked={isSelected}
                      onChange={() => setSelectedPolicyId(p.id)}
                      className="mt-1 accent-teal-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-slate-200">{p.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {p.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <AgentPicker
            agentEndpoint={agentEndpoint}
            setAgentEndpoint={setAgentEndpoint}
            llmAgentLabel={llmAgentLabel}
            llmAgentModel={llmAgentModel}
            llmAgentModels={llmAgentModels}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={onLaunch}
            disabled={running}
            className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {running ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Execute Test
          </button>
        </div>
      </div>
    </div>
  );
}

