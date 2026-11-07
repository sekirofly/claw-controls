"""Root-owned temporary runner, launched by systemd independently of Decky."""
from pathlib import Path
import shutil
from installer import main

if __name__ == '__main__':
    try:
        main()
    finally:
        directory = Path(__file__).resolve().parent
        if directory.parent == Path('/tmp') and directory.name.startswith('claw-controls-maintenance-'):
            shutil.rmtree(directory)
