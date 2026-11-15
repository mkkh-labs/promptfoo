import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const suite = resolve(root, 'examples/mkkh-labs-quality-gate');
const configuredEvidenceDir = process.env.MKKH_EVIDENCE_DIR;
const evidenceDir = configuredEvidenceDir
  ? resolve(configuredEvidenceDir)
  : mkdtempSync(join(tmpdir(), 'mkkh-labs-quality-gate-'));
mkdirSync(evidenceDir, { recursive: true });

const baseEnvironment = {
  ...process.env,
  PROMPTFOO_DISABLE_REMOTE_GENERATION: 'true',
  PROMPTFOO_DISABLE_TELEMETRY: '1',
  PROMPTFOO_DISABLE_UPDATE: '1',
};

function runEval(configName, outputName) {
  const outputPath = join(evidenceDir, outputName);
  return {
    outputPath,
    result: spawnSync(
      'npm',
      [
        'run',
        'local',
        '--',
        'eval',
        '-c',
        join(suite, configName),
        '-o',
        outputPath,
        '--safe-mode',
        '--no-cache',
        '--no-share',
        '--no-write',
        '--no-progress-bar',
      ],
      { cwd: root, encoding: 'utf8', env: baseEnvironment },
    ),
  };
}

execFileSync(
  'npm',
  ['run', 'local', '--', 'validate', 'config', '-c', join(suite, 'promptfooconfig.yaml')],
  { cwd: root, encoding: 'utf8', env: baseEnvironment, stdio: 'inherit' },
);

execFileSync(
  'npm',
  [
    'run',
    'local',
    '--',
    'validate',
    'config',
    '-c',
    join(suite, 'promptfooconfig.regression.yaml'),
  ],
  { cwd: root, encoding: 'utf8', env: baseEnvironment, stdio: 'inherit' },
);

const passing = runEval('promptfooconfig.yaml', 'passing.json');
assert.equal(
  passing.result.status,
  0,
  [passing.result.stdout, passing.result.stderr].filter(Boolean).join('\n'),
);

const passingEvidence = JSON.parse(readFileSync(passing.outputPath, 'utf8'));
assert.equal(passingEvidence.results.results.length, 3, 'Passing fixture must execute three tests');
assert.ok(
  passingEvidence.results.results.every((result) => result.success === true),
  'Every passing fixture result must succeed',
);
assert.equal(passingEvidence.results.stats.errors, 0, 'Passing fixture must have no errors');
assert.equal(
  passingEvidence.results.stats.tokenUsage.total,
  0,
  'Deterministic baseline must consume zero model tokens',
);

const regression = runEval('promptfooconfig.regression.yaml', 'seeded-regression.json');
assert.notEqual(regression.result.status, 0, 'Seeded regression must return a nonzero exit code');

const regressionEvidence = JSON.parse(readFileSync(regression.outputPath, 'utf8'));
assert.equal(
  regressionEvidence.results.results.length,
  1,
  'Regression fixture must execute one test',
);
assert.equal(
  regressionEvidence.results.results[0].success,
  false,
  'The unsupported certainty fixture must fail',
);
assert.equal(
  regressionEvidence.results.stats.errors,
  0,
  'Regression must fail assertions, not error',
);
assert.equal(
  regressionEvidence.results.results[0].namedScores.contract_valid,
  0,
  'Regression must fail the output contract',
);
assert.equal(
  regressionEvidence.results.results[0].namedScores.no_fabricated_certainty,
  0,
  'Regression must fail the certainty guard',
);

console.log(`MKKH quality gate verified: 3 passing fixtures and 1 rejected regression.`);
console.log(`Evidence directory: ${evidenceDir}`);
