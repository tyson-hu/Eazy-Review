"""Credential-free, no-network regression check for the local fixture boundary."""

import importlib.util
import io
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import urllib.request
import urllib.response

spec = importlib.util.spec_from_file_location('maestro_local', Path(__file__).with_name('maestro-local.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class LoopbackBoundary(unittest.TestCase):
    def test_proxy_environment_cannot_receive_privileged_request(self):
        observed = []

        def no_network(handler, request):
            observed.append(request)
            response = urllib.response.addinfourl(io.BytesIO(b'{}'), {}, request.full_url, 200)
            response.msg = 'OK'
            return response

        with patch.dict(os.environ, {'http_proxy': 'http://proxy.invalid:8888', 'no_proxy': ''}, clear=True), \
                patch.object(urllib.request.HTTPHandler, 'http_open', no_network), \
                patch('socket.create_connection', side_effect=AssertionError('Network forbidden')):
            self.assertEqual(helper.request({'SERVICE_ROLE_KEY': 'placeholder-only'}, '/probe'), {})
        self.assertEqual(len(observed), 1)
        self.assertEqual(observed[0].host, '127.0.0.1:55321')
        self.assertEqual(observed[0].full_url, 'http://127.0.0.1:55321/probe')

    def test_ui_pass_with_database_failure_is_recorded_as_failed(self):
        device = 'test-simulator'
        devices = {'devices': {'test-runtime': [{'udid': device, 'state': 'Booted'}]}}
        fixture = {'PRODUCT_ID': '00000000-0000-4000-8000-000000000001',
                   'USER_ID': '00000000-0000-4000-8000-000000000002',
                   'TEST_EMAIL': 'placeholder@example.test', 'TEST_PASSWORD': 'placeholder-only'}
        process = Mock(stdout=iter(()))
        process.wait.return_value = 0
        process.poll.return_value = 0
        with TemporaryDirectory() as directory:
            local = Path(directory)
            (local / 'fixture.json').write_text(json.dumps(fixture))
            with patch.object(helper, 'LOCAL', local), \
                    patch.object(helper, 'status', return_value={}), \
                    patch.object(helper, 'request', return_value=[]), \
                    patch.object(helper, 'command', side_effect=[json.dumps(devices), 'test-commit', '']), \
                    patch.object(helper.subprocess, 'Popen', return_value=process), \
                    patch.object(helper, 'verify', side_effect=RuntimeError('Stored score mismatch')), \
                    patch('socket.create_connection', side_effect=AssertionError('Network forbidden')), \
                    patch('builtins.print'):
                # The runner prints a relative local artifact path; keep that root local too.
                with patch.object(helper, 'ROOT', local):
                    with self.assertRaisesRegex(RuntimeError, 'Stored score mismatch'):
                        helper.run(SimpleNamespace(device=device, maestro='unused-placeholder'))
            summary = json.loads(next(local.glob('run-*/run-summary.json')).read_text())
            self.assertEqual(summary['result'], 'failed')
            self.assertEqual(summary['failure_stage'], 'database_verification')


if __name__ == '__main__':
    unittest.main()
