import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Order matters: longer, more-specific tokens first so a prefix doesn't
// shadow a longer one (e.g. `bg-surface-emphasis-foreground` before
// `bg-surface-emphasis` before `bg-surface`).
const rules = [
  // ── surface-emphasis (most specific) ──
  ['bg-surface-emphasis-foreground', 'bg-primary-foreground'],
  ['text-surface-emphasis-foreground', 'text-primary-foreground'],
  ['border-surface-emphasis-foreground', 'border-primary-foreground'],
  ['bg-surface-emphasis', 'bg-primary'],
  ['text-surface-emphasis', 'text-primary'],
  ['border-surface-emphasis', 'border-primary'],

  // ── surfaces ──
  ['bg-surface-muted', 'bg-muted'],
  ['text-surface-muted', 'text-muted'],
  ['border-surface-muted', 'border-muted'],
  ['bg-surface-subtle', 'bg-muted'],
  ['text-surface-subtle', 'text-muted'],
  ['border-surface-subtle', 'border-muted'],
  ['bg-surface-elevated', 'bg-card'],
  ['text-surface-elevated', 'text-card'],
  ['border-surface-elevated', 'border-card'],
  ['bg-surface', 'bg-card'],
  ['text-surface', 'text-card'],
  ['border-surface', 'border-card'],

  // ── border-strong ──
  ['border-border-strong', 'border-border'],
  ['ring-border-strong', 'ring-border'],
  ['text-border-strong', 'text-border'],
  // Fix stray `border-strong` (was intended as border color but was a no-op).
  // Very narrow: only within a className string where it follows `border `.
  // Handled below via regex pass.

  // ── primary-muted ──
  ['bg-primary-muted-foreground', 'bg-secondary-foreground'],
  ['text-primary-muted-foreground', 'text-secondary-foreground'],
  ['border-primary-muted-foreground', 'border-secondary-foreground'],
  ['bg-primary-muted', 'bg-secondary'],
  ['text-primary-muted', 'text-secondary'],
  ['border-primary-muted', 'border-secondary'],

  // ── status: -text used as bg/border (for dots & error frames) ──
  ['bg-status-confirmed-text', 'bg-green-800'],
  ['bg-status-warning-text', 'bg-amber-900'],
  ['bg-status-cancelled-text', 'bg-zinc-700'],
  ['bg-status-error-text', 'bg-red-700'],
  ['bg-status-info-text', 'bg-blue-900'],
  ['border-status-error-text', 'border-red-700'],
  ['border-status-warning-text', 'border-amber-900'],
  ['border-status-confirmed-text', 'border-green-800'],
  ['border-status-info-text', 'border-blue-900'],
  ['border-status-cancelled-text', 'border-zinc-700'],

  // ── status: confirmed ──
  ['bg-status-confirmed-bg', 'bg-green-100'],
  ['border-status-confirmed-border', 'border-green-300'],
  ['text-status-confirmed-text', 'text-green-800'],
  ['ring-status-confirmed-border', 'ring-green-300'],

  // ── status: warning ──
  ['bg-status-warning-bg', 'bg-amber-100'],
  ['border-status-warning-border', 'border-amber-300'],
  ['text-status-warning-text', 'text-amber-900'],
  ['ring-status-warning-border', 'ring-amber-300'],

  // ── status: cancelled ──
  ['bg-status-cancelled-bg', 'bg-zinc-100'],
  ['border-status-cancelled-border', 'border-zinc-300'],
  ['text-status-cancelled-text', 'text-zinc-700'],
  ['ring-status-cancelled-border', 'ring-zinc-300'],

  // ── status: error ──
  ['bg-status-error-bg', 'bg-red-100'],
  ['border-status-error-border', 'border-red-300'],
  ['text-status-error-text', 'text-red-700'],
  ['ring-status-error-border', 'ring-red-300'],

  // ── status: info ──
  ['bg-status-info-bg', 'bg-blue-100'],
  ['border-status-info-border', 'border-blue-300'],
  ['text-status-info-text', 'text-blue-900'],
  ['ring-status-info-border', 'ring-blue-300'],

  // ── course-series ──
  ['bg-course-series-ring', 'bg-teal-200'],
  ['ring-course-series-ring', 'ring-teal-200'],
  ['text-course-series-ring', 'text-teal-200'],
  ['border-course-series-ring', 'border-teal-200'],
  ['bg-course-series', 'bg-teal-400'],
  ['text-course-series', 'text-teal-400'],
  ['border-course-series', 'border-teal-400'],
  ['ring-course-series', 'ring-teal-400'],

  // ── growth ──
  ['bg-growth-bg', 'bg-green-50'],
  ['text-growth-text', 'text-green-700'],

  // ── success / warning / info (solid fills) ──
  ['bg-success-foreground', 'bg-white'],
  ['text-success-foreground', 'text-white'],
  ['bg-warning-foreground', 'bg-white'],
  ['text-warning-foreground', 'text-white'],
  ['bg-info-foreground', 'bg-foreground'],
  ['text-info-foreground', 'text-foreground'],
  ['bg-success', 'bg-green-500'],
  ['text-success', 'text-green-500'],
  ['border-success', 'border-green-500'],
  ['bg-warning', 'bg-amber-500'],
  ['text-warning', 'text-amber-500'],
  ['border-warning', 'border-amber-500'],
  ['bg-info', 'bg-neutral-100'],
  ['text-info', 'text-neutral-900'],
  ['border-info', 'border-neutral-200'],

  // ── third-party brands (kept as hardcoded hex) ──
  ['hover:bg-vipps-hover', 'hover:bg-[#E84E1B]'],
  ['bg-vipps-hover', 'bg-[#E84E1B]'],
  ['text-vipps-hover', 'text-[#E84E1B]'],
  ['bg-vipps', 'bg-[#FF5B24]'],
  ['text-vipps', 'text-[#FF5B24]'],
  ['border-vipps', 'border-[#FF5B24]'],
  ['bg-partner-fiken', 'bg-[#5239ba]'],
  ['text-partner-fiken', 'text-[#5239ba]'],

  // ── var() references inline ──
  ['var(--color-primary-muted-foreground)', 'var(--secondary-foreground)'],
  ['var(--color-primary-muted)', 'var(--secondary)'],
  ['var(--color-surface-muted)', 'var(--muted)'],
  ['var(--color-surface-subtle)', 'var(--muted)'],
  ['var(--color-surface-elevated)', 'var(--card)'],
  ['var(--color-surface-emphasis-foreground)', 'var(--primary-foreground)'],
  ['var(--color-surface-emphasis)', 'var(--primary)'],
  ['var(--color-surface)', 'var(--card)'],
  ['var(--color-border-strong)', 'var(--border)'],
  ['var(--color-overlay)', 'rgba(0, 0, 0, 0.3)'],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(p);
  }
  return out;
}

const files = walk('src').filter((f) => !f.endsWith('index.css.backup'));
let totalReplacements = 0;
let filesTouched = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;
  let fileCount = 0;
  for (const [oldTok, newTok] of rules) {
    // word boundary escape for tokens that contain special chars ((, ), --)
    const needsRegex = !/[a-zA-Z0-9-]$/.test(oldTok[oldTok.length - 1]);
    if (needsRegex) {
      const parts = content.split(oldTok);
      fileCount += parts.length - 1;
      content = parts.join(newTok);
    } else {
      // Exact-word boundary to avoid matching inside longer tokens.
      const re = new RegExp(
        `(?<![a-zA-Z0-9_-])${oldTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9_-])`,
        'g'
      );
      content = content.replace(re, () => {
        fileCount += 1;
        return newTok;
      });
    }
  }
  if (content !== original) {
    writeFileSync(file, content);
    totalReplacements += fileCount;
    filesTouched += 1;
  }
}

console.log(`Replaced ${totalReplacements} occurrences across ${filesTouched} files.`);
