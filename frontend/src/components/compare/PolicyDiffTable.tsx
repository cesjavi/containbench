import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X } from 'lucide-react';
import { PolicyConfig } from '../../types';

interface PolicyDiffTableProps {
  policyA: PolicyConfig;
  policyB: PolicyConfig;
}

export function PolicyDiffTable({ policyA, policyB }: PolicyDiffTableProps) {
  const rows = [
    {
      feature: 'Network Access',
      desc: 'Container socket / egress',
      valA: policyA.allow_network ? 'Allowed' : 'Disabled (none)',
      valB: policyB.allow_network ? 'Allowed' : 'Disabled (none)',
      isDifferent: policyA.allow_network !== policyB.allow_network,
      safer: 'B',
    },
    {
      feature: 'Root Filesystem',
      desc: 'OS disk write permission',
      valA: policyA.readonly_root ? 'Read-Only' : 'Writable',
      valB: policyB.readonly_root ? 'Read-Only' : 'Writable',
      isDifferent: policyA.readonly_root !== policyB.readonly_root,
      safer: 'B',
    },
    {
      feature: 'Decoy Secret Protection',
      desc: 'Chmod / DAC permissions on secrets',
      valA: policyA.protect_secrets ? 'Protected (0600)' : 'Permissive (0644)',
      valB: policyB.protect_secrets ? 'Protected (0600)' : 'Permissive (0644)',
      isDifferent: policyA.protect_secrets !== policyB.protect_secrets,
      safer: 'B',
    },
    {
      feature: 'Writable Workspace Paths',
      desc: 'Mounted temporary volume paths',
      valA: policyA.writable_paths?.join(', ') || 'None',
      valB: policyB.writable_paths?.join(', ') || 'None',
      isDifferent: JSON.stringify(policyA.writable_paths) !== JSON.stringify(policyB.writable_paths),
      safer: 'neutral',
    },
    {
      feature: 'Resource Limits (CPU / RAM)',
      desc: 'Cgroup throttling',
      valA: `${policyA.cpu_limit || 2} CPU · ${policyA.memory_limit_mb || 1024} MB`,
      valB: `${policyB.cpu_limit || 1} CPU · ${policyB.memory_limit_mb || 512} MB`,
      isDifferent: policyA.cpu_limit !== policyB.cpu_limit || policyA.memory_limit_mb !== policyB.memory_limit_mb,
      safer: 'B',
    },
    {
      feature: 'Human Approval Gate',
      desc: 'Required tools interception',
      valA: policyA.require_approval_tools?.length ? policyA.require_approval_tools.join(', ') : 'None (Autonomous)',
      valB: policyB.require_approval_tools?.length ? policyB.require_approval_tools.join(', ') : 'None (Autonomous)',
      isDifferent: JSON.stringify(policyA.require_approval_tools) !== JSON.stringify(policyB.require_approval_tools),
      safer: 'B',
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
      <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-teal-400" />
        Infrastructure Policy Control Diff Matrix
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Direct architectural differences between <span className="text-rose-400 font-semibold">{policyA.name}</span> and <span className="text-teal-300 font-semibold">{policyB.name}</span>.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-mono">
              <th className="py-2.5 px-3">Control Dimension</th>
              <th className="py-2.5 px-3 text-rose-300">Run A ({policyA.name})</th>
              <th className="py-2.5 px-3 text-teal-300">Run B ({policyB.name})</th>
              <th className="py-2.5 px-3 text-center">Containment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`transition-colors ${
                  row.isDifferent ? 'bg-slate-950/40 hover:bg-slate-950/70' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <td className="py-2.5 px-3">
                  <span className="font-sans font-semibold text-slate-200 block">{row.feature}</span>
                  <span className="text-[10px] text-slate-500 font-sans">{row.desc}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className={row.isDifferent ? 'text-rose-400 font-semibold' : ''}>{row.valA}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className={row.isDifferent ? 'text-teal-300 font-bold' : ''}>{row.valB}</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {row.isDifferent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold">
                      <Check className="h-3 w-3" /> Hardened
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Identical</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

