# MSI Claw A8 Z2E — Back Buttons & Rumble

English | [简体中文](README.zh-CN.md)

A Decky Loader plugin for **MSI Claw A8 (AMD Ryzen Z2 Extreme, BZ2EM)**: switch the shared M1/M2 back-button mode and adjust left/right rumble strength independently.

Z2E abbreviates Z2 Extreme. MSI identifies the device as [Claw A8 BZ2EM](https://www.msi.com/Handheld/Claw-A8-BZ2EMX/Specification). Compatibility with other Claw models, including the Claw 8 AI+ family, is not established. This is a community project, not an official MSI product.

**Experimental v0.2.0-beta.1 — not yet tested on physical hardware.** The existing release appears in Decky as **Claw Controls**; its installation identity is retained for compatibility.

## Install on SteamOS

Install Decky Loader first. Open **Konsole** in Desktop Mode and run as your normal desktop user:

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-decky/v0.2.0-beta.1/install.sh | bash
```

Requires Python 3, curl, sudo and systemd. Enter your sudo password if prompted. The default Decky location is `~/homebrew`. For a custom location, replace the final `bash` with `bash -s -- install --decky-home /absolute/homebrew`. Starting as root would incorrectly default to `/root/homebrew`.

The installer downloads a version-pinned release, verifies its SHA-256 checksum and archive structure, then stops Decky to install. The checksum detects corruption; it is not an independent digital signature. Review [install.sh](install.sh) and [installer.py](installer.py) before running if desired.

## Clean uninstall and reinstall

The plugin provides **clean uninstall** and **clean reinstall of the current version** buttons, each with confirmation. Maintenance briefly restarts Decky, temporarily interrupting other plugins. A failed download leaves the installed version untouched. Installation failure triggers a rollback attempt; failed recovery preserves `.claw-controls-backup-*` directories.

“Scheduled” means the maintenance task was accepted, not that it succeeded. Check the plugin after restart, or inspect the logs below.

If the plugin cannot open, use Konsole:

```sh
# Reinstall this beta version
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-decky/v0.2.0-beta.1/install.sh | bash -s -- reinstall
# Uninstall
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-decky/v0.2.0-beta.1/install.sh | bash -s -- uninstall
# Offline uninstall of an existing installation
python3 ~/homebrew/plugins/ClawControls/installer.py uninstall
```

Cleanup removes only `plugins/ClawControls`, `settings/ClawControls`, `data/ClawControls` and `logs/ClawControls` beneath Decky home. It does not remove Decky, other plugins or modify the read-only OS. Shared Decky ordering/hidden/disabled records remain; restore a hidden or disabled plugin in Decky settings if necessary. System journal entries follow the system retention policy.

**Uninstalling or reinstalling does not reset hardware settings.** Controller settings may persist and affect Windows. Apply desired values explicitly before uninstalling; the plugin does not guess factory defaults. No HHD installation, InputPlumber changes or persistent background service is required.

## Features and requirements

- Shared M1/M2 mode: `macro`, `combination`, or `disabled`. Individual button mappings are unchanged.
- Independent left/right rumble strength, 0–100%. Writes happen only after Apply, followed by read-back verification.
- Dynamic discovery of existing kernel attributes under `/sys/class/hidraw/*/device`.
- Missing/ambiguous devices, invalid input and read-back mismatches produce errors.
- Left/right writes are separate: if the second fails, the first may already have applied. Refresh to inspect actual values.

Target environment supplied by the user: MSI Claw A8 BZ2EM, SteamOS 3.9.5 and Decky 3.3.1. Compatibility is not certified. The kernel must expose `mkeys_function`, `rumble_intensity_left` and `rumble_intensity_right`. Root is required for sysfs writes and explicitly requested maintenance. Maintenance is restricted to this plugin's fixed directories, repository and release version.

## Troubleshooting and hardware acceptance

```sh
journalctl -u claw-controls-maintenance --no-pager -n 100
systemctl status plugin_loader.service
```

Record the original hardware values first. Test read-only refresh, mode/rumble changes and their physical effects, reboot, clean reinstall, then uninstall while verifying other plugins remain intact. Automated tests do not replace device testing.

## Build and release

Node 22, pnpm 11.25.0 and Python 3.11+:

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
python3 -m unittest discover -s tests -v
python3 scripts/package.py
```

TypeScript checks project code but skips third-party declaration checking because of Decky/React declaration differences. Linux CI builds, tests and packages the ZIP and checksum. Synchronize versions in package.json, plugin.json, installer.py, install.sh and documentation before a new release. Attach the CI archive and checksum together. Releases without device acceptance remain prereleases.

## Decky store status

Not submitted or listed. The [official submission checklist](https://github.com/SteamDeckHomebrew/decky-plugin-database/blob/main/.github/PULL_REQUEST_TEMPLATE/plugin_addition.md), checked November 7, 2026, requires declaring that generative AI did not write most submitted code. This AI-assisted project cannot truthfully make that declaration. Channel compatibility and third-party testing requirements also remain. Distribution currently uses GitHub Releases.

## Origin and licenses

Based on the user-supplied `ClawControls_Decky_v0.1.0.zip`. The frontend now uses official `@decky/api` and `@decky/ui` builds. Project code is MIT. The release includes SteamDeckHomebrew Team's `@decky/api` 1.1.3 source and LGPL-2.1 license, plus frontend source/configuration for rebuilding with a modified library. UI and React are supplied by Decky; dependencies retain their own licenses.
