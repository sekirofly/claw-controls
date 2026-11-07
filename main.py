"""Decky Loader backend for MSI Claw A8 controls.

Uses ONLY the existing Linux hid-msi sysfs controls. No vendor HID commands,
firmware flashes, kernel parameters, controller-service modifications, or daemon.

This is an experimental community-built plugin; test on your own device.
"""

import logging
import os
import shutil
import subprocess
import tempfile
import importlib.util
from pathlib import Path

try:
    import decky
    log = decky.logger
except ImportError:  # allows local, dependency-free tests
    log = logging.getLogger("ClawControls")

HIDRAW_CLASS = Path("/sys/class/hidraw")
MODES = ("macro", "combination", "disabled")
ATTRS = ("mkeys_function", "rumble_intensity_left", "rumble_intensity_right")


def _find_device():
    """Discover the sysfs path dynamically; hidraw0 can change after reboot."""
    devices = []
    for candidate in sorted(HIDRAW_CLASS.glob("hidraw*/device")):
        if not all((candidate / attr).is_file() for attr in ATTRS):
            continue
        real = candidate.resolve()
        if real not in devices:
            devices.append(real)
    if not devices:
        raise RuntimeError("Claw HID 控制接口未找到。请确认 MSI Claw 驱动已加载。")
    if len(devices) != 1:
        raise RuntimeError("发现多个候选 Claw 设备，为避免误操作已停止写入。")
    return devices[0]


def _read_raw(device):
    mode = (device / "mkeys_function").read_text(encoding="ascii").strip()
    left = int((device / "rumble_intensity_left").read_text(encoding="ascii").strip())
    right = int((device / "rumble_intensity_right").read_text(encoding="ascii").strip())
    if mode not in MODES:
        raise RuntimeError(f"无法识别背键模式：{mode}")
    if not (0 <= left <= 100 and 0 <= right <= 100):
        raise RuntimeError("驱动返回的震动范围异常。")
    return {"ok": True, "device": str(device), "mode": mode, "left": left, "right": right}


def _check_root():
    if os.geteuid() != 0:
        raise PermissionError("需要 root 权限；请检查 Decky 插件的 root 标志。")


def _write(device, attr, value):
    # attr comes only from static constants in this module.
    with (device / attr).open("w", encoding="ascii") as output:
        output.write(f"{value}\n")


def _error(exc):
    log.warning("Claw Controls operation failed: %s", exc)
    return {"ok": False, "error": str(exc)}


class Plugin:
    async def _main(self):
        log.info("Claw Controls 0.2.0-beta.1 loaded. euid=%s", os.geteuid())

    async def maintenance(self, action: str):
        """Run outside the Decky service so uninstall/reinstall can stop Decky safely."""
        try:
            _check_root()
            if action not in ('uninstall', 'reinstall'):
                raise ValueError('Unsupported maintenance action')
            plugin_dir = Path(__file__).resolve().parent
            spec = importlib.util.spec_from_file_location('claw_controls_installer', plugin_dir / 'installer.py')
            installer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(installer)
            home = installer.validate_home(os.environ['DECKY_HOME'])
            if plugin_dir != home / 'plugins' / 'ClawControls':
                raise ValueError('Please use the terminal installer for this nonstandard installation')
            directory = Path(tempfile.mkdtemp(prefix='claw-controls-maintenance-'))
            try:
                for name in ('installer.py', 'maintenance_runner.py'):
                    shutil.copyfile(plugin_dir / name, directory / name)
                result = subprocess.run([
                    'systemd-run', '--unit=claw-controls-maintenance', '--on-active=3s',
                    '--collect', '/usr/bin/python3', str(directory / 'maintenance_runner.py'),
                    action, '--decky-home', str(home)
                ], capture_output=True, text=True, timeout=15)
                if result.returncode:
                    raise RuntimeError(result.stderr.strip())
            except Exception:
                shutil.rmtree(directory)
                raise
            return {'ok': True, 'message': '维护任务已安排。Decky 将短暂重启；失败详情见 journalctl -u claw-controls-maintenance。'}
        except Exception as exc:
            return _error(exc)

    async def _unload(self):
        # Never reset controller state on plugin unload.
        pass

    async def _uninstall(self):
        # Hardware state is intentionally left unchanged.
        pass

    async def get_state(self):
        try:
            return _read_raw(_find_device())
        except (OSError, ValueError, RuntimeError) as exc:
            return _error(exc)

    async def set_mode(self, mode: str):
        try:
            _check_root()
            if type(mode) is not str or mode not in MODES:
                raise ValueError("无效模式，只允许 macro / combination / disabled")
            device = _find_device()
            old = _read_raw(device)
            if old["mode"] != mode:
                _write(device, "mkeys_function", mode)
            new = _read_raw(device)
            if new["mode"] != mode:
                raise RuntimeError("背键模式写入后读取不匹配。")
            return new
        except (OSError, ValueError, RuntimeError, PermissionError) as exc:
            return _error(exc)

    async def set_rumble(self, left: int, right: int):
        try:
            _check_root()
            # bool is an int subclass; reject it, as well as strings/floats.
            if type(left) is not int or type(right) is not int:
                raise ValueError("震动强度必须是整数。")
            if not (0 <= left <= 100 and 0 <= right <= 100):
                raise ValueError("震动强度必须在 0–100 之间。")
            device = _find_device()
            old = _read_raw(device)
            # Only write on explicit Apply and only when values differ.
            if old["left"] != left:
                _write(device, "rumble_intensity_left", left)
            if old["right"] != right:
                _write(device, "rumble_intensity_right", right)
            new = _read_raw(device)
            if new["left"] != left or new["right"] != right:
                raise RuntimeError("震动强度写入后读取不匹配。")
            return new
        except (OSError, ValueError, RuntimeError, PermissionError) as exc:
            return _error(exc)
