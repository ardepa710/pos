"""
Utility to generate Ed25519 key pairs and sign license payloads.
Usage: python keygen.py generate-keys
       python keygen.py sign --business "Mi Tienda" --expires 2027-12-31 --users 5

NOT distributed to customers — used by the license server or manually.
"""
from __future__ import annotations

import base64
import json
import sys
from datetime import date


def generate_key_pair() -> tuple[str, str]:
    """Returns (private_key_pem, public_key_pem)."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization

    private_key = Ed25519PrivateKey.generate()
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()

    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    return private_pem, public_pem


def sign_license(
    private_key_pem: str,
    business_name: str,
    expires_at: date,
    max_users: int = 5,
    features: list[str] | None = None,
) -> str:
    """Returns base64url-encoded license key."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization

    payload = json.dumps(
        {
            "business_name": business_name,
            "expires_at": expires_at.isoformat(),
            "max_users": max_users,
            "features": features or ["all"],
        },
        separators=(",", ":"),
    )

    private_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None)
    assert isinstance(private_key, Ed25519PrivateKey)
    signature = private_key.sign(payload.encode()).hex()

    combined = f"{payload}|{signature}"
    return base64.urlsafe_b64encode(combined.encode()).decode().rstrip("=")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="POS License Key Generator")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("generate-keys", help="Generate Ed25519 key pair")

    sign_parser = subparsers.add_parser("sign", help="Sign a license payload")
    sign_parser.add_argument("--private-key", required=True, help="Path to private key PEM file")
    sign_parser.add_argument("--business", required=True)
    sign_parser.add_argument("--expires", required=True, help="YYYY-MM-DD")
    sign_parser.add_argument("--users", type=int, default=5)
    sign_parser.add_argument("--features", nargs="*", default=["all"])

    args = parser.parse_args()

    if args.command == "generate-keys":
        priv, pub = generate_key_pair()
        print("=== PRIVATE KEY (keep secret!) ===")
        print(priv)
        print("=== PUBLIC KEY (embed in app) ===")
        print(pub)

    elif args.command == "sign":
        with open(args.private_key) as f:
            private_pem = f.read()
        key = sign_license(
            private_pem,
            args.business,
            date.fromisoformat(args.expires),
            args.users,
            args.features,
        )
        print(f"License key:\n{key}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
