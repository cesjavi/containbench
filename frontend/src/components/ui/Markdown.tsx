import React from 'react';

/**
 * Small Markdown renderer for the audit report: headings, paragraphs, lists, tables,
 * block quotes, code blocks, rules and inline code / bold / italic / links.
 * It builds React elements (no innerHTML), so model-written text can never inject markup.
 */

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('`')) {
      out.push(
        <code key={key} className="px-1 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[0.85em] break-all">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      out.push(<strong key={key} className="text-white">{inline(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith('*')) {
      out.push(<em key={key}>{inline(token.slice(1, -1), key)}</em>);
    } else {
      const m = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = m?.[2] ?? '';
      out.push(
        /^https?:\/\//i.test(href) ? (
          <a key={key} href={href} target="_blank" rel="noreferrer" className="text-teal-300 underline">
            {m?.[1]}
          </a>
        ) : (
          m?.[1] ?? token
        )
      );
    }
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const splitRow = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} className="my-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto">
          {body.join('\n')}
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1
          ? 'text-xl font-bold text-white mt-2 mb-3'
          : level === 2
          ? 'text-base font-bold text-teal-300 mt-6 mb-2 pb-1 border-b border-slate-800'
          : 'text-sm font-semibold text-slate-200 mt-4 mb-1.5';
      blocks.push(React.createElement(`h${Math.min(level, 4)}`, { key, className: cls }, inline(heading[2], key)));
      i++;
      continue;
    }

    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      blocks.push(<hr key={key} className="my-4 border-slate-800" />);
      i++;
      continue;
    }

    // Table: a header row followed by a separator row
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/60">
              <tr>
                {header.map((h, c) => (
                  <th key={c} className="text-left px-2.5 py-1.5 font-semibold text-slate-200">
                    {inline(h, `${key}h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-t border-slate-800 align-top">
                  {row.map((cell, c) => (
                    <td key={c} className="px-2.5 py-1.5 text-slate-300">
                      {inline(cell, `${key}r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        body.push(lines[i++].trimStart().replace(/^>\s?/, ''));
      }
      blocks.push(
        <blockquote key={key} className="my-3 pl-3 border-l-2 border-teal-500/60 text-slate-300 italic">
          {inline(body.join(' '), key)}
        </blockquote>
      );
      continue;
    }

    const listItem = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
    if (listItem.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(listItem);
        if (m) {
          items.push(m[2]);
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ' ' + lines[i].trim(); // continuation line
        } else {
          break;
        }
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag
          key={key}
          className={`my-2 pl-5 space-y-1 text-slate-300 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-teal-500`}
        >
          {items.map((it, n) => (
            <li key={n}>{inline(it, `${key}i${n}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraph: consecutive plain lines
    const body: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      body.push(lines[i++].trim());
    }
    if (body.length === 0) {
      body.push(lines[i++].trim()); // never stall on an unmatched line
    }
    blocks.push(
      <p key={key} className="my-2 text-slate-300 leading-relaxed">
        {inline(body.join(' '), key)}
      </p>
    );
  }

  return <div className="text-sm">{blocks}</div>;
}
