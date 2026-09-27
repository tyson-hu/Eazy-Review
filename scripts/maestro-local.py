"""Disposable, loopback-only fixtures and runner for the on-demand iOS flow."""

import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.maestro/.local'
BACKEND = LOCAL / 'backend'
API = 'http://127.0.0.1:55321'
PROJECT = 'eazy-review-t0003'
DIMENSIONS = ('look', 'outfit', 'material', 'craftsmanship', 'maintenance',
              'comfort', 'collection', 'value', 'resale_potential', 'acquisition_ease')


def environment(tool):
    # Fresh per-tool allowlists, never a copy of the developer shell environment.
    locale = ('PATH', 'LANG', 'LC_ALL', 'LC_CTYPE')
    runtime = locale + ('HOME', 'TMPDIR', 'TMP', 'TEMP')
    allowed = {
        'git': locale,  # Only local rev-parse/status; no credentials or global config.
        'supabase': runtime,  # CLI config and local Docker discovery.
        'xcrun': runtime + ('DEVELOPER_DIR',),  # Selected Xcode and simulator runtime.
        'maestro': runtime + ('JAVA_HOME', 'DEVELOPER_DIR'),  # Java and iOS driver.
    }[tool]
    env = {key: os.environ[key] for key in allowed if key in os.environ}
    if tool == 'supabase':
        env['DO_NOT_TRACK'] = '1'
    elif tool == 'maestro':
        env.update(MAESTRO_CLI_NO_ANALYTICS='1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED='true',
                   MAESTRO_DISABLE_UPDATE_CHECK='true')
    return env


def command(args):
    # Supabase stdout contains credentials; never log the raw output.
    env = environment(args[0])
    if args[:2] == ['supabase', 'start']:
        env['SUPABASE_AUTH_EXTERNAL_URL'] = API + '/auth/v1'
    result = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{args[0]} {args[1]} failed (exit {result.returncode}); inspect local service health.')
    return result.stdout


def status():
    config = (BACKEND / 'supabase/config.toml').read_text()
    if f'project_id = "{PROJECT}"' not in config or 'port = 55321' not in config:
        raise RuntimeError('Refusing a backend outside the dedicated local fixture.')
    if (BACKEND / 'supabase/.temp/project-ref').exists():
        raise RuntimeError('Refusing a linked Supabase project.')
    result = json.loads(command(['supabase', 'status', '--workdir', str(BACKEND), '-o', 'json']))
    if result.get('API_URL') != API:
        raise RuntimeError('Refusing a non-loopback or unexpected API URL.')
    return result


def request(state, path, data=None):
    # URL has no caller-controlled host. Redirects are rejected, too.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    req = urllib.request.Request(API + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={'Content-Type': 'application/json', 'apikey': state['SERVICE_ROLE_KEY'],
                 'Authorization': 'Bearer ' + state['SERVICE_ROLE_KEY'], 'Prefer': 'return=representation'})
    with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect).open(req, timeout=20) as response:
        return json.load(response)


def save_private(path, text):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as output:
        output.write(text)


def start():
    target = BACKEND / 'supabase'
    target.mkdir(parents=True, exist_ok=True)
    config = (ROOT / 'supabase/config.toml').read_text()
    config = config.replace('project_id = "eazy-review"', f'project_id = "{PROJECT}"')
    for port in range(54320, 54330):
        config = config.replace(f'port = {port}', f'port = {port + 1000}')
    config = config.replace('sql_paths = ["./seed.sql"]', 'sql_paths = []')
    config = config.replace('inspector_port = 8083', 'inspector_port = 8089')
    (target / 'config.toml').write_text(config)
    shutil.copytree(ROOT / 'supabase/migrations', target / 'migrations', dirs_exist_ok=True)
    command(['supabase', 'start', '--workdir', str(BACKEND), '--exclude',
             'studio,postgres-meta,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor'])
    status()
    print('Dedicated local Supabase is ready on port 55321; no reset or account deletion performed.')


def fixture():
    state = status()
    env_path = ROOT / '.env.local'
    expected = ('EXPO_PUBLIC_SUPABASE_URL=' + API + '\n'
                'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' + state['ANON_KEY'] + '\n')
    if (ROOT / '.env').exists() or (env_path.exists() and env_path.read_text() != expected):
        raise RuntimeError('Use an isolated worktree; refusing to overwrite another environment.')
    product = str(uuid.uuid4())
    email = 'maestro-' + secrets.token_hex(6) + '@example.test'
    password = secrets.token_urlsafe(24)
    user = request(state, '/auth/v1/admin/users',
                   {'email': email, 'password': password, 'email_confirm': True})
    request(state, '/rest/v1/products', {'id': product, 'brand': 'Local Test',
            'name': 'T0003 Local Sneaker', 'sku': 'T0003-' + product[:8], 'is_published': True})
    save_private(LOCAL / 'fixture.json', json.dumps({'TEST_EMAIL': email, 'TEST_PASSWORD': password,
                 'PRODUCT_ID': product, 'PRODUCT_SKU': 'T0003-' + product[:8], 'USER_ID': user['id']}))
    save_private(env_path, expected)
    print('Fresh disposable user/product created. Private fixture and local public-only Expo env saved.')


def verify():
    state = status()
    data = json.loads((LOCAL / 'fixture.json').read_text())
    product, user = str(uuid.UUID(data['PRODUCT_ID'])), str(uuid.UUID(data['USER_ID']))
    rows = request(state, f'/rest/v1/user_ratings?product_id=eq.{product}&user_id=eq.{user}&select=*')
    if len(rows) != 1:
        raise RuntimeError('Expected exactly one rating belonging to this disposable user/product.')
    row = rows[0]
    if row['score'] != 6 or row['methodology_version'] != 'sneaker-10-v1':
        raise RuntimeError('Stored composite or methodology differs from the flow expectation.')
    if any(row[key] != (1.5 if key == 'look' else 0.5) for key in DIMENSIONS):
        raise RuntimeError('Stored dimensions differ from the edited UI values.')
    print('PASS: one persisted rating; Appearance=1.5, other nine dimensions=0.5, My Rating=6.')


def run(args):
    flow = getattr(args, 'flow', 'critical-flow')
    state = status()
    devices = json.loads(command(['xcrun', 'simctl', 'list', 'devices', 'available', '-j']))
    if not any(d['udid'] == args.device and d['state'] == 'Booted'
               for group in devices['devices'].values() for d in group):
        raise RuntimeError('The target must be an explicitly selected booted iOS Simulator.')
    data = json.loads((LOCAL / 'fixture.json').read_text())
    product, user = str(uuid.UUID(data['PRODUCT_ID'])), str(uuid.UUID(data['USER_ID']))
    rows = request(state, f'/rest/v1/user_ratings?product_id=eq.{product}&user_id=eq.{user}&select=id')
    if rows:
        raise RuntimeError('Fixture already has a rating; run fixture before each complete run.')
    output = LOCAL / ('run-' + time.strftime('%Y%m%d-%H%M%S'))
    output.mkdir(mode=0o700)
    summary = {'tested_commit': command(['git', 'rev-parse', 'HEAD']).strip(),
               'tracked_tree_dirty': bool(command(['git', 'status', '--porcelain', '--untracked-files=no']).strip()),
               'device': args.device, 'product_id': product,
               'precondition': 'Fresh synthetic account/product; zero rating rows; launchApp clears app state',
               'flow': flow, 'result': 'running'}
    (output / 'run-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    env = environment('maestro')
    env.update({'MAESTRO_' + key: data[key]
                for key in ('TEST_EMAIL', 'TEST_PASSWORD', 'PRODUCT_ID', 'PRODUCT_SKU')})

    def redact(text):
        for key in ('TEST_EMAIL', 'TEST_PASSWORD'):
            text = text.replace(data[key], '[DISPOSABLE_' + key + ']')
        return text

    cmd = [args.maestro, '--udid', args.device, 'test', '--no-ansi', '--flatten-debug-output',
           '--debug-output', str(output), '--format', 'JUNIT', '--output', str(output / 'report.xml'),
           f'.maestro/{flow}.yaml']
    with (output / 'console.log').open('w') as log:
        process = subprocess.Popen(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True)
        try:
            for line in process.stdout:
                safe = redact(line)
                log.write(safe)
                log.flush()
                print(safe, end='', flush=True)
            code = process.wait()
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=15)
            # Maestro writes evaluated inputText values to its local debug files.
            # Keep this private directory unsynced; scrub before inspecting or sharing.
            for path in output.rglob('*'):
                if path.is_file() and path.suffix in ('.log', '.txt', '.json', '.xml', '.yaml', '.html'):
                    content = path.read_text(errors='replace')
                    safe = redact(content)
                    if safe != content:
                        path.write_text(safe)
    print('Sanitized local artifacts:', output.relative_to(ROOT))
    if code:
        summary['result'] = 'failed'
        (output / 'run-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
        raise RuntimeError(f'Maestro flow failed (exit {code}).')
    if flow != 'critical-flow':
        summary.update(result='pass', database_verification='not_run_micro_flow')
        (output / 'run-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
        return
    try:
        verify()
    except Exception:
        summary.update(result='failed', failure_stage='database_verification')
        (output / 'run-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
        raise
    summary.update(result='pass', persisted_score=6, appearance=1.5, other_nine_dimensions=0.5)
    (output / 'run-summary.json').write_text(json.dumps(summary, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('start', 'fixture', 'run', 'verify', 'stop'))
    parser.add_argument('--device', help='Booted simulator UDID (required for run)')
    parser.add_argument('--maestro', default='maestro', help='Reviewed Maestro CLI executable')
    parser.add_argument('--flow', default='critical-flow',
                        choices=('critical-flow', 'comfort-check'),
                        help='Bounded diagnostic flows do not claim full-flow DB verification')
    args = parser.parse_args()
    os.umask(0o077)
    LOCAL.mkdir(parents=True, exist_ok=True)
    try:
        if args.action == 'run':
            if not args.device:
                parser.error('--device is required for run')
            run(args)
        elif args.action == 'stop':
            status()
            command(['supabase', 'stop', '--workdir', str(BACKEND)])
            print('Stopped the dedicated test stack; disposable data volumes retained.')
        else:
            {'start': start, 'fixture': fixture, 'verify': verify}[args.action]()
    except Exception as error:
        # HTTP errors and subprocess stdout can contain credentials. Do not dump them.
        print(str(error) if isinstance(error, RuntimeError) else
              f'Local setup failed: {type(error).__name__}; no credential output emitted.', file=sys.stderr)
        raise SystemExit(1)
