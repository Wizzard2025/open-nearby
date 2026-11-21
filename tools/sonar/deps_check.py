#!/usr/bin/env python3
"""Find third-party code the site and its tooling depend on, look each one up in OSV.dev
(the open vulnerability database behind GitHub, PyPI and npm advisories), and write the result
as SonarQube "external issues" so known CVEs fail the quality gate like any other vulnerability.

What it finds:
  * npm packages loaded from a CDN by <script>/<link> (jsdelivr, unpkg, cdnjs) in HTML/JS files;
  * vendored libraries in vendor/, identified by the sha256 recorded in dependencies.json;
  * pip installs and GitHub Actions in .github/workflows/*.yml.

Supply-chain findings are reported too: an unpinned pip install, an action not pinned to a full
commit SHA, a vendored file whose hash matches no recorded release, a CDN URL without an exact version.

Usage: deps_check.py <repo root> <output external-issues.json> [<output deps-report.md>]
Exit code 0 always (the gate decides); the script fails only if OSV cannot be reached.
"""
import hashlib
import json
import re
import shlex
import subprocess
import sys
import urllib.request
from pathlib import Path

OSV_BATCH = 'https://api.osv.dev/v1/querybatch'
OSV_VULN = 'https://api.osv.dev/v1/vulns/'
SKIP_DIRS = {'.git', '.sonar', 'node_modules', 'data', '__pycache__', '.claude'}
CDN_RE = re.compile(
    r'https://(?:cdn\.jsdelivr\.net/npm/|unpkg\.com/)(?P<name>@?[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)?)@(?P<ver>[^/"\'\s]+)'
    r'|https://cdnjs\.cloudflare\.com/ajax/libs/(?P<cname>[A-Za-z0-9._-]+)/(?P<cver>[^/"\'\s]+)/')
# A CDN npm URL whose package name is followed by "/" or the end of the URL instead of "@version".
CDN_UNVERSIONED_RE = re.compile(r'https://(?:cdn\.jsdelivr\.net/npm/|unpkg\.com/)((?:@[A-Za-z0-9._-]+/)?[A-Za-z0-9._-]+)(?=[/"\'\s])')
EXACT_VER = re.compile(r'^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$')
# The generic report format needs the legacy severity on each rule too.
LEGACY_SEV = {'BLOCKER': 'BLOCKER', 'HIGH': 'CRITICAL', 'MEDIUM': 'MAJOR', 'LOW': 'MINOR', 'INFO': 'INFO'}
HTML = '.html'
SEV = {'CRITICAL': 'BLOCKER', 'HIGH': 'HIGH', 'MODERATE': 'MEDIUM', 'MEDIUM': 'MEDIUM', 'LOW': 'LOW'}


def post_json(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def get_json(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def files(root, suffixes):
    for p in sorted(root.rglob('*')):
        if p.is_file() and p.suffix in suffixes and not (set(p.relative_to(root).parts[:-1]) & SKIP_DIRS):
            yield p


def line_of(text, idx):
    return text.count('\n', 0, idx) + 1


def resolve_tag(repo, tag):
    """Commit SHA a GitHub tag points to (annotated tags are peeled), or None."""
    try:
        out = subprocess.run(['git', 'ls-remote', f'https://github.com/{repo}', f'refs/tags/{tag}', f'refs/tags/{tag}^{{}}'],
                             capture_output=True, text=True, timeout=60).stdout
    except (OSError, subprocess.TimeoutExpired):
        return None
    refs = {name: sha for sha, name in (line.split('\t', 1) for line in out.splitlines() if '\t' in line)}
    return refs.get(f'refs/tags/{tag}^{{}}') or refs.get(f'refs/tags/{tag}')


def discover(root, manifest):
    """Return (packages, findings). A package: dict(ecosystem, name, version, file, line, via)."""
    pkgs, findings = [], []
    for f in files(root, {HTML, '.js', '.css'}):
        if 'vendor' in f.relative_to(root).parts:
            continue
        text = f.read_text(encoding='utf-8', errors='replace')
        rel = f.relative_to(root).as_posix()
        for m in CDN_RE.finditer(text):
            name = m.group('name') or m.group('cname')
            ver = m.group('ver') or m.group('cver')
            line = line_of(text, m.start())
            if not EXACT_VER.match(ver):
                findings.append(dict(rule='supply-chain-cdn-unpinned', sev='HIGH', file=rel, line=line,
                                     msg=f'{name}@{ver} is loaded from a CDN without an exact version; pin it (e.g. {name}@1.2.3).'))
                continue
            pkgs.append(dict(ecosystem='npm', name=name, version=ver, file=rel, line=line, via='CDN'))
        for m in CDN_UNVERSIONED_RE.finditer(text):
            findings.append(dict(rule='supply-chain-cdn-unpinned', sev='HIGH', file=rel, line=line_of(text, m.start()),
                                 msg=f'{m.group(1)} is loaded from a CDN with no version at all; pin an exact version.'))

    # Subresource Integrity: a script or stylesheet from another origin must carry integrity="sha384-...",
    # so a tampered CDN file is refused by the browser. Google Fonts CSS differs per browser and cannot have one.
    for f in files(root, {HTML}):
        text = f.read_text(encoding='utf-8', errors='replace')
        rel = f.relative_to(root).as_posix()
        for m in re.finditer(r'<(script|link)\b[^>]*>', text, re.I):
            tag = m.group(0)
            url = re.search(r'\b(?:src|href)\s*=\s*["\'](https?:)?//([^/"\']+)', tag)
            if not url or (m.group(1).lower() == 'link' and not re.search(r'rel\s*=\s*["\']?stylesheet', tag, re.I)):
                continue
            if url.group(2) in ('fonts.googleapis.com',):
                continue
            if not re.search(r'\bintegrity\s*=\s*["\']sha(256|384|512)-', tag):
                findings.append(dict(rule='supply-chain-no-sri', sev='MEDIUM', file=rel, line=line_of(text, m.start()),
                                     msg=f'{m.group(1)} from {url.group(2)} has no integrity="sha384-..." (Subresource Integrity); '
                                         'a tampered CDN file would run with full page access.'))

    known = {v['path'] for v in manifest.get('vendored', [])}
    for f in files(root, {HTML}):
        text = f.read_text(encoding='utf-8', errors='replace')
        for m in re.finditer(r'(?:src|href)\s*=\s*["\'](?:\./)?(vendor/[^"\'?#]+)', text):
            if m.group(1) not in known:
                findings.append({'rule': 'supply-chain-vendor-unknown', 'sev': 'HIGH', 'file': f.relative_to(root).as_posix(),
                                 'line': line_of(text, m.start()),
                                 'msg': f'{m.group(1)} is loaded but not recorded in tools/sonar/dependencies.json, so it is not '
                                        'checked for known vulnerabilities. Add its package, version and sha256.'})

    for v in manifest.get('vendored', []):
        p = root / v['path']
        if not p.exists():
            continue
        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        where, wline = v['loaded_from'], 1
        wtext = (root / where).read_text(encoding='utf-8', errors='replace') if (root / where).exists() else ''
        i = wtext.find(v['path'])
        if i >= 0:
            wline = line_of(wtext, i)
        if sha != v['sha256']:
            findings.append(dict(rule='supply-chain-vendor-unknown', sev='HIGH', file=where, line=wline,
                                 msg=f'{v["path"]} does not match the recorded {v["name"]}@{v["version"]} (sha256 differs). '
                                     'Record the new version and hash in tools/sonar/dependencies.json.'))
            continue
        pkgs.append(dict(ecosystem='npm', name=v['name'], version=v['version'], file=where, line=wline, via=f'vendored {v["path"]}'))

    wf_dir = root / '.github' / 'workflows'
    for f in sorted(wf_dir.glob('*.y*ml')) if wf_dir.exists() else []:
        text = f.read_text(encoding='utf-8')
        rel = f.relative_to(root).as_posix()
        for m in re.finditer(r'uses:\s*([\w.-]+/[\w./-]+)@([\w.-]+)', text):
            action, ref, line = m.group(1), m.group(2), line_of(text, m.start())
            repo = '/'.join(action.split('/')[:2])
            tag = re.search(r'#\s*(v?\d+(?:\.\d+)*)', text[m.end():text.find('\n', m.end())])
            if not re.fullmatch(r'[0-9a-f]{40}', ref):
                findings.append(dict(rule='supply-chain-action-unpinned', sev='MEDIUM', file=rel, line=line,
                                     msg=f'{action}@{ref} is pinned to a movable tag; pin it to a full commit SHA (keep the tag in a comment).'))
                ver = ref.lstrip('v')
            elif not tag:
                findings.append({'rule': 'supply-chain-action-unverified', 'sev': 'MEDIUM', 'file': rel, 'line': line,
                                 'msg': f'{action}@{ref[:12]}… has no "# vX.Y.Z" comment, so its release cannot be checked for advisories; add the tag it was pinned from.'})
                continue
            else:
                # The comment is only trusted if the tag really points at the pinned commit.
                tag_sha = resolve_tag(repo, tag.group(1))
                if tag_sha != ref:
                    findings.append({'rule': 'supply-chain-action-unverified', 'sev': 'HIGH', 'file': rel, 'line': line,
                                     'msg': f'{action}: the pinned commit {ref[:12]}… is not what tag {tag.group(1)} points to '
                                            f'({(tag_sha or "tag not found")[:12]}); the version comment cannot be trusted.'})
                    continue
                ver = tag.group(1).lstrip('v')
            if re.fullmatch(r'\d+(\.\d+)*', ver):
                pkgs.append({'ecosystem': 'GitHub Actions', 'name': repo, 'version': ver, 'file': rel, 'line': line, 'via': 'workflow'})
        for m in re.finditer(r'pip install([^\n&|;]*)', text):
            line = line_of(text, m.start())
            try:  # shell-aware: quotes are removed, a trailing "# comment" is ignored
                toks = shlex.split(m.group(1), comments=True)
            except ValueError:
                toks = m.group(1).split()
            for tok in toks:
                if tok.startswith('-'):
                    continue
                pm = re.fullmatch(r'([A-Za-z0-9._-]+)==([\w.]+)', tok)
                if pm:
                    pkgs.append(dict(ecosystem='PyPI', name=pm.group(1), version=pm.group(2), file=rel, line=line, via='workflow'))
                else:
                    findings.append(dict(rule='supply-chain-pip-unpinned', sev='HIGH', file=rel, line=line,
                                         msg=f'pip install {tok} has no exact version, so every build can pull different code; pin it ({tok}==X.Y.Z).'))
    return pkgs, findings


def osv(pkgs, reviewed):
    """Known vulnerabilities per package. An advisory listed in dependencies.json "reviewed_advisories" for this exact
    package version is reported as reviewed instead of as an issue (the review lapses when the version changes)."""
    if not pkgs:
        return [], []
    ok = {(r['id'], r['package'], r['version']): r for r in reviewed}
    accepted = []
    res = post_json(OSV_BATCH, {'queries': [{'package': {'ecosystem': p['ecosystem'], 'name': p['name']}, 'version': p['version']} for p in pkgs]})
    out, cache = [], {}
    for p, r in zip(pkgs, res.get('results', [])):
        for v in r.get('vulns', []) or []:
            vid = v['id']
            if (vid, p['name'], p['version']) in ok:
                accepted.append({**ok[(vid, p['name'], p['version'])], 'pkg': f'{p["name"]}@{p["version"]}', 'where': f'{p["file"]}:{p["line"]}'})
                continue
            if vid not in cache:
                cache[vid] = get_json(OSV_VULN + vid)
            d = cache[vid]
            sev = (d.get('database_specific') or {}).get('severity', 'MODERATE').upper()
            fixed = sorted({e['fixed'] for a in d.get('affected', []) for rg in a.get('ranges', []) for e in rg.get('events', []) if 'fixed' in e})
            ids = ', '.join([vid] + [a for a in d.get('aliases', []) if a.startswith('CVE-')])
            out.append(dict(rule=f'osv-{vid}', sev=SEV.get(sev, 'MEDIUM'), file=p['file'], line=p['line'],
                            msg=f'{p["name"]}@{p["version"]} ({p["via"]}): {ids}: {d.get("summary", "known vulnerability")}.'
                                + (f' Fixed in {", ".join(fixed)}.' if fixed else ' No fixed version listed.'),
                            title=d.get('summary', vid), url=f'https://osv.dev/vulnerability/{vid}'))
    return out, accepted


def main():
    root, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    md = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    manifest = json.loads((Path(__file__).parent / 'dependencies.json').read_text())
    pkgs, findings = discover(root, manifest)
    vulns, accepted = osv(pkgs, manifest.get('reviewed_advisories', []))
    findings += vulns

    rules, issues = {}, []
    for f in findings:
        rules.setdefault(f['rule'], dict(
            id=f['rule'], name=f.get('title', f['rule'].replace('-', ' ')), engineId='deps-check',
            description=f.get('url', 'Dependency and supply-chain check (tools/sonar/deps_check.py).'),
            cleanCodeAttribute='TRUSTWORTHY', type='VULNERABILITY', severity=LEGACY_SEV[f['sev']],
            impacts=[dict(softwareQuality='SECURITY', severity=f['sev'])]))
        issues.append(dict(ruleId=f['rule'], primaryLocation=dict(message=f['msg'][:1000], filePath=f['file'], textRange=dict(startLine=f['line']))))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(dict(rules=list(rules.values()), issues=issues), indent=1))

    lines = ['# Dependency check', '', '| Package | Version | Ecosystem | Where |', '|---|---|---|---|']
    lines += [f'| {p["name"]} | {p["version"]} | {p["ecosystem"]} | {p["file"]}:{p["line"]} ({p["via"]}) |' for p in pkgs]
    lines += ['', f'Findings: {len(findings)}', ''] + [f'- **{f["sev"]}** `{f["file"]}:{f["line"]}` {f["msg"]}' for f in findings]
    if accepted:
        lines += ['', 'Reviewed advisories (not counted; valid only for this exact version):', '']
        lines += [f'- {a["id"]} on {a["pkg"]} ({a["where"]}): {a["reason"]} Evidence: {a["evidence"]}' for a in accepted]
    text = '\n'.join(lines) + '\n'
    if md:
        md.write_text(text)
    print(text)


if __name__ == '__main__':
    main()
