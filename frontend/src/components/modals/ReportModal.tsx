import React, { useEffect, useState } from 'react';
import { FileText, Download, Copy, Check, X, RotateCw, AlertTriangle } from 'lucide-react';
import { fetchRunReport } from '../../api';
import { Markdown } from '../ui/Markdown';

interface ReportModalProps {
  runId: string | null;
  onClose: () => void;
}

/** Downloads the Markdown text as containbench-audit-<run>.md. */
export function downloadMarkdown(runId: string, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `containbench-audit-${runId}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Pop-up that generates the audit report of a run and shows it rendered. */
export function ReportModal({ runId, onClose }: ReportModalProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false; // a late answer for a run the user closed must not show up
    setMarkdown(null);
    setError(null);
    fetchRunReport(runId)
      .then((md) => !cancelled && setMarkdown(md))
      .catch((err) => !cancelled && setError(err?.message || String(err)));
    return () => {
      cancelled = true;
    };
  }, [runId, attempt]);

  useEffect(() => {
    if (!runId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runId, onClose]);

  if (!runId) return null;

  const copy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (http without permission): the download still works */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Audit report ${runId}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-teal-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">Audit Report</h3>
            <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded truncate">{runId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              disabled={!markdown}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition disabled:opacity-40"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy MD'}
            </button>
            <button
              onClick={() => markdown && downloadMarkdown(runId, markdown)}
              disabled={!markdown}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {error ? (
            <div className="py-10 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300">{error}</p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Retry
              </button>
            </div>
          ) : markdown === null ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RotateCw className="h-5 w-5 animate-spin mx-auto mb-3 text-teal-400" />
              Writing the report with Vultr Serverless Inference… this can take up to a minute.
            </div>
          ) : (
            <Markdown source={markdown} />
          )}
        </div>
      </div>
    </div>
  );
}
