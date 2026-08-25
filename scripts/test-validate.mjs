// Asserts CI goes red on a deliberately broken fixture for each check, and green on the real set.
import { validateCatalogue } from './validate.mjs';

const cases = [
  ['templates', 0, 'the published catalogue'],
  ['test/fixtures/carries-issuers', 1, 'a template carrying `issuers`'],
  ['test/fixtures/uppercase-id', 1, 'an uppercase `id`'],
  ['test/fixtures/unsupported-alg', 1, 'a signing algorithm the platform rejects'],
  ['test/fixtures/logo-host', 1, 'a `logo.uri` on an unlisted host'],
  ['test/fixtures/two-current', 1, 'two files claiming the same current version'],
];

let failed = 0;

for (const [dir, expectProblems, description] of cases) {
  const problems = validateCatalogue(dir);
  const ok = expectProblems === 0 ? problems.length === 0 : problems.length > 0;

  if (ok) {
    console.log(`ok   ${description}`);
    continue;
  }

  failed++;
  console.error(`FAIL ${description}: ${JSON.stringify(problems)}`);
}

process.exit(failed ? 1 : 0);
