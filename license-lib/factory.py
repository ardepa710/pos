from __future__ import annotations

from .license import LicenseManager, LicenseMode, NoLicenseManager, OfflineKeyManager, OnlineActivationManager


def create_license_manager(
    mode: str | LicenseMode,
    public_key_pem: str = "",
    activation_server: str = "",
    grace_state_path: str = ".license_grace",
) -> LicenseManager:
    """
    Factory that returns the correct LicenseManager based on mode.

    Args:
        mode: "none" | "offline_key" | "online_activation"
        public_key_pem: Ed25519 public key PEM (required for offline_key mode)
        activation_server: URL of activation server (required for online_activation mode)
        grace_state_path: Path to store grace period state file

    Returns:
        LicenseManager instance
    """
    license_mode = LicenseMode(mode) if isinstance(mode, str) else mode

    if license_mode == LicenseMode.NONE:
        return NoLicenseManager()

    elif license_mode == LicenseMode.OFFLINE_KEY:
        if not public_key_pem:
            raise ValueError("public_key_pem is required for offline_key license mode")
        return OfflineKeyManager(public_key_pem=public_key_pem)

    elif license_mode == LicenseMode.ONLINE_ACTIVATION:
        if not activation_server:
            raise ValueError("activation_server is required for online_activation mode")
        return OnlineActivationManager(
            activation_server=activation_server,
            grace_state_path=grace_state_path,
        )

    else:
        raise ValueError(f"Unknown license mode: {mode}")
