// Assembles the current template of every id into the single artifact the platform fetches.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCatalogue } from './validate.mjs';

const [dir = 'templates', out = 'registry.bundle.json'] = process.argv.slice(2);
const problems = validateCatalogue(dir);

if (problems.length) {
  console.error(`Refusing to build a bundle from an invalid catalogue:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const current = new Map();

for (const file of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
  const template = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const held = current.get(template.id);

  if (!held || held.version < template.version) {
    current.set(template.id, template);
  }
}

const bundle = {
  registryVersion: JSON.parse(readFileSync('package.json', 'utf8')).version,
  templates: [...current.values()].sort((a, b) => a.id.localeCompare(b.id)),
};

writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`Wrote ${out} with ${bundle.templates.length} templates.`);
