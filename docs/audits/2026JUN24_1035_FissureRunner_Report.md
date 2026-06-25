# Fissure Dry-Run Report

- Run: `FRUN-20260624-103534`
- Seed: `20260624`
- Surface scan: `SCAN-20260624-103536`
- Paths selected: 19
- Stop reason: `surface_pool_exhausted`
- Deterministic checks: not executed in dry-run MVP.
- Worker/supervisor models: not invoked in dry-run MVP.

## Selected Path Probes

- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
- `script.npm.test:watch` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
- `script.npm.coverage` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/jinn/package.json`
- `script.npm.start` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.jinn` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.clean` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
- `script.npm.nuke` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.lint` (validation_script) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `cli.argparse.kokoro_sidecar` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/jinn/src/talk/kokoro_sidecar.py`
- `script.npm.test` (validation_script) score=0.0 weight=1.0 diff=unchanged file=`packages/web/package.json`
- `script.npm.status` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.setup` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.postinstall` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.build` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
- `script.npm.test:e2e` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.stop` (cli_command) score=0.1 weight=1.1 diff=unchanged file=`package.json`
- `script.npm.typecheck` (validation_script) score=0.1 weight=1.1 diff=unchanged file=`packages/web/package.json`
