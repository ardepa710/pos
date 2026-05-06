import pytest
from datetime import date, timedelta
from license_lib import create_license_manager, LicenseMode


@pytest.mark.asyncio
async def test_no_license_always_valid() -> None:
    mgr = create_license_manager("none")
    result = await mgr.verify("any_key")
    assert result.valid is True
    assert result.mode == LicenseMode.NONE
    assert await mgr.is_valid() is True


@pytest.mark.asyncio
async def test_offline_key_valid() -> None:
    from license_lib.keygen import generate_key_pair, sign_license
    from license_lib import OfflineKeyManager

    priv, pub = generate_key_pair()
    expires = date.today() + timedelta(days=365)
    key = sign_license(priv, "Test Business", expires, max_users=5)

    mgr = OfflineKeyManager(public_key_pem=pub)
    result = await mgr.verify(key)
    assert result.valid is True
    assert result.business_name == "Test Business"
    assert result.expires_at == expires


@pytest.mark.asyncio
async def test_offline_key_expired() -> None:
    from license_lib.keygen import generate_key_pair, sign_license
    from license_lib import OfflineKeyManager

    priv, pub = generate_key_pair()
    expired = date.today() - timedelta(days=1)
    key = sign_license(priv, "Test Business", expired)

    mgr = OfflineKeyManager(public_key_pem=pub)
    result = await mgr.verify(key)
    assert result.valid is False
    assert "expired" in (result.error or "").lower()


@pytest.mark.asyncio
async def test_offline_key_tampered() -> None:
    from license_lib import OfflineKeyManager
    from license_lib.keygen import generate_key_pair

    _, pub = generate_key_pair()
    mgr = OfflineKeyManager(public_key_pem=pub)
    result = await mgr.verify("tampered_invalid_key_data")
    assert result.valid is False


def test_factory_none() -> None:
    mgr = create_license_manager("none")
    assert mgr.__class__.__name__ == "NoLicenseManager"


def test_factory_offline_key_requires_public_key() -> None:
    with pytest.raises(ValueError, match="public_key_pem"):
        create_license_manager("offline_key")


def test_factory_online_activation_requires_server() -> None:
    with pytest.raises(ValueError, match="activation_server"):
        create_license_manager("online_activation")
