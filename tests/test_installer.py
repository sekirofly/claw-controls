import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import installer


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name).resolve() / 'homebrew'
        self.target = self.home / 'plugins' / 'MSIClawA8Z2EController'
        self.target.mkdir(parents=True)
        (self.target / 'plugin.json').write_text(json.dumps({'name': installer.NAME}))
        (self.target / 'old.txt').write_text('old')
        self.other = self.home / 'plugins' / 'OtherPlugin'
        self.other.mkdir()
        (self.other / 'keep.txt').write_text('keep')

    def test_uninstall_only_own_files(self):
        own = self.home / 'settings' / 'MSIClawA8Z2EController'
        own.mkdir(parents=True)
        (own / 'settings.json').write_text('{}')
        with patch.object(installer, 'service'):
            installer.transact(self.home, 'uninstall')
        self.assertFalse(self.target.exists())
        self.assertFalse(own.exists())
        self.assertEqual((self.other / 'keep.txt').read_text(), 'keep')

    def test_start_failure_restores_installation(self):
        calls = []
        def service(action):
            calls.append(action)
            if calls.count('start') == 1 and action == 'start':
                raise RuntimeError('service failed')
        with patch.object(installer, 'service', side_effect=service):
            with self.assertRaises(RuntimeError):
                installer.transact(self.home, 'uninstall')
        self.assertEqual((self.target / 'old.txt').read_text(), 'old')

    def test_partial_copy_rolls_back(self):
        staged = self.home / 'stage'
        staged.mkdir()
        def fail_copy(source, target):
            target.mkdir()
            (target / 'partial').write_text('broken')
            raise OSError('disk full')
        with patch.object(installer, 'service'), patch.object(installer.shutil, 'copytree', side_effect=fail_copy):
            with self.assertRaises(OSError):
                installer.transact(self.home, 'reinstall', staged)
        self.assertEqual((self.target / 'old.txt').read_text(), 'old')
        self.assertFalse((self.target / 'partial').exists())

    def test_wrong_identity_is_not_deleted(self):
        (self.target / 'plugin.json').write_text('{"name":"Other"}')
        with self.assertRaises(ValueError):
            installer.transact(self.home, 'uninstall')
        self.assertTrue((self.target / 'old.txt').exists())

    def test_legacy_installation_blocks_duplicate(self):
        legacy = self.home / 'plugins' / 'ClawControls'
        legacy.mkdir()
        with self.assertRaisesRegex(ValueError, 'Uninstall the old'):
            installer.validate_home(self.home)
        self.assertTrue(legacy.exists())

    def test_stop_failure_keeps_files(self):
        with patch.object(installer, 'service', side_effect=RuntimeError('cannot stop')):
            with self.assertRaises(RuntimeError):
                installer.transact(self.home, 'uninstall')
        self.assertEqual((self.target / 'old.txt').read_text(), 'old')

    def test_successful_reinstall(self):
        staged = self.home / 'stage'
        staged.mkdir()
        (staged / 'plugin.json').write_text(json.dumps({'name': installer.NAME}))
        (staged / 'new.txt').write_text('new')
        with patch.object(installer, 'service'), patch.object(installer.os, 'chown', create=True):
            installer.transact(self.home, 'reinstall', staged)
        self.assertFalse((self.target / 'old.txt').exists())
        self.assertEqual((self.target / 'new.txt').read_text(), 'new')
        self.assertEqual((self.other / 'keep.txt').read_text(), 'keep')

    def test_rollback_failure_preserves_backup(self):
        def service(action):
            if action == 'start':
                raise RuntimeError('cannot start')
        with patch.object(installer, 'service', side_effect=service):
            with self.assertRaises(RuntimeError):
                installer.transact(self.home, 'uninstall')
        self.assertEqual((self.target / 'old.txt').read_text(), 'old')

    @unittest.skipIf(__import__('os').name == 'nt', 'Linux symlink test')
    def test_symlink_is_rejected(self):
        link = self.home / 'settings'
        link.symlink_to(self.other, target_is_directory=True)
        with self.assertRaises(ValueError):
            installer.transact(self.home, 'uninstall')
        self.assertTrue((self.other / 'keep.txt').exists())

    def test_archive_traversal(self):
        for filename in ('../escape', 'MSIClawA8Z2EController/../../escape', '/etc/passwd', 'Other/main.py', 'MSIClawA8Z2EController\\escape'):
            data = io.BytesIO()
            with zipfile.ZipFile(data, 'w') as archive:
                archive.writestr(filename, 'bad')
            with self.assertRaises(ValueError):
                installer.unpack(data.getvalue(), self.home / 'extracted')

    def test_archive_symlink(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            info = zipfile.ZipInfo('MSIClawA8Z2EController/link')
            info.external_attr = 0o120777 << 16
            archive.writestr(info, '/etc')
        with self.assertRaises(ValueError):
            installer.unpack(data.getvalue(), self.home / 'extracted')


if __name__ == '__main__':
    unittest.main()
