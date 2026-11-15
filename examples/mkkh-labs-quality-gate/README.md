# mkkh-labs-quality-gate (MKKH LABS Quality Gate)

This example is a zero-credential release gate for decision-grade AI output. It proves that a
suite can require traceable claims, explicit uncertainty, bounded output length, and a declared
next action without using a model grader.

The example has two fixtures:

- `promptfooconfig.yaml` contains three compliant outputs and must pass.
- `promptfooconfig.regression.yaml` contains one unsupported recommendation and must fail.

The paired fixtures verify the gate itself. A green candidate alone does not prove that the
assertions can detect the failure they are meant to block.

## Run from this repository

```bash
npm run local -- validate config -c examples/mkkh-labs-quality-gate/promptfooconfig.yaml
node examples/mkkh-labs-quality-gate/verify-gate.mjs
```

The verifier creates its results in the operating system's temporary directory. To retain
machine-readable evidence in CI, set `MKKH_EVIDENCE_DIR` to an approved artifact directory.

## Initialize from a published Promptfoo release

```bash
npx promptfoo@latest init --example mkkh-labs-quality-gate
```

Then run the generated suite with explicit privacy and cache controls:

```bash
PROMPTFOO_DISABLE_TELEMETRY=1 \
PROMPTFOO_DISABLE_UPDATE=1 \
PROMPTFOO_DISABLE_REMOTE_GENERATION=true \
npx promptfoo@latest eval \
  -c promptfooconfig.yaml \
  --safe-mode \
  --no-cache \
  --no-share \
  --no-write
```

These controls cover their documented Promptfoo paths; they are not a network sandbox. Use an
isolated runner and an outbound allowlist for sensitive workloads.

## Adaptation contract

Replace the `echo` provider with the real application interface, then replace fixture outputs
with representative, approved test data. Keep the deterministic assertions. Add a model grader
only for qualities that cannot be evaluated deterministically, pin that grader explicitly, and
prove a known-good output passes while a deliberately wrong output fails.

The base suite intentionally makes no API calls, consumes no model tokens, and requires no
environment variables.
