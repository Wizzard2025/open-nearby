# Release scan: SonarQube + dependency CVE check

Every release (every version bump in `index.html` → `CHANGELOG.md`) must pass this scan before it is merged.

```bash
python3 tools/sonar/sonar.py up         # once per machine/session: SonarQube Community + Postgres in Docker
python3 tools/sonar/sonar.py configure  # once (idempotent): strict profiles + quality gate
python3 tools/sonar/sonar.py scan       # each release; exit code 1 = gate failed
```

Needs Docker with the compose plugin, Python 3.10+ and internet access (Docker Hub, OSV.dev).
SonarQube listens on `127.0.0.1:9000` only. Passwords and the scan token are generated into `.sonar/.env`
(git-ignored, mode 600). The admin password is there if you want to open the web UI.

## What a scan does

1. `deps_check.py` finds third-party code and checks it against [OSV.dev](https://osv.dev) (GitHub, npm and PyPI
   advisories, CVEs):
   * npm packages loaded from a CDN (`<script>`/`<link>` in HTML/JS), vendored files in `vendor/` (identified
     by sha256 in `dependencies.json`), pip installs and GitHub Actions in `.github/workflows`;
   * supply-chain rules: CDN URL without an exact version, external script/stylesheet without
     Subresource Integrity, unpinned `pip install`, action not pinned to a full commit SHA, vendored file
     that matches no recorded release.

   Findings go into SonarQube as external **security** issues, so a known CVE fails the gate like any other
   vulnerability.
2. The SonarQube scanner analyses JS, HTML, CSS, Python, workflows and secrets with the
   **Strict (open-nearby)** profile.
3. Reviewed decisions from `reviews.json` are applied and the gate is re-evaluated.
4. Reports: `.sonar/reports/<version>/` (full: `report.md`, `issues.json`, `hotspots.json`, `deps.md`) and, when the
   gate passes, `docs/security/scan-<version>.md` (short record, committed with the release).

## Quality profile: Strict (open-nearby)

Based on **Sonar way comprehensive**, plus every rule with a security or reliability impact at any severity,
every security-hotspot rule, and every maintainability rule of high or blocker severity.
Switched off, each for a stated reason (see `DEACTIVATE` in `sonar.py`): licence-header rules (no such policy),
`'use strict'`-in-modules (these are classic scripts), server-side i18n bundles (the app localises in JS).

## Quality gate: Strict (open-nearby)

| Scope | Condition |
|---|---|
| Whole code | security, reliability and maintainability ratings **A**; **no blocker**; **100 %** hotspots reviewed; duplication ≤ 3 % |
| New code (since the previous version) | ratings **A**; **zero new issues of any kind**; 100 % hotspots reviewed; duplication ≤ 3 % |

A rating of A means no issue above INFO in that quality, so **any** security or reliability issue, including
a known CVE in a dependency, blocks the release. Older style debt (for example `if` without braces) is reported
and has to be cleaned wherever a release touches it. Coverage is not gated yet: there is no automated test
suite, so a coverage condition could never pass. Add one when tests exist.

## When the gate fails

Fix the cause, not the symptom. Read `.sonar/reports/<version>/report.md` and:

* **CVE in a dependency**: upgrade to a fixed version, recompute the SRI hash for CDN files
  (`curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`), and test the app.
* **Bug, vulnerability, hotspot**: fix the code and add a regression check where practical.
* **False positive or a hotspot that is safe**: add an entry to `reviews.json` with the rule, the file, the exact
  source line and a concrete reason. Entries expire automatically when the line changes. For a dependency
  advisory that does not apply to the pinned version, use `reviewed_advisories` in `dependencies.json` (exact
  version only, with evidence).
* Never lower the gate or deactivate a rule just to pass. A rule that does not fit the project goes into
  `DEACTIVATE` with a reason, in its own commit.

## Constrained hosts

Elasticsearch inside SonarQube wants ≥ 10 % free disk and ≥ 65535 open files. `sonar.py up` switches those
checks off only when the host cannot meet them (for example a cloud sandbox) and says so; on a normal machine they
stay on.
