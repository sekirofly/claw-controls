# MSI Claw A8 Back Buttons & Rumble

English | [简体中文](README.zh-CN.md)

A Decky Loader plugin for **MSI Claw A8 (AMD Ryzen Z2 Extreme / BZ2EM)**. Switch M1/M2 back-button modes and adjust left/right rumble strength. Community software, not an official MSI product. Compatibility with other Claw models is not established.

## Install

Install Decky Loader first. In SteamOS Desktop Mode, open Konsole and run as your normal desktop user:

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash
```

**Save your work and reboot after installation, update or reinstall, before returning to Gaming Mode.** On the tested A8, the embedded controller may not be detected after installation until a normal reboot. The underlying cause has not been established.

**If vibration disappears or controller behavior remains abnormal after reboot, an EC reset may be needed.** The tester reported that an EC reset restored vibration. This is a troubleshooting option, not a mandatory step for every installation or a guaranteed fix. Save work and follow [MSI's official EC reset instructions](https://www.msi.com/support/technical_details/HH_EC_Reset). The plugin never performs an EC reset automatically. After recovery, refresh the plugin and check the actual hardware values.

Requires Python 3, curl, sudo and systemd. The default Decky home is `~/homebrew`; for another location replace the final `bash` with `bash -s -- install --decky-home /absolute/homebrew`. Do not start the default command as root, which would select `/root/homebrew`.

The installer verifies the version-pinned archive and SHA-256 checksum before stopping Decky. It briefly restarts Decky, interrupting other plugins, and attempts rollback if installation fails. A checksum detects corruption; it is not an independent signature. Read [install.sh](install.sh) and [installer.py](installer.py) to inspect the process.

## Controls

- **M1/M2 mode:** click Macro, Combination or Disabled to switch immediately. The mode is shared by both back buttons; individual button mappings are not changed.
- **Rumble:** drag either slider to adjust 0–100%. The display follows immediately; a 200 ms pause saves the latest values automatically.
- Changes are serialized and read back. Continuous slider adjustments are coalesced; closing the panel flushes the last pending value.
- On failure, queued writes stop and actual values are refreshed. Left/right writes are separate, so one side may have changed if the other fails.
- Opening the panel only reads hardware. Settings may persist in the controller and affect Windows. Uninstalling does not restore hardware defaults.

## Uninstall and reinstall

Use the plugin's **clean uninstall** or **clean reinstall current version** buttons. Both require confirmation. If the panel cannot open:

```sh
# Reinstall
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash -s -- reinstall
# Uninstall
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash -s -- uninstall
# Offline uninstall
python3 ~/homebrew/plugins/msi-claw-a8-back-buttons-rumble/installer.py uninstall
```

Cleanup affects only this plugin's `plugins/`, `settings/`, `data/` and `logs/` subdirectories named `msi-claw-a8-back-buttons-rumble`. Other plugins, Decky and hardware settings remain unchanged. Shared Decky ordering/hidden/disabled metadata and the system journal follow Decky's/system policies. A queued maintenance message is not proof of success; verify the result after restart. Failed rollback preserves `.msi-claw-a8-back-buttons-rumble-backup-*` for recovery.

## Compatibility and known limits

The tester reports working rumble and all three modes on MSI Claw A8 after reboot and, following a vibration-loss incident, an EC reset. Reported environment: SteamOS 3.9.5 / Decky 3.3.1. This is device-specific feedback, not broad compatibility certification. Reboot/EC recovery requirements remain known limitations of v1.0.0.

The kernel must provide `mkeys_function`, `rumble_intensity_left` and `rumble_intensity_right` under a unique `/sys/class/hidraw/*/device`. Missing or ambiguous devices are rejected. Root privileges are used for sysfs writes and explicitly requested maintenance. No firmware flashing, HHD installation, InputPlumber modification, USB reset or persistent background service is performed.

## Diagnostics

```sh
journalctl -u msi-claw-a8-back-buttons-rumble-maintenance --no-pager -n 100
sudo bash ~/homebrew/plugins/msi-claw-a8-back-buttons-rumble/diagnostics.sh
```

The diagnostic script only reads local service/device state and recent logs. Nothing is uploaded or changed.

## Development

Node 22, pnpm 11.25.0, Python 3.11+:

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
node --test tests/frontend.cjs
python3 -m unittest discover -s tests -v
python3 scripts/package.py
```

Linux CI validates and packages the release. Tests simulate hardware; they do not replace device testing. TypeScript checks project code while skipping third-party declaration checks due to Decky/React declaration differences.

| Item | Name |
| --- | --- |
| Decky display name | MSI Claw A8 Back Buttons & Rumble |
| Repository / package / directory identifier | `msi-claw-a8-back-buttons-rumble` |
| Release archive | `msi-claw-a8-back-buttons-rumble.zip` |
| Maintenance unit | `msi-claw-a8-back-buttons-rumble-maintenance` |

## Distribution and licenses

Distributed through GitHub Releases; not listed in the Decky store. The [store submission checklist](https://github.com/SteamDeckHomebrew/decky-plugin-database/blob/main/.github/PULL_REQUEST_TEMPLATE/plugin_addition.md), checked November 7, 2026, includes an authorship declaration this AI-assisted project cannot truthfully satisfy.

Project code: MIT. The archive includes SteamDeckHomebrew Team's `@decky/api` 1.1.3 source and LGPL-2.1 license, plus frontend source/configuration for rebuilding with a modified library. UI and React are provided by Decky; third-party dependencies retain their own licenses.
