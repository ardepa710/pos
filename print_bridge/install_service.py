"""Install or uninstall Print Bridge as a persistent background service.

Supports Windows, macOS, and Linux (including Raspberry Pi).

Usage:
    python install_service.py install   # install + start (all platforms)
    python install_service.py remove    # stop + uninstall
    python install_service.py status    # show current status
    python install_service.py logs      # show recent log output

Platform behaviour:
    Windows     — installs via nssm (preferred) or sc.exe fallback
    macOS       — installs a launchd LaunchAgent plist
    Linux / Pi  — installs a systemd user service (no root required)
"""
from __future__ import annotations

import os
import platform
import subprocess
import sys
import textwrap
from pathlib import Path

SERVICE_NAME = "POSPrintBridge"
SERVICE_DISPLAY = "POS Print Bridge"
SERVICE_DESCRIPTION = "Provides local printer access for the POS system on port 9100."

PLIST_LABEL = "com.pos.printbridge"
SYSTEMD_UNIT = "pos-print-bridge.service"


# ─── Shared helpers ──────────────────────────────────────────────────────────

def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def _python_exe() -> str:
    return sys.executable


def _main_py() -> Path:
    return Path(__file__).parent / "main.py"


def _log_file() -> Path:
    return Path(__file__).parent / "bridge.log"


# ─── Windows ─────────────────────────────────────────────────────────────────

def _find_nssm() -> str | None:
    """Return path to nssm.exe if installed, else None."""
    result = _run(["where", "nssm"], check=False)
    if result.returncode == 0:
        return result.stdout.strip().splitlines()[0]
    return None


def _install_with_nssm(nssm: str, python: str, main: str) -> None:
    log_path = str(_log_file())
    print(f"Installing service with nssm: {nssm}")
    _run([nssm, "install", SERVICE_NAME, python, main])
    _run([nssm, "set", SERVICE_NAME, "DisplayName", SERVICE_DISPLAY])
    _run([nssm, "set", SERVICE_NAME, "Description", SERVICE_DESCRIPTION])
    _run([nssm, "set", SERVICE_NAME, "Start", "SERVICE_AUTO_START"])
    _run([nssm, "set", SERVICE_NAME, "AppStdout", log_path])
    _run([nssm, "set", SERVICE_NAME, "AppStderr", log_path])
    _run([nssm, "start", SERVICE_NAME])
    print(f"Service '{SERVICE_NAME}' installed and started via nssm.")
    print("It will start automatically on Windows boot.")


def _install_with_sc(python: str, main: str) -> None:
    print("nssm not found — using sc.exe (no log capture).")
    print("For better service control, install nssm: https://nssm.cc/download")
    binpath = f'"{python}" "{main}"'
    _run([
        "sc", "create", SERVICE_NAME,
        "binPath=", binpath,
        "DisplayName=", SERVICE_DISPLAY,
        "start=", "auto",
    ])
    _run(["sc", "description", SERVICE_NAME, SERVICE_DESCRIPTION])
    _run(["sc", "start", SERVICE_NAME])
    print(f"Service '{SERVICE_NAME}' installed and started via sc.exe.")


def _install_windows() -> None:
    try:
        import win32serviceutil  # type: ignore[import]  # noqa: F401
    except ImportError:
        print("ERROR: pywin32 is required on Windows. Run: pip install pywin32")
        sys.exit(1)

    python = _python_exe()
    main = str(_main_py())
    nssm = _find_nssm()
    if nssm:
        _install_with_nssm(nssm, python, main)
    else:
        _install_with_sc(python, main)


def _remove_windows() -> None:
    print(f"Stopping and removing service '{SERVICE_NAME}'...")
    _run(["sc", "stop", SERVICE_NAME], check=False)
    _run(["sc", "delete", SERVICE_NAME], check=False)
    print("Done.")


def _status_windows() -> None:
    result = _run(["sc", "query", SERVICE_NAME], check=False)
    if result.returncode != 0:
        print(f"Service '{SERVICE_NAME}' is NOT installed.")
    else:
        for line in result.stdout.splitlines():
            if "STATE" in line or "NAME" in line:
                print(line.strip())


def _logs_windows() -> None:
    log = _log_file()
    if not log.exists():
        print(f"No log file found at {log}")
        return
    lines = log.read_text(encoding="utf-8", errors="replace").splitlines()
    print(f"--- Last 50 lines of {log} ---")
    for line in lines[-50:]:
        print(line)


# ─── macOS (launchd) ─────────────────────────────────────────────────────────

def _plist_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{PLIST_LABEL}.plist"


def _macos_log_path() -> Path:
    return Path.home() / "Library" / "Logs" / "pos-print-bridge.log"


def _install_macos() -> None:
    python = _python_exe()
    main = str(_main_py())
    log_path = str(_macos_log_path())
    plist = _plist_path()

    plist.parent.mkdir(parents=True, exist_ok=True)

    plist_content = textwrap.dedent(f"""\
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
            "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
            <key>Label</key>
            <string>{PLIST_LABEL}</string>
            <key>ProgramArguments</key>
            <array>
                <string>{python}</string>
                <string>{main}</string>
            </array>
            <key>RunAtLoad</key>
            <true/>
            <key>KeepAlive</key>
            <true/>
            <key>StandardOutPath</key>
            <string>{log_path}</string>
            <key>StandardErrorPath</key>
            <string>{log_path}</string>
        </dict>
        </plist>
    """)

    plist.write_text(plist_content, encoding="utf-8")
    print(f"Plist written to {plist}")

    _run(["launchctl", "load", "-w", str(plist)])
    print(f"LaunchAgent '{PLIST_LABEL}' loaded and started.")
    print("It will start automatically on every macOS login.")


def _remove_macos() -> None:
    plist = _plist_path()
    if plist.exists():
        _run(["launchctl", "unload", "-w", str(plist)], check=False)
        plist.unlink()
        print(f"LaunchAgent '{PLIST_LABEL}' removed.")
    else:
        print("LaunchAgent plist not found — nothing to remove.")


def _status_macos() -> None:
    result = _run(["launchctl", "list", PLIST_LABEL], check=False)
    if result.returncode != 0:
        print(f"LaunchAgent '{PLIST_LABEL}' is NOT loaded.")
    else:
        print(result.stdout.strip())


def _logs_macos() -> None:
    log = _macos_log_path()
    if not log.exists():
        print(f"No log file found at {log}")
        return
    result = _run(["tail", "-n", "50", str(log)], check=False)
    print(f"--- Last 50 lines of {log} ---")
    print(result.stdout)


# ─── Linux / Raspberry Pi (systemd user service) ─────────────────────────────

def _systemd_unit_path() -> Path:
    return Path.home() / ".config" / "systemd" / "user" / SYSTEMD_UNIT


def _linux_log_path() -> Path:
    """journald stores logs — this path is only used if redirected to a file."""
    return Path(__file__).parent / "bridge.log"


def _install_linux() -> None:
    python = _python_exe()
    main = str(_main_py())
    unit_path = _systemd_unit_path()
    unit_path.parent.mkdir(parents=True, exist_ok=True)

    unit_content = textwrap.dedent(f"""\
        [Unit]
        Description={SERVICE_DESCRIPTION}
        After=network.target

        [Service]
        ExecStart={python} {main}
        Restart=always
        RestartSec=5
        StandardOutput=journal
        StandardError=journal

        [Install]
        WantedBy=default.target
    """)

    unit_path.write_text(unit_content, encoding="utf-8")
    print(f"Unit file written to {unit_path}")

    _run(["systemctl", "--user", "daemon-reload"])
    _run(["systemctl", "--user", "enable", SYSTEMD_UNIT])
    _run(["systemctl", "--user", "start", SYSTEMD_UNIT])

    # Enable linger so the service runs without the user being logged in.
    username = os.environ.get("USER") or os.environ.get("LOGNAME") or ""
    if username:
        result = _run(["loginctl", "enable-linger", username], check=False)
        if result.returncode == 0:
            print(f"loginctl linger enabled for '{username}' (service runs without login).")
        else:
            print(
                f"WARNING: Could not enable linger for '{username}'. "
                "The service may not start at boot without an active login session. "
                "Run manually: sudo loginctl enable-linger "
                + username
            )

    print(f"Systemd user service '{SYSTEMD_UNIT}' installed and started.")
    print("It will start automatically on boot (no root required).")


def _remove_linux() -> None:
    _run(["systemctl", "--user", "stop", SYSTEMD_UNIT], check=False)
    _run(["systemctl", "--user", "disable", SYSTEMD_UNIT], check=False)
    unit_path = _systemd_unit_path()
    if unit_path.exists():
        unit_path.unlink()
        print(f"Unit file removed: {unit_path}")
    _run(["systemctl", "--user", "daemon-reload"], check=False)
    print(f"Service '{SYSTEMD_UNIT}' removed.")


def _status_linux() -> None:
    result = _run(["systemctl", "--user", "status", SYSTEMD_UNIT], check=False)
    print(result.stdout.strip() or result.stderr.strip())


def _logs_linux() -> None:
    result = _run(
        ["journalctl", "--user", "-u", SYSTEMD_UNIT, "-n", "50", "--no-pager"],
        check=False,
    )
    print(result.stdout.strip() or result.stderr.strip())


# ─── Dispatcher ──────────────────────────────────────────────────────────────

def install() -> None:
    if sys.platform == "win32":
        _install_windows()
    elif sys.platform == "darwin":
        _install_macos()
    else:
        _install_linux()


def remove() -> None:
    if sys.platform == "win32":
        _remove_windows()
    elif sys.platform == "darwin":
        _remove_macos()
    else:
        _remove_linux()


def status() -> None:
    if sys.platform == "win32":
        _status_windows()
    elif sys.platform == "darwin":
        _status_macos()
    else:
        _status_linux()


def logs() -> None:
    if sys.platform == "win32":
        _logs_windows()
    elif sys.platform == "darwin":
        _logs_macos()
    else:
        _logs_linux()


# ─── Entry point ─────────────────────────────────────────────────────────────

COMMANDS = ("install", "remove", "status", "logs")

if __name__ == "__main__":
    detected = platform.system()
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        print(f"Detected platform: {detected}")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "install":
        install()
    elif cmd == "remove":
        remove()
    elif cmd == "status":
        status()
    elif cmd == "logs":
        logs()
