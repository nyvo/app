import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const mapping = [
  ['type-display-1',  'text-6xl font-semibold tracking-tight'],
  ['type-display-2',  'text-4xl font-semibold tracking-tight'],
  ['type-heading-1',  'text-3xl font-semibold tracking-tight'],
  ['type-heading-2',  'text-xl font-semibold tracking-tight'],
  ['type-heading-3',  'text-lg font-semibold'],
  ['type-label-sm',   'text-xs font-medium'],
  ['type-body-lg',    'text-base'],
  ['type-body-sm',    'text-sm'],
  ['type-title',      'text-base font-medium'],
  ['type-label',      'text-sm font-medium'],
  ['type-eyebrow',    'text-xs font-semibold tracking-widest uppercase'],
  ['type-meta',       'text-xs font-medium tracking-wide'],
  ['type-body',       'text-sm'],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const files = walk('src');
let totalReplacements = 0;
let filesTouched = 0;
const typeRegex = /\btype-(display-[12]|heading-[123]|title|body(?:-lg|-sm)?|label(?:-sm)?|meta|eyebrow)\b/g;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;
  const count = (original.match(typeRegex) || []).length;
  if (count === 0) continue;
  for (const [oldClass, newClass] of mapping) {
    const re = new RegExp(`\\b${oldClass}\\b`, 'g');
    content = content.replace(re, newClass);
  }
  if (content !== original) {
    writeFileSync(file, content);
    totalReplacements += count;
    filesTouched += 1;
  }
}

console.log(`Replaced ${totalReplacements} occurrences across ${filesTouched} files.`);
