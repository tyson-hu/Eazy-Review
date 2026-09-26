"""Credential-free, no-network regression check for the local fixture boundary."""

import importlib.util
import io
import os
from pathlib import Path
import unittest
from unittest.mock import patch
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


if __name__ == '__main__':
    unittest.main()
