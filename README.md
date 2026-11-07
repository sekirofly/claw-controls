# MSI Claw A8 Z2E Controller

English | [简体中文](README.zh-CN.md)

> **Reboot required after installation/update on the tested A8.** The user confirmed rumble and all three modes work after reboot on beta.3. Returning to Gaming Mode immediately after installation still loses the controller. The cause is unresolved; beta.4 does not claim to fix it. Save work, install, then reboot normally before using Gaming Mode.

Beta.4 removes Apply buttons: mode buttons switch immediately; rumble sliders update visually immediately and save after a 200 ms pause. Changes are serialized, read back, and errors stop queued writes and refresh actual hardware state. Closing the panel flushes the final pending slider value. No hardware write is made merely by opening the panel. This new interaction has not yet been tested on hardware.



A Decky Loader plugin for **MSI Claw A8 (AMD Ryzen Z2 Extreme, BZ2EM)**: switch the shared M1/M2 back-button mode and adjust left/right rumble strength independently.

Z2E abbreviates Z2 Extreme. MSI identifies the device as [Claw A8 BZ2EM](https://www.msi.com/Handheld/Claw-A8-BZ2EMX/Specification). Compatibility with other Claw models, including the Claw 8 AI+ family, is not established. This is a community project, not an official MSI product.

**Experimental v0.2.0-beta.4 — this release has not been tested on physical hardware.** Display name, plugin identity, package and installation directory now use MSI Claw A8 Z2E Controller. There is no automatic migration from Claw Controls.

**Only users still on the old Claw Controls name must uninstall it first. Beta.3 users can update directly without uninstalling:**

```sh
python3 ~/homebrew/plugins/ClawControls/installer.py uninstall
```

Then run the new installer below. The new installer refuses installation while the old plugin directory remains; it will not silently install a second copy. Uninstallation does not reset hardware settings.

## Install on SteamOS

Install Decky Loader first. Open **Konsole** in Desktop Mode and run as your normal desktop user:

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash
```

Requires Python 3, curl, sudo and systemd. Enter your sudo password if prompted. The default Decky location is `~/homebrew`. For a custom location, replace the final `bash` with `bash -s -- install --decky-home /absolute/homebrew`. Starting as root would incorrectly default to `/root/homebrew`.

The installer downloads a version-pinned release, verifies its SHA-256 checksum and archive structure, then stops Decky to install. The checksum detects corruption; it is not an independent digital signature. Review [install.sh](install.sh) and [installer.py](installer.py) before running if desired.

## Clean uninstall and reinstall

The plugin provides **clean uninstall** and **clean reinstall of the current version** buttons, each with confirmation. Maintenance briefly restarts Decky, temporarily interrupting other plugins. A failed download leaves the installed version untouched. Installation failure triggers a rollback attempt; failed recovery preserves `.msi-claw-a8-z2e-controller-backup-*` directories.

“Scheduled” means the maintenance task was accepted, not that it succeeded. Check the plugin after restart, or inspect the logs below.

If the plugin cannot open, use Konsole:

```sh
# Reinstall this beta version
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash -s -- reinstall
# Uninstall
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash -s -- uninstall
# Offline uninstall of an existing installation
python3 ~/homebrew/plugins/MSIClawA8Z2EController/installer.py uninstall
```

Cleanup removes only `plugins/MSIClawA8Z2EController`, `settings/MSIClawA8Z2EController`, `data/MSIClawA8Z2EController` and `logs/MSIClawA8Z2EController` beneath Decky home. It does not remove Decky, other plugins or modify the read-only OS. Shared Decky ordering/hidden/disabled records remain; restore a hidden or disabled plugin in Decky settings if necessary. System journal entries follow the system retention policy.

**Uninstalling or reinstalling does not reset hardware settings.** Controller settings may persist and affect Windows. Set desired values before uninstalling; the plugin does not guess factory defaults. No HHD installation, InputPlumber changes or persistent background service is required.

## Features and requirements

- Shared M1/M2 mode: `macro`, `combination`, or `disabled`. Individual button mappings are unchanged.
- Independent left/right rumble strength, 0–100%. Slider changes save automatically after a 200 ms pause, followed by read-back verification. Continuous dragging is coalesced; writes never overlap.
- Dynamic discovery of existing kernel attributes under `/sys/class/hidraw/*/device`.
- Missing/ambiguous devices, invalid input and read-back mismatches produce errors.
- Left/right writes are separate: if the second fails, the first may already have applied. Refresh to inspect actual values.

Target environment supplied by the user: MSI Claw A8 BZ2EM, SteamOS 3.9.5 and Decky 3.3.1. Compatibility is not certified. The kernel must expose `mkeys_function`, `rumble_intensity_left` and `rumble_intensity_right`. Root is required for sysfs writes and explicitly requested maintenance. Maintenance is restricted to this plugin's fixed directories, repository and release version.

## Troubleshooting and hardware acceptance

### Installation-time controller disappearance

[DeckyPlumber's README](https://github.com/aarron-lee/DeckyPlumber#quick-install--update) also instructs users to reboot. Its [installer](https://github.com/aarron-lee/DeckyPlumber/blob/main/install.sh) restarts `plugin_loader.service`; it does not implement an InputPlumber restart/re-enumeration recovery sequence. This is not proof that both plugins share the same cause.

We have not established whether the physical device, InputPlumber's virtual controller, or Steam's discovery is failing. The plugin does not automatically restart InputPlumber, change its configuration, or reset USB devices. To investigate, run the read-only diagnostic **while disconnected, before reboot**, and again after recovery:

```sh
sudo bash ~/homebrew/plugins/MSIClawA8Z2EController/diagnostics.sh > ~/msi-controller-before-reboot.txt
# After a normal reboot:
sudo bash ~/homebrew/plugins/MSIClawA8Z2EController/diagnostics.sh > ~/msi-controller-after-reboot.txt
```

The reports contain local service status, enumerated input/USB devices and recent service/kernel logs. Nothing is uploaded and no service or hardware state is changed. These two reports are needed before choosing a targeted no-reboot recovery.

```sh
journalctl -u msi-claw-a8-z2e-controller-maintenance --no-pager -n 100
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
