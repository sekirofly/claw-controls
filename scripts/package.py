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
archive = output / 'msi-claw-a8-back-buttons-rumble.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in ('main.py', 'installer.py', 'maintenance_runner.py', 'diagnostics.sh', 'plugin.json', 'package.json', 'dist/index.js', 'README.md', 'README.zh-CN.md', 'LICENSE'):
        bundle.write(root / name, 'msi-claw-a8-back-buttons-rumble/' + name)
    # Supply the LGPL API source and license with the bundled frontend.
    api = root / 'node_modules' / '@decky' / 'api'
    bundle.write(api / 'LICENSE', 'msi-claw-a8-back-buttons-rumble/third_party/decky-api/LICENSE')
    bundle.write(api / 'package.json', 'msi-claw-a8-back-buttons-rumble/third_party/decky-api/package.json')
    for source in (api / 'src').rglob('*'):
        if source.is_file():
            bundle.write(source, 'msi-claw-a8-back-buttons-rumble/third_party/decky-api/' + source.relative_to(api).as_posix())
    for name in ('src/index.tsx', 'rollup.config.js', 'tsconfig.json', 'pnpm-lock.yaml'):
        bundle.write(root / name, 'msi-claw-a8-back-buttons-rumble/source/' + name)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / 'msi-claw-a8-back-buttons-rumble.zip.sha256').write_text(digest + '  msi-claw-a8-back-buttons-rumble.zip\n')
print(archive)
