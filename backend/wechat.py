"""WeChat Pay v3 adapter. Payment confirmation is accepted only from its signed server notification."""
from __future__ import annotations

import base64
from datetime import datetime
import json
import secrets
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:  # Keep local simulated-payment development usable without payment crypto installed.
    x509 = hashes = serialization = padding = AESGCM = None  # type: ignore[assignment]
    CRYPTOGRAPHY_AVAILABLE = False

try:
    from .config import Settings
    from .growth import ApiError
except ImportError:  # Supports `python backend/app.py` during local development.
    from config import Settings
    from growth import ApiError


class WeChatPayClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def configured(self) -> bool:
        required = (
            self.settings.wechat_mchid,
            self.settings.wechat_appid,
            self.settings.wechat_api_v3_key,
            self.settings.wechat_private_key_path,
            self.settings.wechat_private_key_serial,
            self.settings.wechat_platform_cert_path,
            self.settings.wechat_notify_url,
        )
        return CRYPTOGRAPHY_AVAILABLE and all(required)

    @staticmethod
    def _require_cryptography() -> None:
        if not CRYPTOGRAPHY_AVAILABLE:
            raise ApiError("WECHAT_CRYPTOGRAPHY_MISSING", "微信支付组件未安装，正式环境不能发起或验证支付。", 503)

    def _private_key(self):
        self._require_cryptography()
        try:
            return serialization.load_pem_private_key(open(self.settings.wechat_private_key_path, "rb").read(), password=None)
        except OSError as error:
            raise ApiError("WECHAT_CONFIG_ERROR", "微信支付商户私钥不可用。", 500) from error

    def _platform_certificate(self):
        self._require_cryptography()
        try:
            return x509.load_pem_x509_certificate(open(self.settings.wechat_platform_cert_path, "rb").read())
        except OSError as error:
            raise ApiError("WECHAT_CONFIG_ERROR", "微信支付平台证书不可用。", 500) from error

    def _authorization(self, method: str, path: str, body: str) -> str:
        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)
        message = f"{method}\n{path}\n{timestamp}\n{nonce}\n{body}\n".encode("utf-8")
        signature = self._private_key().sign(message, padding.PKCS1v15(), hashes.SHA256())
        encoded_signature = base64.b64encode(signature).decode("ascii")
        return (
            f'WECHATPAY2-SHA256-RSA2048 mchid="{self.settings.wechat_mchid}",'
            f'nonce_str="{nonce}",timestamp="{timestamp}",serial_no="{self.settings.wechat_private_key_serial}",'
            f'signature="{encoded_signature}"'
        )

    def _request_json(self, method: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.configured:
            raise ApiError("WECHAT_NOT_CONFIGURED", "正式环境尚未完成微信支付配置。", 503)
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        request = Request(
            f"https://api.mch.weixin.qq.com{path}",
            data=body.encode("utf-8"),
            method=method,
            headers={"Authorization": self._authorization(method, path, body), "Accept": "application/json", "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:600]
            raise ApiError("WECHAT_CREATE_FAILED", "微信支付订单创建失败。", 502, {"provider": detail}) from error
        except URLError as error:
            raise ApiError("WECHAT_UNAVAILABLE", "无法连接微信支付服务。", 502) from error

    def create_jsapi_order(self, order: dict[str, Any], openid: str) -> dict[str, Any]:
        if not openid:
            raise ApiError("WECHAT_OPENID_REQUIRED", "当前账号尚未绑定微信身份，不能发起 JSAPI 支付。", 403)
        path = "/v3/pay/transactions/jsapi"
        provider_response = self._request_json(
            "POST",
            path,
            {
                "appid": self.settings.wechat_appid,
                "mchid": self.settings.wechat_mchid,
                "description": f"霍开然的人生选择 · {order['sku']}",
                "out_trade_no": order["out_trade_no"],
                "notify_url": self.settings.wechat_notify_url,
                "amount": {"total": int(order["amount_cents"]), "currency": "CNY"},
                "payer": {"openid": openid},
            },
        )
        prepay_id = provider_response.get("prepay_id")
        if not prepay_id:
            raise ApiError("WECHAT_CREATE_FAILED", "微信支付未返回 prepay_id。", 502)
        return {"prepay_id": prepay_id, "client_payment": self.client_payment_from_prepay(prepay_id)}

    def client_payment_from_prepay(self, prepay_id: str) -> dict[str, Any]:
        """Create fresh JSAPI client parameters without asking WeChat for another prepay order."""
        if not prepay_id:
            raise ApiError("WECHAT_PREPAY_MISSING", "支付预下单信息缺失。", 409)
        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)
        package = f"prepay_id={prepay_id}"
        message = f"{self.settings.wechat_appid}\n{timestamp}\n{nonce}\n{package}\n".encode("utf-8")
        pay_sign = base64.b64encode(self._private_key().sign(message, padding.PKCS1v15(), hashes.SHA256())).decode("ascii")
        return {"appId": self.settings.wechat_appid, "timeStamp": timestamp, "nonceStr": nonce, "package": package, "signType": "RSA", "paySign": pay_sign}

    def verify_notification(self, headers: dict[str, str], raw_body: bytes) -> dict[str, Any]:
        self._require_cryptography()
        if not self.configured:
            raise ApiError("WECHAT_NOT_CONFIGURED", "微信支付回调配置未完成。", 503)
        timestamp = headers.get("wechatpay-timestamp", "")
        nonce = headers.get("wechatpay-nonce", "")
        signature = headers.get("wechatpay-signature", "")
        serial = headers.get("wechatpay-serial", "")
        if not timestamp or not nonce or not signature or not serial:
            raise ApiError("WECHAT_SIGNATURE_MISSING", "微信支付通知缺少签名字段。", 400)
        try:
            message = f"{timestamp}\n{nonce}\n{raw_body.decode('utf-8')}\n".encode("utf-8")
            certificate = self._platform_certificate()
            expected_serial = format(certificate.serial_number, "X")
            if serial.upper() != expected_serial.upper():
                raise ValueError("platform certificate serial does not match")
            certificate.public_key().verify(base64.b64decode(signature), message, padding.PKCS1v15(), hashes.SHA256())
            payload = json.loads(raw_body.decode("utf-8"))
            resource = payload["resource"]
            api_key = self.settings.wechat_api_v3_key.encode("utf-8")
            if len(api_key) != 32:
                raise ValueError("APIv3 key length")
            plaintext = AESGCM(api_key).decrypt(resource["nonce"].encode("utf-8"), base64.b64decode(resource["ciphertext"]), resource.get("associated_data", "").encode("utf-8"))
            decrypted = json.loads(plaintext.decode("utf-8"))
        except Exception as error:
            raise ApiError("WECHAT_SIGNATURE_INVALID", "微信支付通知验签或解密失败。", 400) from error
        if decrypted.get("mchid") != self.settings.wechat_mchid or decrypted.get("appid") != self.settings.wechat_appid:
            raise ApiError("WECHAT_MERCHANT_MISMATCH", "微信支付通知的商户或应用不匹配。", 400)
        if decrypted.get("trade_state") != "SUCCESS":
            raise ApiError("WECHAT_NOT_SUCCESS", "支付尚未成功。", 409)
        return decrypted
