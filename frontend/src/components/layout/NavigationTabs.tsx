import React from 'react';
import {
  Layers,
  Activity,
  ShieldCheck,
  FileCode,
  UserCheck,
  GitBranch,
} from 'lucide-react';

export type TabKey = 'scenarios' | 'runs' | 'compare' | 'prompts' | 'approvals' | 'orchestration';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  scenariosCount: number;
  runsCount: number;
  pendingApprovalsCount: number;
}

export function NavigationTabs({
  activeTab,
  onTabChange,
  scenariosCount,
  runsCount,
  pendingApprovalsCount,
}: NavigationTabsProps) {
  const tabs = [
    {
      key: 'scenarios' as TabKey,
      label: 'Scenario Suite',
      badge: scenariosCount,
      icon: Layers,
    },
    {
      key: 'runs' as TabKey,
      label: 'Timeline & Findings',
      badge: runsCount,
      icon: Activity,
    },
    {
      key: 'compare' as TabKey,
      label: 'A/B Comparison',
      badge: null,
      icon: ShieldCheck,
    },
    {
      key: 'prompts' as TabKey,
      label: 'Prompt Engineering',
      badge: null,
      icon: FileCode,
    },
    {
      key: 'approvals' as TabKey,
      label: 'Human Approvals',
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: UserCheck,
    },
    {
      key: 'orchestration' as TabKey,
      label: 'Orchestration',
      badge: null,
      icon: GitBranch,
    },
  ];

  return (
    <div className="border-b border-slate-800/80 bg-slate-900/30 px-6">
      <div className="flex gap-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-400 text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    tab.badgeColor
                      ? tab.badgeColor
                      : isActive
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

