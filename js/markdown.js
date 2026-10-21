// 마크다운 → HTML 변환기 (외부 의존성 없음, DOM 미사용이라 Node에서도 import 가능)
// 원칙: 원문을 먼저 이스케이프한 뒤 변환하므로, 글 안의 HTML 태그는 문자 그대로 표시된다.

const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const FENCE_RE = /^```\s*([\w-]*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- frontmatter ----------

export function parseFrontmatter(text) {
  const source = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: source };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    meta[kv[1]] = parseValue(kv[2].trim());
  }
  return { meta, body: source.slice(match[0].length) };
}

function parseValue(raw) {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }
  return unquote(raw);
}

function unquote(value) {
  return value.replace(/^(["'])(.*)\1$/, '$2');
}

// ---------- 인라인 ----------

// 허용 스킴: http, https, mailto, 상대 경로, 앵커. javascript:, data: 등은 차단한다.
function safeUrl(url) {
  const compact = url.replace(/[\u0000- \u007F-\u009F]/g, '');
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !['http', 'https', 'mailto'].includes(scheme[1].toLowerCase())) return null;
  return url;
}

function renderInline(text) {
  const stash = [];
  const hold = (html) => `\u0000${stash.push(html) - 1}\u0000`;

  let s = escapeHtml(text.replace(/\u0000/g, ''));

  s = s.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${code}</code>`));

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, alt, url) => {
    const safe = safeUrl(url);
    return safe ? hold(`<img src="${safe}" alt="${alt}">`) : whole;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) => {
    const safe = safeUrl(url);
    if (!safe) return whole;
    const external = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return hold(`<a href="${safe}"${external}>${emphasis(label)}</a>`);
  });

  s = emphasis(s);

  let previous;
  do {
    previous = s;
    s = s.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[index]);
  } while (s !== previous);
  return s;
}

function emphasis(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}

// ---------- 블록 ----------

export function renderMarkdown(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  return renderBlocks(lines);
}

function isBlockStart(line) {
  return FENCE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line) ||
    /^\s*>/.test(line) || LIST_RE.test(line);
}

function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const fence = line.match(FENCE_RE);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++; // 닫는 펜스
      const lang = fence[1] ? ` class="language-${fence[1]}"` : '';
      out.push(`<pre tabindex="0"><code${lang}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderBlocks(quote)}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const result = renderTable(lines, i);
      out.push(result.html);
      i = result.next;
      continue;
    }

    if (LIST_RE.test(line)) {
      const result = renderList(lines, i);
      out.push(result.html);
      i = result.next;
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() !== '' && (paragraph.length === 0 || !isBlockStart(lines[i]))) {
      paragraph.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${renderInline(paragraph.join('\n'))}</p>`);
  }

  return out.join('\n');
}

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

function renderList(lines, start) {
  const first = lines[start].match(LIST_RE);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const item = line.match(LIST_RE);

    if (line.trim() === '') {
      // 빈 줄 뒤에 같은 목록이 이어지면 계속, 아니면 종료
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const next = j < lines.length ? lines[j].match(LIST_RE) : null;
      if (next && next[1].length >= baseIndent) {
        i = j;
        continue;
      }
      break;
    }

    if (item && item[1].length === baseIndent) {
      if (/\d/.test(item[2]) !== ordered) break;
      items.push({ text: item[3], rest: [] });
      i++;
    } else if (items.length && indentOf(line) > baseIndent) {
      items[items.length - 1].rest.push(line.slice(Math.min(indentOf(line), baseIndent + 2)));
      i++;
    } else {
      break;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const body = items
    .map((item) => `<li>${renderInline(item.text)}${item.rest.length ? renderBlocks(item.rest) : ''}</li>`)
    .join('\n');
  return { html: `<${tag}>\n${body}\n</${tag}>`, next: i };
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function renderTable(lines, start) {
  const header = splitRow(lines[start]);
  const align = splitRow(lines[start + 1]).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    return '';
  });
  const cell = (tag, text, index) => {
    const style = align[index] ? ` style="text-align:${align[index]}"` : '';
    return `<${tag}${style}>${renderInline(text)}</${tag}>`;
  };

  let i = start + 2;
  const rows = [];
  while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const head = `<tr>${header.map((text, index) => cell('th', text, index)).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((text, index) => cell('td', text, index)).join('')}</tr>`)
    .join('\n');
  return {
    html: `<div class="table-wrap"><table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`,
    next: i,
  };
}
