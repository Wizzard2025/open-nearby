#!/usr/bin/env python3
"""Release scan with a local SonarQube Community Build (Docker).

  python3 tools/sonar/sonar.py up         start SonarQube + Postgres, set an admin password and a scan token
  python3 tools/sonar/sonar.py configure  create/refresh the strict quality profiles and quality gate (idempotent)
  python3 tools/sonar/sonar.py baseline REF  analyse an earlier release (git tag/commit) as the "new code" baseline;
                                          needed once on a fresh instance before the first release scan
  python3 tools/sonar/sonar.py scan       dependency/CVE check + SonarQube analysis of the current version;
                                          writes .sonar/reports/<version>/ and exits 1 if the gate fails
  python3 tools/sonar/sonar.py down       stop the containers (data is kept in Docker volumes)

Everything secret (DB password, admin password, scan token) lives in .sonar/.env, which is git-ignored.
SonarQube listens on 127.0.0.1:9000 only. Requires Docker with the compose plugin and Python 3.10+.
"""
import base64
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
STATE_DIR = '.sonar'
STATE = ROOT / STATE_DIR
ENV = STATE / '.env'
COMPOSE = ['docker', 'compose', '-f', str(HERE / 'docker-compose.yml'), '--env-file', str(ENV)]
URL = 'http://127.0.0.1:9000'
PROJECT = 'open-nearby'
SCANNER = 'sonarsource/sonar-scanner-cli:12.4.0.4321_8.4.0'
NETWORK = 'open-nearby-sonar_default'
PROFILE = 'Strict (open-nearby)'
HOTSPOTS_API, ISSUES_API = '/api/hotspots/search', '/api/issues/search'
GATE = 'Strict (open-nearby)'
# Languages present in this repo. Each gets a profile built on "Sonar way comprehensive".
LANGS = ['js', 'css', 'web', 'py', 'secrets', 'yaml', 'json', 'text']
# Rules switched off in the strict profile, each for a reason specific to this code base.
DEACTIVATE = {
    'javascript:S1451': 'Requires a licence/copyright header in every file; the project has no such header policy.',
    'Web:HeaderCheck': 'Same header-comment convention for HTML; not a project policy.',
    'javascript:S1539': "Assumes ES modules; these files are classic <script>s, where 'use strict' is required, not redundant.",
    'Web:InternationalizationCheck': 'Expects server-side resource bundles (JSP/JSF); this app localises in JS (I18N tables) '
                                     'and keeps static fallback text in the HTML.',
}

# Gate ("clean as you code", strict variant): on the whole code base no security or reliability issue of any
# severity (ratings A), maintainability rating A, no blocker, every security hotspot reviewed, duplication <= 3 %;
# on code changed since the previous version, no new issue of any kind. Older style debt (e.g. missing braces)
# is reported but blocks a release only where the release touches it. Coverage is not gated: the project has no
# automated test suite yet, so a coverage condition could never pass (see README in this folder).
GATE_CONDITIONS = [
    ('software_quality_security_rating', 'GT', '1'),
    ('software_quality_reliability_rating', 'GT', '1'),
    ('software_quality_maintainability_rating', 'GT', '1'),
    ('security_hotspots_reviewed', 'LT', '100'),
    ('blocker_violations', 'GT', '0'),
    ('duplicated_lines_density', 'GT', '3'),
    ('new_software_quality_security_rating', 'GT', '1'),
    ('new_software_quality_reliability_rating', 'GT', '1'),
    ('new_software_quality_maintainability_rating', 'GT', '1'),
    ('new_security_hotspots_reviewed', 'LT', '100'),
    ('new_violations', 'GT', '0'),
    ('new_duplicated_lines_density', 'GT', '3'),
]


# ---------- small helpers ----------
def env():
    d = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                d[k.strip()] = v.strip()
    return d


def env_set(**kv):
    d = env()
    d.update({k: str(v) for k, v in kv.items()})
    STATE.mkdir(exist_ok=True)
    ENV.write_text(''.join(f'{k}={v}\n' for k, v in d.items()))
    os.chmod(ENV, 0o600)


def api(method, path, params=None, auth=None, ok404=False):
    """Call the SonarQube Web API. auth = (user, password) or a token string; defaults to the admin login."""
    auth = auth or ('admin', env().get('SONAR_ADMIN_PASSWORD', 'admin'))
    cred = f'{auth[0]}:{auth[1]}' if isinstance(auth, tuple) else f'{auth}:'
    data = urllib.parse.urlencode(params or {}, doseq=True)
    url = URL + path + ('?' + data if method == 'GET' and data else '')
    req = urllib.request.Request(url, data=data.encode() if method == 'POST' else None, method=method,
                                 headers={'Authorization': 'Basic ' + base64.b64encode(cred.encode()).decode()})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read()
            return json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        if ok404 and e.code in (400, 404):
            return None
        raise SystemExit(f'SonarQube API {method} {path} failed: HTTP {e.code} {e.read()[:400]!r}')


def server_version():
    with urllib.request.urlopen(URL + '/api/server/version', timeout=10) as r:  # plain text, no auth needed
        return r.read().decode().strip()


def wait_up(timeout=600):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            with urllib.request.urlopen(URL + '/api/system/status', timeout=5) as r:
                if json.load(r).get('status') == 'UP':
                    return
        except OSError:
            pass
        time.sleep(5)
    raise SystemExit('SonarQube did not come up; see: docker compose -f tools/sonar/docker-compose.yml logs sonarqube')


def version():
    m = re.search(r'class="madeby".*?>v(\d+\.\d+\.\d+)<', (ROOT / 'index.html').read_text(encoding='utf-8'))
    if not m:
        raise SystemExit('No version found in index.html (footer "madeby" link "vX.Y.Z").')
    return m.group(1)


# ---------- commands ----------
def up():
    if not shutil.which('docker'):
        raise SystemExit('Docker is required.')
    if not env().get('SONAR_DB_PASSWORD'):
        env_set(SONAR_DB_PASSWORD=secrets.token_urlsafe(24))
    # Elasticsearch inside SonarQube refuses to start with <10% free disk or <65535 open files. On a normal
    # machine both checks stay on; in a constrained sandbox they are switched off, with a warning.
    st = shutil.disk_usage('/')
    if st.free / st.total < 0.15 and not env().get('SONAR_ES_OPTS'):
        print('warning: little free disk; disabling the Elasticsearch disk watermark for this local instance')
        env_set(SONAR_ES_OPTS='-Dcluster.routing.allocation.disk.threshold_enabled=false')
    try:
        import resource
        if resource.getrlimit(resource.RLIMIT_NOFILE)[1] < 65535 and env().get('SONAR_ES_BOOTSTRAP_CHECKS_DISABLE') != 'true':
            print('warning: open-file limit below 65535; disabling Elasticsearch bootstrap checks for this local instance')
            env_set(SONAR_ES_BOOTSTRAP_CHECKS_DISABLE='true')
    except ImportError:
        pass
    subprocess.run(COMPOSE + ['up', '-d'], check=True)
    wait_up()
    if not env().get('SONAR_ADMIN_PASSWORD'):
        pw = secrets.token_urlsafe(24) + 'aA1!'
        api('POST', '/api/users/change_password', {'login': 'admin', 'previousPassword': 'admin', 'password': pw}, auth=('admin', 'admin'))
        env_set(SONAR_ADMIN_PASSWORD=pw)
        print('admin password set (stored in .sonar/.env)')
    if not env().get('SONAR_TOKEN'):
        api('POST', '/api/user_tokens/revoke', {'name': 'release-scan'})
        tok = api('POST', '/api/user_tokens/generate', {'name': 'release-scan', 'type': 'GLOBAL_ANALYSIS_TOKEN'})['token']
        env_set(SONAR_TOKEN=tok)
        print('scan token created (stored in .sonar/.env)')
    print(f'SonarQube is up at {URL}')


def activate(profile_key, **filters):
    q = {'targetKey': profile_key, 'statuses': 'READY', 'is_template': 'false'}
    q.update(filters)
    return api('POST', '/api/qualityprofiles/activate_rules', q).get('succeeded', 0)


def configure():
    wait_up()
    # Instance hardening: nothing is visible without logging in.
    api('POST', '/api/settings/set', {'key': 'sonar.forceAuthentication', 'value': 'true'})
    if not api('GET', '/api/projects/search', {'projects': PROJECT})['components']:
        api('POST', '/api/projects/create', {'project': PROJECT, 'name': 'בטוח? פתוח! (open-nearby)', 'visibility': 'private'})
    # New code = changes since the previous analysis (the previous released version).
    api('POST', '/api/new_code_periods/set', {'project': PROJECT, 'type': 'PREVIOUS_VERSION'})

    profiles = api('GET', '/api/qualityprofiles/search')['profiles']
    for lang in LANGS:
        mine = next((p for p in profiles if p['language'] == lang and p['name'] == PROFILE), None)
        base = next((p for p in profiles if p['language'] == lang and p['name'] == 'Sonar way comprehensive'), None)
        if not mine:
            if base:
                mine = api('POST', '/api/qualityprofiles/copy', {'fromKey': base['key'], 'toName': PROFILE})
            else:
                mine = api('POST', '/api/qualityprofiles/create', {'language': lang, 'name': PROFILE})['profile']
        key = mine['key']
        # On top of the comprehensive set: every rule with a security or reliability impact, at any severity,
        # every security-hotspot rule, and every maintainability rule of high or blocker severity.
        n = activate(key, languages=lang, impactSoftwareQualities='SECURITY')
        n += activate(key, languages=lang, impactSoftwareQualities='RELIABILITY')
        n += activate(key, languages=lang, types='SECURITY_HOTSPOT')
        n += activate(key, languages=lang, impactSoftwareQualities='MAINTAINABILITY', impactSeverities='HIGH,BLOCKER')
        for rule, why in DEACTIVATE.items():
            if rule.split(':')[0] == {'js': 'javascript', 'web': 'Web', 'py': 'python', 'css': 'css'}.get(lang):
                api('POST', '/api/qualityprofiles/deactivate_rule', {'key': key, 'rule': rule}, ok404=True)
        api('POST', '/api/qualityprofiles/set_default', {'language': lang, 'qualityProfile': PROFILE})
        api('POST', '/api/qualityprofiles/add_project', {'language': lang, 'qualityProfile': PROFILE, 'project': PROJECT}, ok404=True)
        count = next(p['activeRuleCount'] for p in api('GET', '/api/qualityprofiles/search', {'language': lang})['profiles'] if p['name'] == PROFILE)
        print(f'profile {lang:8} {count:4} active rules (+{n} this run)')

    gates = api('GET', '/api/qualitygates/list')['qualitygates']
    if not any(g['name'] == GATE for g in gates):
        api('POST', '/api/qualitygates/create', {'name': GATE})
    gate = api('GET', '/api/qualitygates/show', {'name': GATE})
    have = {c['metric']: c for c in gate.get('conditions', [])}
    for metric, op, err in GATE_CONDITIONS:
        if metric in have:
            c = have.pop(metric)
            if c['op'] != op or c['error'] != err:
                api('POST', '/api/qualitygates/update_condition', {'id': c['id'], 'metric': metric, 'op': op, 'error': err})
        else:
            api('POST', '/api/qualitygates/create_condition', {'gateName': GATE, 'metric': metric, 'op': op, 'error': err})
    for c in have.values():  # conditions not in the list above
        api('POST', '/api/qualitygates/delete_condition', {'id': c['id']})
    api('POST', '/api/qualitygates/set_as_default', {'name': GATE})
    api('POST', '/api/qualitygates/select', {'gateName': GATE, 'projectKey': PROJECT})
    print(f'quality gate "{GATE}": {len(GATE_CONDITIONS)} conditions, default and assigned to {PROJECT}')


def run_scanner(ver, src=ROOT, extra=()):
    tok = env().get('SONAR_TOKEN') or sys.exit('No scan token; run: sonar.py up')
    cmd = ['docker', 'run', '--rm', '--network', NETWORK,
           '-e', 'SONAR_HOST_URL=http://sonarqube:9000', '-e', 'SONAR_TOKEN',
           '-v', f'{src}:/usr/src', '-w', '/usr/src',
           '--user', f'{os.getuid()}:{os.getgid()}', '-e', 'HOME=/tmp',
           SCANNER, f'-Dsonar.projectVersion={ver}', '-Dsonar.qualitygate.wait=true', '-Dsonar.qualitygate.timeout=600',
           '-Dsonar.externalIssuesReportPaths=.sonar/external-issues.json', '-Dsonar.working.directory=.sonar/scannerwork',
           # No SCM: SonarQube would otherwise backdate a new issue to its line's commit date, so an issue committed
           # before the baseline was analysed would not count as new. Without blame an issue is new exactly when it
           # was not in the previous version's analysis.
           '-Dsonar.scm.disabled=true', *extra]
    r = subprocess.run(cmd, env={**os.environ, 'SONAR_TOKEN': tok}, capture_output=True, text=True)
    (STATE / 'scanner.log').write_text(r.stdout + r.stderr)
    if 'EXECUTION SUCCESS' not in r.stdout and 'QUALITY GATE STATUS' not in r.stdout + r.stderr:
        print((r.stdout + r.stderr)[-3000:])
        raise SystemExit('Scanner failed (full log: .sonar/scanner.log)')


def fetch_all(path, params, key):
    """Every page of a paged search (issues, hotspots), collected before anything acts on the results."""
    out, p = [], 1
    while True:
        r = api('GET', path, {**params, 'ps': 500, 'p': p})
        out += r[key]
        if p * 500 >= r['paging']['total']:
            return out
        p += 1


def _review_for(reviews, rule, component, line):
    path = component.split(':', 1)[1]
    src = (ROOT / path).read_text(encoding='utf-8', errors='replace').splitlines()
    text = src[line - 1].strip() if line and line <= len(src) else ''
    return next((r for r in reviews if r['rule'] == rule and r['file'] == path and r['line'].strip() == text), None)


def apply_reviews():
    """Human decisions live in reviews.json, versioned with the code: security hotspots reviewed as SAFE, and issues
    shown to be false positives. Each entry matches by rule, file and the exact (trimmed) source line, with the
    reason. When that line changes the entry stops matching and the finding is back for review.
    The file is the only source of truth: a decision in SonarQube with no matching entry (the line changed, the entry
    was removed, or someone clicked it in the UI) is reopened. Returns the number of status changes."""
    rv = json.loads((HERE / 'reviews.json').read_text())
    hs_open = fetch_all(HOTSPOTS_API, {'project': PROJECT, 'status': 'TO_REVIEW'}, 'hotspots')
    hs_safe = fetch_all(HOTSPOTS_API, {'project': PROJECT, 'status': 'REVIEWED', 'resolution': 'SAFE'}, 'hotspots')
    is_open = fetch_all(ISSUES_API, {'componentKeys': PROJECT, 'issueStatuses': 'OPEN,CONFIRMED'}, 'issues')
    is_fp = fetch_all(ISSUES_API, {'componentKeys': PROJECT, 'issueStatuses': 'FALSE_POSITIVE'}, 'issues')
    changed = 0
    for h in hs_open:
        r = _review_for(rv.get('hotspots', []), h['ruleKey'], h['component'], h.get('line'))
        if r:
            api('POST', '/api/hotspots/change_status', {'hotspot': h['key'], 'status': 'REVIEWED', 'resolution': 'SAFE',
                                                        'comment': f'{r["why"]} (tools/sonar/reviews.json)'})
            changed += 1
    for h in hs_safe:
        if not _review_for(rv.get('hotspots', []), h['ruleKey'], h['component'], h.get('line')):
            api('POST', '/api/hotspots/change_status', {'hotspot': h['key'], 'status': 'TO_REVIEW',
                                                        'comment': 'No matching entry in tools/sonar/reviews.json any more; review again.'})
            changed += 1
    for i in is_open:
        r = _review_for(rv.get('issues', []), i['rule'], i['component'], i.get('line'))
        if r:
            api('POST', '/api/issues/add_comment', {'issue': i['key'], 'text': f'{r["why"]} (tools/sonar/reviews.json)'})
            api('POST', '/api/issues/do_transition', {'issue': i['key'], 'transition': 'falsepositive'})
            changed += 1
    for i in is_fp:
        if not _review_for(rv.get('issues', []), i['rule'], i['component'], i.get('line')):
            api('POST', '/api/issues/do_transition', {'issue': i['key'], 'transition': 'reopen'})
            api('POST', '/api/issues/add_comment', {'issue': i['key'], 'text': 'Reopened: no matching entry in tools/sonar/reviews.json.'})
            changed += 1
    return changed


def report(ver, deps_md):
    out = STATE / 'reports' / ver
    out.mkdir(parents=True, exist_ok=True)
    qg = api('GET', '/api/qualitygates/project_status', {'projectKey': PROJECT})['projectStatus']
    issues, p = [], 1
    while True:
        r = api('GET', ISSUES_API, {'componentKeys': PROJECT, 'issueStatuses': 'OPEN,CONFIRMED', 'ps': 500, 'p': p})
        issues += r['issues']
        if p * 500 >= r['paging']['total']:
            break
        p += 1
    hs = api('GET', HOTSPOTS_API, {'project': PROJECT, 'status': 'TO_REVIEW', 'ps': 500})['hotspots']
    measures = {m['metric']: m.get('value', m.get('period', {}).get('value')) for m in api('GET', '/api/measures/component', {
        'component': PROJECT, 'metricKeys': ','.join(sorted({c[0] for c in GATE_CONDITIONS} | {'ncloc', 'security_hotspots', 'violations'}))})['component']['measures']}
    (out / 'issues.json').write_text(json.dumps(issues, indent=1, ensure_ascii=False))
    (out / 'hotspots.json').write_text(json.dumps(hs, indent=1, ensure_ascii=False))
    (out / 'quality-gate.json').write_text(json.dumps(qg, indent=1))

    def impact(i):
        return ', '.join(f'{x["softwareQuality"].lower()} {x["severity"].lower()}' for x in i.get('impacts', []))
    lines = [f'# Release scan {ver}', '', f'Quality gate **{GATE}**: **{qg["status"]}**', '',
             '| Condition | Actual | Fails when | Status |', '|---|---|---|---|']
    lines += [f'| {c["metricKey"]} | {c.get("actualValue", "–")} | {c["comparator"]} {c["errorThreshold"]} | {c["status"]} |' for c in qg['conditions']]
    lines += ['', f'Lines of code: {measures.get("ncloc")}. Open issues: {len(issues)}. Hotspots to review: {len(hs)}.', '', '## Open issues', '']
    lines += [f'- `{i["component"].split(":", 1)[1]}:{i.get("line", "-")}` [{i["rule"]}] ({impact(i)}) {i["message"]}' for i in
              sorted(issues, key=lambda i: (i['component'], i.get('line', 0)))] or ['None.']
    lines += ['', '## Security hotspots to review', '']
    lines += [f'- `{h["component"].split(":", 1)[1]}:{h.get("line", "-")}` [{h["ruleKey"]}] ({h["vulnerabilityProbability"].lower()}) {h["message"]}' for h in hs] or ['None.']
    lines += ['', deps_md]
    (out / 'report.md').write_text('\n'.join(lines) + '\n')

    # Short, committed summary for the release record (docs/security/scan-<version>.md).
    from collections import Counter
    by_quality = Counter(x['softwareQuality'].lower() for i in issues for x in i.get('impacts', []))
    top = Counter(i['rule'] for i in issues).most_common(8)
    reviewed = json.loads((HERE / 'reviews.json').read_text())
    summary = lines[:lines.index('## Open issues')] + [
        'Open issues by quality: ' + (', '.join(f'{k} {v}' for k, v in sorted(by_quality.items())) or 'none') + '.',
        'Most frequent rules: ' + (', '.join(f'{r} ({n})' for r, n in top) or 'none') + '.', '',
        f'Recorded reviews applied (tools/sonar/reviews.json): {len(reviewed.get("hotspots", []))} hotspots, '
        f'{len(reviewed.get("issues", []))} false positives.', '',
        f'SonarQube {server_version()}, profile "{PROFILE}", scanner {SCANNER.split(":")[1]}.', '', deps_md]
    (out / 'summary.md').write_text('\n'.join(str(x) for x in summary) + '\n')
    return qg['status'], out


def analysed_versions():
    events = fetch_all('/api/project_analyses/search', {'project': PROJECT, 'category': 'VERSION'}, 'analyses')
    return {e['name'] for a in events for e in a.get('events', []) if e.get('category') == 'VERSION'}


def baseline(ref):
    """Analyse an earlier release (exported with git archive) so the release scan has a "new code" baseline. On a fresh SonarQube the first
    analysis has no new-code period, so "no new issues" would not be checked at all; scan refuses to certify a
    release until a different, earlier version has been analysed."""
    wait_up()
    src = STATE / 'baseline-src'
    shutil.rmtree(src, ignore_errors=True)
    src.mkdir(parents=True)
    # A plain export of that commit (a git worktree would point the scanner container at a path it cannot see).
    archive = subprocess.run(['git', '-C', str(ROOT), 'archive', '--format=tar', ref], check=True, capture_output=True).stdout
    subprocess.run(['tar', '-x', '-C', str(src)], input=archive, check=True)
    try:
        m = re.search(r'class="madeby".*?>v(\d+\.\d+\.\d+)<', (src / 'index.html').read_text(encoding='utf-8'))
        ver = m.group(1) if m else f'baseline-{ref}'
        if ver == version():
            raise SystemExit(f'{ref} has the same version ({ver}) as the working tree; pick the previous release.')
        # Analyse it with today's settings and dependency checks, so the baseline is comparable.
        shutil.copyfile(ROOT / 'sonar-project.properties', src / 'sonar-project.properties')
        (src / STATE_DIR).mkdir(exist_ok=True)
        subprocess.run([sys.executable, '-I', str(HERE / 'deps_check.py'), str(src), str(src / STATE_DIR / 'external-issues.json')],
                       check=True, stdout=subprocess.DEVNULL)
        print(f'analysing baseline {ref} as version {ver} …')
        run_scanner(ver, src=src)
        print(f'baseline {ver} recorded; now run: sonar.py scan')
    finally:
        shutil.rmtree(src, ignore_errors=True)


def scan():
    wait_up()
    ver = version()
    if not analysed_versions() - {ver}:
        raise SystemExit('No earlier version has been analysed on this SonarQube, so new code cannot be checked.\n'
                         'Analyse the previous release first, e.g.: python3 tools/sonar/sonar.py baseline <tag or commit of the last release>')
    out = STATE / 'reports' / ver
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, '-I', str(HERE / 'deps_check.py'), str(ROOT), str(STATE / 'external-issues.json'), str(out / 'deps.md')],
                   check=True, stdout=subprocess.DEVNULL)
    print(f'scanning {PROJECT} {ver} …')
    run_scanner(ver)
    if apply_reviews():
        run_scanner(ver)  # re-evaluate the gate with the recorded reviews
    status, out = report(ver, (out / 'deps.md').read_text())
    print(f'quality gate: {status}; report: {out.relative_to(ROOT)}/report.md')
    if status != 'OK':
        sys.exit(1)
    record = ROOT / 'docs' / 'security' / f'scan-{ver}.md'
    record.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(out / 'summary.md', record)
    print(f'release record: {record.relative_to(ROOT)} (commit it with the release)')


def down():
    subprocess.run(COMPOSE + ['stop'], check=True)


if __name__ == '__main__':
    cmds = {'up': up, 'configure': configure, 'scan': scan, 'down': down}
    if len(sys.argv) == 3 and sys.argv[1] == 'baseline':
        baseline(sys.argv[2])
    elif len(sys.argv) == 2 and sys.argv[1] in cmds:
        cmds[sys.argv[1]]()
    else:
        raise SystemExit(__doc__)
