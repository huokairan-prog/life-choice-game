from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any


class AuthError(Exception):
    pass


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_token(payload: dict[str, Any], secret: str, lifetime_seconds: int = 86400) -> str:
    body = {"iat": int(time.time()), "exp": int(time.time()) + lifetime_seconds, **payload}
    encoded_header = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signed = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_b64encode(signature)}"


def verify_token(token: str, secret: str) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signed = f"{encoded_header}.{encoded_payload}".encode("ascii")
        expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).digest()
        actual = _b64decode(encoded_signature)
        if not hmac.compare_digest(expected, actual):
            raise AuthError("会话签名无效")
        header = json.loads(_b64decode(encoded_header))
        payload = json.loads(_b64decode(encoded_payload))
        if header.get("alg") != "HS256" or not payload.get("sub"):
            raise AuthError("会话格式无效")
        if int(payload.get("exp", 0)) <= int(time.time()):
            raise AuthError("会话已过期")
        return payload
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError, KeyError) as error:
        raise AuthError("会话格式无效") from error


def bearer_token(headers: dict[str, str]) -> str:
    value = headers.get("authorization", "")
    if not value.lower().startswith("bearer "):
        raise AuthError("缺少登录会话")
    return value.split(" ", 1)[1].strip()
