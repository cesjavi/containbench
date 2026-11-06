import React from 'react';
import { Bot, Target } from 'lucide-react';
import type { AgentModel } from '../../api';

export const LLM_AGENT = 'llm';
const LLM_MODEL_PREFIX = 'llm://';
const LLM_ALIASES = ['llm', 'ollama', 'local'];

interface AgentPickerProps {
  agentEndpoint: string;
  setAgentEndpoint: (endpoint: string) => void;
  llmAgentLabel: string;
  llmAgentModel?: string;
  llmAgentModels?: AgentModel[];
}

/** "Agent under test" field shared by the single-test and the suite dialogs. */
export function AgentPicker({
  agentEndpoint,
  setAgentEndpoint,
  llmAgentLabel,
  llmAgentModel,
  llmAgentModels,
}: AgentPickerProps) {
  const models = llmAgentModels ?? [];
  const chineseModels = models.filter((m) => m.chinese);
  const otherModels = models.filter((m) => !m.chinese);
  const endpoint = agentEndpoint.trim();
  const isLlm = LLM_ALIASES.includes(endpoint.toLowerCase()) || endpoint.startsWith(LLM_MODEL_PREFIX);
  const selectedModel = endpoint.startsWith(LLM_MODEL_PREFIX) ? endpoint.slice(LLM_MODEL_PREFIX.length) : LLM_AGENT;
  // A model typed by hand that the catalog does not list still has to show as selected.
  const unlisted = selectedModel !== LLM_AGENT && !models.some((m) => m.id === selectedModel);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-300">Agent Under Test</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setAgentEndpoint(LLM_AGENT)}
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition flex items-center gap-1 ${
              isLlm ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-400 hover:bg-slate-700'
            }`}
          >
            <Bot className="h-3 w-3" />
            {llmAgentLabel}
          </button>
          <button
            type="button"
            onClick={() => setAgentEndpoint('')}
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition flex items-center gap-1 ${
              !endpoint ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Model driving the agent</label>
          <select
            value={selectedModel}
            onChange={(e) =>
              setAgentEndpoint(e.target.value === LLM_AGENT ? LLM_AGENT : LLM_MODEL_PREFIX + e.target.value)
            }
            className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-white font-mono outline-none"
          >
            <option value={LLM_AGENT}>Default{llmAgentModel ? ` (${llmAgentModel})` : ''}</option>
            {unlisted && <option value={selectedModel}>{selectedModel}</option>}
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
        {isLlm && selectedModel !== LLM_AGENT ? ` (${selectedModel})` : llmAgentModel ? ` (${llmAgentModel})` : ''}. Empty
        = reference agent (scripted worst case).
      </p>
    </div>
  );
}

/** Short human label for an agent endpoint, e.g. for titles and summaries. */
export function agentLabel(endpoint: string, llmAgentLabel: string, llmAgentModel?: string): string {
  const e = endpoint.trim();
  if (!e) return 'Scripted reference agent';
  if (e.startsWith(LLM_MODEL_PREFIX)) return `${llmAgentLabel}: ${e.slice(LLM_MODEL_PREFIX.length)}`;
  if (LLM_ALIASES.includes(e.toLowerCase())) return llmAgentModel ? `${llmAgentLabel}: ${llmAgentModel}` : llmAgentLabel;
  return e;
}
