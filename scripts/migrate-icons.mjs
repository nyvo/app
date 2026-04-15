import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
let changed = 0;

for (const f of files) {
  let c = readFileSync(f, 'utf8');
  const before = c;
  c = c.replace(/from\s*['"]lucide-react['"]/g, `from '@/lib/icons'`);
  if (c !== before) {
    writeFileSync(f, c);
    changed += 1;
  }
}

console.log(`Rewrote import source in ${changed} files.`);
