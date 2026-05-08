# POS Print Bridge

Print Bridge is a small HTTP daemon (FastAPI on port 9100) that runs **on the
host machine** — not inside Docker — so the POS backend can reach local USB
and network thermal printers. The backend sends raw ESC/POS bytes over HTTP;
Print Bridge forwards them to the printer using the best available method for
the current platform (Windows spooler, CUPS, or direct USB device on
Raspberry Pi).

iOS and Android devices connect to the POS web app through the browser and
never need to run Print Bridge themselves — print jobs travel:

```
Browser (iOS / Android / Desktop)
        │  HTTPS
        ▼
POS Backend  (Docker container)
        │  HTTP → host.docker.internal:9100
        ▼
Print Bridge  (host process — this daemon)
        │  Win32 spooler / CUPS / /dev/usb/lp0
        ▼
Thermal Printer
```

---

## Quick Start

### Windows

```bat
start.bat
```

Requires Python 3.10+ in PATH. The script installs dependencies and starts
the daemon in the foreground. Keep the window open while using POS.

### macOS

```bash
chmod +x start.sh   # only needed once
./start.sh
```

Requires Python 3 and CUPS (pre-installed on macOS). Keep the terminal open.

### Raspberry Pi / Linux

```bash
chmod +x start.sh   # only needed once
./start.sh
```

Requires Python 3. CUPS is optional — if not installed, the bridge writes raw
bytes directly to `/dev/usb/lp0` (or whichever `/dev/usb/lpN` is present).

If you see a permission error on `/dev/usb/lp0`, add yourself to the `lp`
group:

```bash
sudo usermod -a -G lp $(whoami)
newgrp lp
```

---

## Install as a Background Service (auto-start on boot)

Run the same command on any platform:

```bash
python install_service.py install
```

### Windows (nssm / sc.exe)

nssm is preferred — download from <https://nssm.cc/download> and place
`nssm.exe` somewhere in your PATH. If nssm is not found, `sc.exe` is used as
a fallback (no log capture). Logs are written to `print_bridge/bridge.log`.

### macOS (launchd)

A LaunchAgent plist is written to
`~/Library/LaunchAgents/com.pos.printbridge.plist` and loaded immediately.
The service starts at every login.
Logs go to `~/Library/Logs/pos-print-bridge.log`.

### Raspberry Pi / Linux (systemd user service)

A user-level systemd unit is written to
`~/.config/systemd/user/pos-print-bridge.service` and enabled. No root
required. `loginctl enable-linger` is also called so the service starts at
boot even without an active login session.
Logs: `journalctl --user -u pos-print-bridge -f`

---

## Service Management

| Action           | Command                             |
| ---------------- | ----------------------------------- |
| Install + start  | `python install_service.py install` |
| Stop + remove    | `python install_service.py remove`  |
| Show status      | `python install_service.py status`  |
| Show recent logs | `python install_service.py logs`    |

---

## iOS / Android

No installation needed. Open the POS web app URL in Safari or Chrome and print
as normal. The browser sends the job to the backend, which forwards it to the
host Print Bridge. The mobile device never communicates with port 9100 directly.

---

## API Endpoints

| Method | Path        | Description                                  |
| ------ | ----------- | -------------------------------------------- |
| GET    | `/health`   | Returns `{"status":"ok"}` — used by backend  |
| GET    | `/status`   | Platform capabilities (CUPS, win32, USB raw) |
| GET    | `/printers` | Lists available printers on this machine     |
| POST   | `/print`    | Sends ESC/POS bytes to a printer             |

`POST /print` body:

```json
{
  "printer_name": "POS-80",
  "data_hex": "1b401b21...",
  "encoding": "hex"
}
```

---

## Backend Configuration

In `.env` (or `docker-compose.yml`):

```
PRINT_BRIDGE_ENABLED=true
PRINT_BRIDGE_URL=http://host.docker.internal:9100   # Windows / macOS
PRINT_BRIDGE_URL=http://172.17.0.1:9100             # Linux (see below)
```

---

## Troubleshooting

### USB permission denied on Raspberry Pi / Linux

```
403 Permission denied on /dev/usb/lp0
```

Add your user to the `lp` group and start a new shell session:

```bash
sudo usermod -a -G lp $(whoami)
newgrp lp
```

### CUPS not installed on Raspberry Pi

The bridge automatically falls back to `/dev/usb/lp0` when `lp` fails. No
action needed as long as the printer is connected via USB and you are in the
`lp` group. Check the detected device:

```bash
curl http://localhost:9100/status
```

### Port 9100 already in use

```bash
# Linux / macOS
lsof -i :9100

# Windows
netstat -ano | findstr :9100
```

### Backend cannot reach Print Bridge on Linux

`host.docker.internal` may not resolve inside Docker on Linux. Use the Docker
bridge gateway instead (typically `172.17.0.1`):

```bash
# Check from inside the container
ip route | grep default
```

Then set `PRINT_BRIDGE_URL=http://172.17.0.1:9100` in your `.env`.

### Service does not start on boot (Linux)

Confirm linger is enabled:

```bash
loginctl show-user $(whoami) | grep Linger
# Should show: Linger=yes
```

If it shows `Linger=no`:

```bash
sudo loginctl enable-linger $(whoami)
```
