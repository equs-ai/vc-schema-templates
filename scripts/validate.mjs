// Validates the template catalogue. Exits non-zero on the first failing check, printing every
// problem it found so a contributor sees them all in one CI run.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

/** The platform's runtime whitelist. `EdDSA` is in the enum but `validateAlgs` rejects it. */
const SUPPORTED_SIGN_ALGS = ['ES256'];

/**
 * Hosts a `logo.uri` may point at. Validate-on-ingest cannot catch a well-formed template with
 * an attacker-controlled logo rendered in the operator portal, so it is gated here.
 */
const LOGO_HOST_ALLOWLIST = ['pub-e63b17b4d990438a83af58c15949f8a2.r2.dev'];

const SCHEMA = JSON.parse(readFileSync('schema/template.schema.json', 'utf8'));

export function validateCatalogue(dir) {
  const ajv = addFormats(new Ajv({ allErrors: true, strict: false }));
  const validate = ajv.compile(SCHEMA);
  const problems = [];
  const files = readdirSync(dir).filter(name => name.endsWith('.json')).sort();
  const byId = new Map();

  for (const file of files) {
    const path = join(dir, file);
    let template;

    try {
      template = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      problems.push(`${file}: not valid JSON — ${error.message}`);
      continue;
    }

    if (!validate(template)) {
      for (const error of validate.errors) {
        problems.push(`${file}: ${error.instancePath || '/'} ${error.message}`);
      }
      continue;
    }

    problems.push(...checkAlgs(file, template));
    problems.push(...checkLogo(file, template));
    problems.push(...checkFilename(file, template));

    const versions = byId.get(template.id) ?? [];
    versions.push({ file, version: template.version });
    byId.set(template.id, versions);
  }

  problems.push(...checkOneCurrentPerId(byId));

  return problems;
}

/** (b) The signing algorithms must stay inside what the platform actually accepts. */
function checkAlgs(file, template) {
  const declared = [...template.credSignAlgs, ...template.proofSignAlgs];
  const unsupported = declared.filter(alg => !SUPPORTED_SIGN_ALGS.includes(alg));

  return unsupported.length
    ? [`${file}: signing algorithm(s) the platform rejects: ${[...new Set(unsupported)].join(', ')}`]
    : [];
}

/** (c) `logo.uri` must sit on an allowlisted host. */
function checkLogo(file, template) {
  if (!template.logo) {
    return [];
  }

  let host;

  try {
    ({ host } = new URL(template.logo.uri));
  } catch {
    return [`${file}: logo.uri is not a URL`];
  }

  return LOGO_HOST_ALLOWLIST.includes(host)
    ? []
    : [`${file}: logo.uri host "${host}" is not on the allowlist`];
}

/** The filename carries the identity, so it has to agree with the body. */
function checkFilename(file, template) {
  const expected = `${template.id}.v${template.version}.json`;

  return basename(file) === expected ? [] : [`${file}: filename should be "${expected}"`];
}

/**
 * (d) Exactly one file per id is current. "Current" is the highest `version` for that id, so a
 * duplicate (id, version) pair would make the current file ambiguous.
 */
function checkOneCurrentPerId(byId) {
  const problems = [];

  for (const [id, versions] of byId) {
    const highest = Math.max(...versions.map(entry => entry.version));
    const current = versions.filter(entry => entry.version === highest);

    if (current.length !== 1) {
      problems.push(
        `${id}: ${current.length} files claim version ${highest}; exactly one must be current ` +
          `(${current.map(entry => entry.file).join(', ')})`,
      );
    }
  }

  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = validateCatalogue(process.argv[2] ?? 'templates');

  if (problems.length) {
    console.error(`Template catalogue is invalid:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Template catalogue is valid.');
}
