"""
POS License Manager — supports 3 modes: none, offline_key, online_activation.
"""
from __future__ import annotations

import json
import time
import hmac
import hashlib
import base64
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, date
from enum import Enum
from typing import Any


class LicenseMode(str, Enum):
    NONE = "none"
    OFFLINE_KEY = "offline_key"
    ONLINE_ACTIVATION = "online_activation"


@dataclass
class LicenseResult:
    valid: bool
    mode: LicenseMode
    expires_at: date | None = None
    business_name: str | None = None
    max_users: int | None = None
    features: list[str] | None = None
    error: str | None = None
    grace_days_remaining: int | None = None

    @property
    def is_in_grace_period(self) -> bool:
        return self.grace_days_remaining is not None and self.grace_days_remaining > 0


class LicenseManager(ABC):
    """Abstract base for all license managers."""

    @abstractmethod
    async def verify(self, license_key: str) -> LicenseResult:
        """Verify the provided license key."""
        ...

    @abstractmethod
    async def is_valid(self) -> bool:
        """Quick check — returns False only if license is definitively invalid."""
        ...


class NoLicenseManager(LicenseManager):
    """No DRM — always valid. For self-hosted/open installs."""

    async def verify(self, license_key: str) -> LicenseResult:
        return LicenseResult(
            valid=True,
            mode=LicenseMode.NONE,
            business_name="Unrestricted",
            features=["all"],
        )

    async def is_valid(self) -> bool:
        return True


class OfflineKeyManager(LicenseManager):
    """
    Ed25519-signed offline license key.
    Key format (base64url): {payload_json}|{ed25519_signature_hex}
    Payload: {"business_name": str, "expires_at": "YYYY-MM-DD", "max_users": int, "features": [...]}
    """

    def __init__(self, public_key_pem: str) -> None:
        self._public_key_pem = public_key_pem

    def _parse_and_verify(self, license_key: str) -> dict[str, Any]:
        try:
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
            from cryptography.hazmat.primitives import serialization
            from cryptography.exceptions import InvalidSignature

            decoded = base64.urlsafe_b64decode(license_key + "==").decode()
            payload_str, sig_hex = decoded.rsplit("|", 1)

            public_key = serialization.load_pem_public_key(
                self._public_key_pem.encode()
            )
            assert isinstance(public_key, Ed25519PublicKey)

            signature = bytes.fromhex(sig_hex)
            try:
                public_key.verify(signature, payload_str.encode())
            except InvalidSignature:
                raise ValueError("Invalid license signature")

            return json.loads(payload_str)

        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            raise ValueError(f"Invalid license key: {exc}") from exc

    async def verify(self, license_key: str) -> LicenseResult:
        try:
            payload = self._parse_and_verify(license_key)
            expires_at = date.fromisoformat(payload["expires_at"])
            if expires_at < date.today():
                return LicenseResult(
                    valid=False,
                    mode=LicenseMode.OFFLINE_KEY,
                    error="License expired",
                    expires_at=expires_at,
                )
            return LicenseResult(
                valid=True,
                mode=LicenseMode.OFFLINE_KEY,
                expires_at=expires_at,
                business_name=payload.get("business_name"),
                max_users=payload.get("max_users"),
                features=payload.get("features", []),
            )
        except ValueError as exc:
            return LicenseResult(valid=False, mode=LicenseMode.OFFLINE_KEY, error=str(exc))

    async def is_valid(self) -> bool:
        return True  # caller must call verify() to check expiry


class OnlineActivationManager(LicenseManager):
    """
    Online license verification with 7-day grace period.
    Checks activation server daily. Allows 7 days offline before blocking.
    """

    GRACE_PERIOD_DAYS = 7
    CHECK_INTERVAL_SECONDS = 86400  # 24 hours

    def __init__(self, activation_server: str, grace_state_path: str = ".license_grace") -> None:
        self._server = activation_server.rstrip("/")
        self._grace_path = grace_state_path
        self._last_check: float = 0
        self._cached_result: LicenseResult | None = None

    def _load_grace_state(self) -> dict[str, Any]:
        try:
            with open(self._grace_path) as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_grace_state(self, state: dict[str, Any]) -> None:
        try:
            with open(self._grace_path, "w") as f:
                json.dump(state, f)
        except OSError:
            pass

    async def verify(self, license_key: str) -> LicenseResult:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"{self._server}/activate",
                    json={"license_key": license_key},
                )
                if response.status_code == 200:
                    data = response.json()
                    result = LicenseResult(
                        valid=True,
                        mode=LicenseMode.ONLINE_ACTIVATION,
                        expires_at=date.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
                        business_name=data.get("business_name"),
                        max_users=data.get("max_users"),
                        features=data.get("features", []),
                    )
                    self._save_grace_state({
                        "last_valid_check": time.time(),
                        "license_key": license_key,
                    })
                    self._cached_result = result
                    self._last_check = time.time()
                    return result
                else:
                    return LicenseResult(
                        valid=False,
                        mode=LicenseMode.ONLINE_ACTIVATION,
                        error=f"Activation rejected: {response.status_code}",
                    )
        except httpx.RequestError:
            # Offline — check grace period
            return self._check_grace_period(license_key)

    def _check_grace_period(self, license_key: str) -> LicenseResult:
        state = self._load_grace_state()
        last_valid = state.get("last_valid_check", 0)
        if last_valid == 0:
            return LicenseResult(
                valid=False,
                mode=LicenseMode.ONLINE_ACTIVATION,
                error="No previous successful activation found",
            )

        days_offline = (time.time() - last_valid) / 86400
        grace_remaining = max(0, self.GRACE_PERIOD_DAYS - int(days_offline))

        if grace_remaining > 0:
            return LicenseResult(
                valid=True,
                mode=LicenseMode.ONLINE_ACTIVATION,
                error=None,
                grace_days_remaining=grace_remaining,
            )
        else:
            return LicenseResult(
                valid=False,
                mode=LicenseMode.ONLINE_ACTIVATION,
                error=f"Grace period expired ({self.GRACE_PERIOD_DAYS} days offline)",
                grace_days_remaining=0,
            )

    async def is_valid(self) -> bool:
        if self._cached_result and (time.time() - self._last_check) < self.CHECK_INTERVAL_SECONDS:
            return self._cached_result.valid
        return True  # assume valid until next check
