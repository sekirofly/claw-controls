import asyncio
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import main


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.device = self.root / 'hidraw7' / 'device'
        self.device.mkdir(parents=True)
        for attr, value in zip(main.ATTRS, ['macro', '80', '90']):
            (self.device / attr).write_text(value)
        self.plugin = main.Plugin()
        p = patch.object(main, 'HIDRAW_CLASS', self.root)
        p.start()
        self.addCleanup(p.stop)
        p = patch.object(main, '_check_root')
        p.start()
        self.addCleanup(p.stop)

    def test_read_and_apply(self):
        self.assertEqual(asyncio.run(self.plugin.get_state())['left'], 80)
        self.assertTrue(asyncio.run(self.plugin.set_mode('combination'))['ok'])
        result = asyncio.run(self.plugin.set_rumble(20, 30))
        self.assertEqual((result['left'], result['right']), (20, 30))

    def test_invalid_inputs_do_not_write(self):
        for value in (True, 1.5, '10', -1, 101):
            self.assertFalse(asyncio.run(self.plugin.set_rumble(value, 50))['ok'])
        self.assertFalse(asyncio.run(self.plugin.set_mode('../escape'))['ok'])
        self.assertEqual((self.device / 'rumble_intensity_left').read_text(), '80')

    def test_multiple_devices_refuse_writes(self):
        import shutil
        shutil.copytree(self.device, self.root / 'hidraw8' / 'device')
        self.assertFalse(asyncio.run(self.plugin.set_rumble(10, 10))['ok'])

    def test_readback_mismatch(self):
        with patch.object(main, '_write'):
            self.assertFalse(asyncio.run(self.plugin.set_rumble(10, 10))['ok'])


if __name__ == '__main__':
    unittest.main()
