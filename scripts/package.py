from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
manifest = json.loads((root / 'plugin.json').read_text())
assert manifest['version'] == version
output = root / 'release'
output.mkdir(exist_ok=True)
archive = output / 'ClawControls.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in ('main.py', 'installer.py', 'maintenance_runner.py', 'plugin.json', 'package.json', 'dist/index.js', 'README.md', 'LICENSE'):
        bundle.write(root / name, 'ClawControls/' + name)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / 'ClawControls.zip.sha256').write_text(digest + '  ClawControls.zip\n')
print(archive)
