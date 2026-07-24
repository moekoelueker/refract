#!/usr/bin/env node
/**
 * One-shot: transcribe the research corpus produced by the planning session's
 * agent workflow into docs/research/ so it survives the session.
 *
 * The workflow journal holds, per agent, the full return value: seven research
 * lanes (findings + sources + the claims they flagged as risky), three
 * adversarial verification passes, and one synthesis digest.
 *
 * Usage: node scripts/transcribe-research.mjs <path-to-journal.jsonl>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'research');
mkdirSync(OUT, { recursive: true });

const journal = process.argv[2];
if (!journal) {
  console.error('usage: node scripts/transcribe-research.mjs <journal.jsonl>');
  process.exit(1);
}

const results = [];
for (const line of readFileSync(journal, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try {
    const e = JSON.parse(line);
    if (e.type === 'result' && e.result != null) results.push(e.result);
  } catch {
    /* partial line */
  }
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 58);

const STAMP = '2026-07-24';
const front = (title, kind) =>
  `<!-- transcribed from the planning session's research workflow -->\n` +
  `# ${title}\n\n` +
  `- **kind:** ${kind}\n- **verified:** ${STAMP}\n- **status:** raw research output. ` +
  `Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.\n\n---\n\n`;

const lanes = results.filter((r) => r && typeof r === 'object' && 'lane' in r);
const verdicts = results.filter((r) => r && typeof r === 'object' && 'verdicts' in r);
const digests = results.filter((r) => typeof r === 'string' && r.length > 2000);

let n = 0;
const index = [];

for (const l of lanes) {
  n++;
  const name = `${String(n).padStart(2, '0')}-${slug(l.lane)}.md`;
  const body =
    front(l.lane, 'research lane') +
    l.findings +
    '\n\n---\n\n## Claims this lane flagged as load-bearing\n\n' +
    (l.riskyClaims || [])
      .map(
        (c, i) =>
          `${i + 1}. **${c.claim}**\n   - why it matters: ${c.whyItMatters}\n   - how to verify: ${c.howToVerify}`,
      )
      .join('\n') +
    '\n\n---\n\n## Sources actually fetched\n\n' +
    (l.sources || []).map((s) => `- ${s}`).join('\n') +
    '\n';
  writeFileSync(join(OUT, name), body);
  index.push([name, l.lane, (l.sources || []).length]);
}

// the verification passes become one ledger, because their whole job is to
// override the lanes
let ledger =
  front('Verified claims ledger', 'adversarial verification') +
  'Three independent verifiers re-checked the riskiest claims from every lane ' +
  'against primary sources. **This file overrides the lanes and the plan wherever ' +
  'they conflict.** Refuted claims are kept, not deleted: the point is to stop the ' +
  'same wrong assumption being rediscovered.\n\n';

const ICON = {
  CONFIRMED: 'CONFIRMED',
  PARTLY_TRUE: 'PARTLY TRUE',
  REFUTED: '~~REFUTED~~',
  UNVERIFIABLE: 'UNVERIFIABLE',
};

for (const v of verdicts) {
  ledger += `## Dimension: ${v.dimension}\n\n`;
  for (const d of v.verdicts || []) {
    ledger += `### ${ICON[d.status] || d.status} — ${d.claim}\n\n`;
    ledger += `**Corrected:** ${d.correction}\n\n`;
    ledger += `**Evidence:** ${d.evidence}\n\n`;
  }
  if (v.checklist) ledger += `### Checklist\n\n${v.checklist}\n\n`;
  ledger += `### Sources\n\n${(v.sources || []).map((s) => `- ${s}`).join('\n')}\n\n---\n\n`;
}
writeFileSync(join(OUT, 'verified-claims.md'), ledger);

for (const [i, d] of digests.entries()) {
  const name = digests.length > 1 ? `digest-${i + 1}.md` : 'digest.md';
  writeFileSync(join(OUT, name), front('Synthesis digest', 'synthesis') + d + '\n');
  index.push([name, 'Synthesis digest', 0]);
}

writeFileSync(
  join(OUT, '00-index.md'),
  `# Research corpus\n\nTranscribed ${STAMP} from the planning session's agent workflow. ` +
    `Nothing here should need re-researching; extend it instead.\n\n` +
    `Read [verified-claims.md](./verified-claims.md) first — it corrects the lanes.\n\n` +
    `| File | Lane | Sources |\n|---|---|---|\n` +
    index.map(([f, l, s]) => `| [${f}](./${f}) | ${l} | ${s || '-'} |`).join('\n') +
    `\n| [verified-claims.md](./verified-claims.md) | Adversarial verification (${verdicts.length} passes) | - |\n` +
    `\n## Also here\n\n` +
    `- [technique-lab.md](./technique-lab.md) — reproducible recipes and measured numbers\n` +
    `- [../../LEARNINGS.md](../../LEARNINGS.md) — append-only experiment log, including what failed\n`,
);

console.log(
  `wrote ${lanes.length} lanes, ${verdicts.length} verification passes, ${digests.length} digest(s) to docs/research/`,
);
