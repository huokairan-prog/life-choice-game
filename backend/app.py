"""A dependency-light HTTP server for the existing vanilla game and its secure paid-growth APIs."""
from __future__ import annotations

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import mimetypes
import re
import socket
import sqlite3
import sys
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

try:
    from .config import Settings
    from .db import connect, init_database
    from .growth import (
        ApiError, apply_quote, attach_prepay_id, bootstrap_profile, claim_daily_reward, confirm_initial_cash,
        create_initial_cash_quote, create_payment_order, create_quote, initial_cash_options, ledger, order_for_user,
        product_catalog, profile_snapshot, purchase_route, seed_initial_attributes, settle_payment, simulate_payment,
    )
    from .security import AuthError, bearer_token, issue_token, verify_token
    from .wechat import WeChatPayClient
except ImportError:  # Allows `python backend/app.py` as well as `python -m backend.app`.
    from config import Settings
    from db import connect, init_database
    from growth import (
        ApiError, apply_quote, attach_prepay_id, bootstrap_profile, claim_daily_reward, confirm_initial_cash,
        create_initial_cash_quote, create_payment_order, create_quote, initial_cash_options, ledger, order_for_user,
        product_catalog, profile_snapshot, purchase_route, seed_initial_attributes, settle_payment, simulate_payment,
    )
    from security import AuthError, bearer_token, issue_token, verify_token
    from wechat import WeChatPayClient


USER_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,64}$")
MAX_JSON_BYTES = 128 * 1024


def local_ipv4_address() -> str | None:
    """Return the IPv4 address used by the current default route without sending data."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("192.0.2.1", 9))
            address = str(probe.getsockname()[0])
            return address if address and not address.startswith("127.") else None
    except OSError:
        return None


class Application:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.wechat = WeChatPayClient(settings)

    def connection(self) -> sqlite3.Connection:
        return connect(self.settings)

    def auth(self, handler: BaseHTTPRequestHandler) -> dict[str, Any]:
        headers = {key.lower(): value for key, value in handler.headers.items()}
        claims = verify_token(bearer_token(headers), self.settings.auth_jwt_secret)
        user_id = str(claims.get("sub", ""))
        if not USER_ID_PATTERN.fullmatch(user_id):
            raise AuthError("用户标识无效")
        return {"user_id": user_id, "is_minor": bool(claims.get("is_minor", False)), "wechat_openid": str(claims.get("wechat_openid", ""))}

    def dev_session(self, body: dict[str, Any]) -> dict[str, Any]:
        if self.settings.is_production:
            raise ApiError("DEV_SESSION_DISABLED", "正式环境禁止开发会话。", 403)
        user_id = str(body.get("user_id", "local-player"))
        if not USER_ID_PATTERN.fullmatch(user_id):
            raise ApiError("INVALID_USER_ID", "开发用户 ID 只能包含字母、数字、下划线和短横线。")
        is_minor = bool(body.get("is_minor", False))
        token = issue_token({"sub": user_id, "is_minor": is_minor, "environment": self.settings.app_env}, self.settings.auth_jwt_secret, 7 * 86400)
        with self.connection() as connection:
            profile = bootstrap_profile(connection, user_id, is_minor)
        return {"token": token, "profile": profile, "environment": self.settings.app_env}


class Handler(BaseHTTPRequestHandler):
    server_version = "LIFELifecycle/1.0"

    @property
    def app(self) -> Application:
        return self.server.application  # type: ignore[attr-defined]

    def log_message(self, format: str, *args: Any) -> None:
        if not self.app.settings.is_production:
            super().log_message(format, *args)

    def _security_headers(self, cache_control: str = "no-store") -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", cache_control)
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'")
        if self.app.settings.is_production:
            self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def _cors_headers(self) -> None:
        # Production is same-origin only. Development may be reached by the local static preview.
        origin = self.headers.get("Origin", "")
        if not self.app.settings.is_production and (origin == "null" or origin.startswith("http://127.0.0.1") or origin.startswith("http://localhost")):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._security_headers()
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_error_json(self, error: Exception) -> None:
        if isinstance(error, ApiError):
            self.send_json(error.status, {"error": {"code": error.code, "message": error.message, "details": error.details}})
            return
        if isinstance(error, AuthError):
            self.send_json(401, {"error": {"code": "UNAUTHORIZED", "message": str(error), "details": {}}})
            return
        self.send_json(500, {"error": {"code": "INTERNAL_ERROR", "message": "服务器发生错误，请稍后重试。", "details": {}}})
        if not self.app.settings.is_production:
            print(f"[development] unexpected API error: {error!r}", file=sys.stderr)

    def read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ApiError("INVALID_BODY", "请求内容长度不正确。") from error
        if length < 0 or length > MAX_JSON_BYTES:
            raise ApiError("REQUEST_TOO_LARGE", "请求内容过大。", 413)
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ApiError("INVALID_JSON", "请求不是有效 JSON。") from error
        if not isinstance(value, dict):
            raise ApiError("INVALID_JSON", "请求体必须是对象。")
        return value

    def read_bytes(self) -> bytes:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ApiError("INVALID_BODY", "请求内容长度不正确。") from error
        if length < 0 or length > MAX_JSON_BYTES:
            raise ApiError("REQUEST_TOO_LARGE", "请求内容过大。", 413)
        return self.rfile.read(length)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._security_headers()
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        try:
            parsed = urlparse(self.path)
            if parsed.path.startswith("/api/"):
                self._get_api(parsed.path, parse_qs(parsed.query))
            else:
                self._serve_static(parsed.path)
        except Exception as error:
            self.send_error_json(error)

    def do_POST(self) -> None:
        try:
            parsed = urlparse(self.path)
            if not parsed.path.startswith("/api/"):
                raise ApiError("NOT_FOUND", "接口不存在。", 404)
            self._post_api(parsed.path)
        except Exception as error:
            self.send_error_json(error)

    def _get_api(self, path: str, query: dict[str, list[str]]) -> None:
        if path == "/api/health":
            self.send_json(200, {"ok": True, "environment": self.app.settings.app_env, "simulated_payments": self.app.settings.dev_payment_enabled})
            return
        account = self.app.auth(self)
        with self.app.connection() as connection:
            bootstrap_profile(connection, account["user_id"], account["is_minor"])
            if path in {"/api/me", "/api/growth/profile", "/api/routes"}:
                self.send_json(200, {"profile": profile_snapshot(connection, account["user_id"])})
            elif path == "/api/growth/initial-cash/options":
                self.send_json(200, initial_cash_options(connection, account["user_id"]))
            elif path == "/api/products":
                self.send_json(200, product_catalog(connection, account["user_id"]))
            elif path == "/api/ledger":
                record_type = (query.get("type") or [None])[0]
                self.send_json(200, ledger(connection, account["user_id"], record_type))
            elif path.startswith("/api/payments/orders/"):
                order_id = path.rsplit("/", 1)[1]
                self.send_json(200, {"order": order_for_user(connection, account["user_id"], order_id)})
            else:
                raise ApiError("NOT_FOUND", "接口不存在。", 404)

    def _post_api(self, path: str) -> None:
        if path == "/api/dev/session":
            self.send_json(200, self.app.dev_session(self.read_json()))
            return
        if path == "/api/payments/wechat/notify":
            self._wechat_notify()
            return
        account = self.app.auth(self)
        body = self.read_json()
        idempotency_key = self.headers.get("Idempotency-Key", "")
        with self.app.connection() as connection:
            if path == "/api/growth/bootstrap":
                self.send_json(200, {"profile": bootstrap_profile(connection, account["user_id"], account["is_minor"])})
            elif path == "/api/growth/initialization":
                self.send_json(200, seed_initial_attributes(connection, account["user_id"], body.get("character"), account["is_minor"]))
            elif path == "/api/growth/quote":
                self.send_json(200, {"quote": create_quote(connection, self.app.settings, account["user_id"], body.get("action"), account["is_minor"])})
            elif path == "/api/growth/initial-cash/quote":
                quote = create_initial_cash_quote(
                    connection,
                    self.app.settings,
                    account["user_id"],
                    body.get("option_id"),
                    body.get("character"),
                    account["is_minor"],
                )
                self.send_json(200, {"quote": quote})
            elif path == "/api/growth/initial-cash/confirm":
                self.send_json(
                    200,
                    confirm_initial_cash(
                        connection,
                        account["user_id"],
                        str(body.get("quote_id", "")),
                        idempotency_key,
                        account["is_minor"],
                    ),
                )
            elif path == "/api/growth/upgrade":
                self.send_json(200, apply_quote(connection, account["user_id"], str(body.get("quote_id", "")), idempotency_key, account["is_minor"]))
            elif path == "/api/growth/daily-reward":
                self.send_json(200, claim_daily_reward(connection, account["user_id"], idempotency_key, account["is_minor"]))
            elif path == "/api/payments/orders":
                response = create_payment_order(connection, account["user_id"], str(body.get("sku", "")), idempotency_key, account["is_minor"])
                if self.app.settings.is_production:
                    existing = order_for_user(connection, account["user_id"], response["order"]["id"])
                    if response.get("idempotent_replay") and existing.get("prepay_id"):
                        response["payment"] = self.app.wechat.client_payment_from_prepay(str(existing["prepay_id"]))
                    else:
                        provider = self.app.wechat.create_jsapi_order(response["order"], account["wechat_openid"])
                        attach_prepay_id(connection, account["user_id"], response["order"]["id"], provider["prepay_id"])
                        response["payment"] = provider["client_payment"]
                else:
                    response["development_simulation"] = True
                self.send_json(201, response)
            elif path.startswith("/api/dev/payments/") and path.endswith("/complete"):
                order_id = path.removeprefix("/api/dev/payments/").removesuffix("/complete").strip("/")
                self.send_json(200, simulate_payment(connection, self.app.settings, account["user_id"], order_id))
            elif path.startswith("/api/routes/") and path.endswith("/purchase"):
                route_id = path.removeprefix("/api/routes/").removesuffix("/purchase").strip("/")
                self.send_json(200, purchase_route(connection, account["user_id"], route_id, idempotency_key, account["is_minor"]))
            else:
                raise ApiError("NOT_FOUND", "接口不存在。", 404)

    def _wechat_notify(self) -> None:
        raw_body = self.read_bytes()
        headers = {key.lower(): value for key, value in self.headers.items()}
        payment = self.app.wechat.verify_notification(headers, raw_body)
        out_trade_no = str(payment.get("out_trade_no", ""))
        transaction_id = str(payment.get("transaction_id", ""))
        amount = int((payment.get("amount") or {}).get("total", 0))
        if not out_trade_no or not transaction_id or amount <= 0:
            raise ApiError("WECHAT_PAYLOAD_INVALID", "微信支付通知缺少订单信息。", 400)
        with self.app.connection() as connection:
            order = connection.execute("SELECT id FROM payment_orders WHERE out_trade_no = ?", (out_trade_no,)).fetchone()
            if not order:
                raise ApiError("ORDER_NOT_FOUND", "微信支付订单不存在。", 404)
            settle_payment(connection, order["id"], transaction_id, amount, payment)
        self.send_json(200, {"code": "SUCCESS", "message": "成功"})

    def _serve_static(self, path: str) -> None:
        requested = unquote(path.lstrip("/")) or "index.html"
        if requested.startswith(("backend/", ".env", "data/")):
            raise ApiError("NOT_FOUND", "页面不存在。", 404)
        root = self.app.settings.project_root.resolve()
        target = (root / requested).resolve()
        if root not in target.parents and target != root:
            raise ApiError("NOT_FOUND", "页面不存在。", 404)
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            raise ApiError("NOT_FOUND", "页面不存在。", 404)
        data = target.read_bytes()
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if content_type.startswith("text/") or target.suffix in {".js", ".json"}:
            content_type += "; charset=utf-8"
        self.send_response(200)
        cache_control = "public, max-age=604800, stale-while-revalidate=86400" if requested.startswith("assets/") else "no-cache"
        self._security_headers(cache_control)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    settings = Settings.from_env()
    init_database(settings)
    app = Application(settings)
    if settings.is_production and not app.wechat.configured:
        raise RuntimeError("生产环境必须完成微信支付 V3 配置，且不允许使用模拟充值。")
    server = ThreadingHTTPServer((settings.host, settings.port), Handler)
    server.application = app  # type: ignore[attr-defined]
    if settings.host == "0.0.0.0":
        local_address = local_ipv4_address()
        print(f"《霍开然的人生选择》服务已启动：本机 http://127.0.0.1:{settings.port}")
        if local_address:
            print(f"手机访问：http://{local_address}:{settings.port}")
        else:
            print(f"手机访问：http://<这台 Mac 的局域网 IP>:{settings.port}")
    else:
        print(f"《霍开然的人生选择》服务已启动：http://{settings.host}:{settings.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
