# Notes for Claude Code

## Release rule: every version passes the security/quality scan

Any change that bumps the app version (footer link `vX.Y.Z` in `index.html` + an entry in `CHANGELOG.md`) must pass
the local SonarQube scan before it is pushed for merge:

```bash
python3 tools/sonar/sonar.py up && python3 tools/sonar/sonar.py configure   # once per session
python3 tools/sonar/sonar.py scan                                            # must end with "quality gate: OK"
```

If the gate fails, read `.sonar/reports/<version>/report.md` and fix the causes: upgrade vulnerable dependencies
(and their SRI hashes), fix bugs and vulnerabilities in the code, and secure the code beyond what the gate checks.
Do not weaken the gate or the profile to pass; false positives go into `tools/sonar/reviews.json` with a concrete
reason. Commit `docs/security/scan-<version>.md` with the release. Details: `tools/sonar/README.md`.

## Other project rules

* Every user-visible change: bump the version in the footer of `index.html`, add a `CHANGELOG.md` entry, and bump
  the `?v=` cache-busting suffix on the CSS/JS links in `index.html`.
* External scripts and stylesheets are pinned to exact versions with Subresource Integrity (`integrity` +
  `crossorigin`).
* UI strings live in `i18n.js` (ru, he, en); Hebrew is the default and is right-to-left.
