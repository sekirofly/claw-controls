#!/usr/bin/env bash
# Read-only, local diagnostics. Does not restart services or write hardware.
set -u
echo '=== Service state ==='
systemctl show plugin_loader.service inputplumber.service \
  --property=Id,ActiveState,SubState,MainPID,Result --no-pager
echo '=== Input devices ==='
cat /proc/bus/input/devices
echo '=== USB device enumeration ==='
lsusb
echo '=== Recent controller/service errors (may require sudo) ==='
journalctl -b -u inputplumber.service -u plugin_loader.service --no-pager -n 120
echo '=== Recent kernel HID/USB/input messages (may require sudo) ==='
journalctl -b -k --no-pager -n 500 | grep -Ei 'hid|usb|input|msi|claw' | tail -n 100
