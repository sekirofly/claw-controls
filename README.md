# Claw Controls — Decky Plugin (experimental v0.1.0)

A minimal Decky Loader plugin specifically for the MSI Claw A8 BZ2EM family.

## Controls

- Read and change M1/M2 function: `macro`, `combination`, `disabled`.
- Independently adjust left and right rumble intensity in the range 0–100.
- Read current hardware values after switching modes in Windows, pressing LB + View, or resetting the EC.

Changes are **not automatically applied at startup**. Move either slider then choose Apply to avoid sending many persistent writes while dragging. This does not change individual M1/M2 key mapping, flash firmware, restart InputPlumber, modify the bootloader, install packages or modify the immutable SteamOS root filesystem.

The backend has root privileges (Decky manifest `"flags":["root"]`) solely to write three existing kernel sysfs attributes. It discovers the Claw device dynamically instead of assuming `hidraw0`.

## Installation

Decky Loader 3.x must already be installed. Two possible methods:

1. **Decky UI:** Try `Decky → Settings → Developer → Install Plugin from ZIP`, and choose the downloaded ZIP. Availability varies by Decky version.
2. **Manual:** extract the ZIP into `~/homebrew/plugins/ClawControls/` so `main.py`, `plugin.json`, and `dist/index.js` are directly inside that directory. Then run:

   ```sh
   sudo chown -R root:root ~/homebrew/plugins/ClawControls
   sudo systemctl restart plugin_loader.service
   ```

If the UI cannot show the new plugin, exit and reenter Gaming Mode.

## Remove

```sh
sudo rm -rf -- "$HOME/homebrew/plugins/ClawControls"
sudo systemctl restart plugin_loader.service
```

Removing the plugin **does not reset the persistent hardware settings**. To restore defaults, set them with the plugin first, e.g. rumble 100/100 and mode macro, then uninstall. M1/M2 modes can also be switched on Windows with LB + View held for ~2 seconds, but that shortcut may toggle between modes and has no visual feedback.

## Caution

- Third-party experimental plugin; **built and locally code-tested, but not yet tested on a physical Claw A8**.
- Changes may affect both SteamOS and Windows since they are controller hardware values.
- Some SteamOS updates may change the sysfs interface or Decky plugin API; the plugin will refuse to write if it cannot discover exactly one supported device.
- Only supported on kernels exposing `mkeys_function`, `rumble_intensity_left`, `rumble_intensity_right`.
- Reads the controller's current values; does not track per-game preferences.
