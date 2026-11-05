import React from 'react';
import { Play, RotateCw, Shield, Bot, Target, X } from 'lucide-react';
import { ScenarioDefinition, PolicyConfig } from '../../types';
import type { AgentModel } from '../../api';

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

const LLM_AGENT = 'llm';
const LLM_MODEL_PREFIX = 'llm://';

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

  const models = llmAgentModels ?? [];
  const chineseModels = models.filter((m) => m.chinese);
  const otherModels = models.filter((m) => !m.chinese);
  const isLlm = agentEndpoint === LLM_AGENT || agentEndpoint.startsWith(LLM_MODEL_PREFIX);
  const selectedModel = agentEndpoint.startsWith(LLM_MODEL_PREFIX)
    ? agentEndpoint.slice(LLM_MODEL_PREFIX.length)
    : LLM_AGENT;

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

          {/* Agent Endpoint */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Agent Under Test
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAgentEndpoint(LLM_AGENT)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition flex items-center gap-1 ${
                    isLlm
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-teal-400 hover:bg-slate-700'
                  }`}
                >
                  <Bot className="h-3 w-3" />
                  {llmAgentLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setAgentEndpoint('')}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition flex items-center gap-1 ${
                    !agentEndpoint
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Target className="h-3 w-3" />
                  Scripted Reference
                </button>
              </div>
            </div>

            <input
              value={agentEndpoint}
              onChange={(e) => setAgentEndpoint(e.target.value)}
              placeholder="llm, llm://<model> or http://localhost:9000/act"
              className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2.5 text-xs text-white font-mono outline-none"
            />
            {isLlm && models.length > 0 && (
              <div className="mt-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Model driving the agent
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) =>
                    setAgentEndpoint(e.target.value === LLM_AGENT ? LLM_AGENT : LLM_MODEL_PREFIX + e.target.value)
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-white font-mono outline-none"
                >
                  <option value={LLM_AGENT}>Default{llmAgentModel ? ` (${llmAgentModel})` : ''}</option>
                  {chineseModels.length > 0 && (
                    <optgroup label="Chinese LLMs on Vultr">
                      {chineseModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {m.lab}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherModels.length > 0 && (
                    <optgroup label="Other models on Vultr">
                      {otherModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              <strong className="text-teal-400">🤖 {llmAgentLabel}</strong>: an LLM decides actions
              {isLlm && selectedModel !== LLM_AGENT ? ` (${selectedModel})` : llmAgentModel ? ` (${llmAgentModel})` : ''}. Empty = reference agent (scripted worst case).
            </p>
          </div>
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

