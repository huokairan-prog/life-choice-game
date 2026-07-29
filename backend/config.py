"""Only server-side constants live here. The browser never supplies prices or VIP rules."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


TOPUP_PRODUCTS = {
    "coins_6": {"sku": "coins_6", "label": "60 成长币", "price_cents": 600, "coins": 60},
    "coins_18": {"sku": "coins_18", "label": "200 成长币", "price_cents": 1800, "coins": 200},
    "coins_30": {"sku": "coins_30", "label": "360 成长币", "price_cents": 3000, "coins": 360},
    "coins_68": {"sku": "coins_68", "label": "850 成长币", "price_cents": 6800, "coins": 850},
    "coins_128": {"sku": "coins_128", "label": "1700 成长币", "price_cents": 12800, "coins": 1700},
    "coins_328": {"sku": "coins_328", "label": "4800 成长币", "price_cents": 32800, "coins": 4800},
    "coins_648": {"sku": "coins_648", "label": "10000 成长币", "price_cents": 64800, "coins": 10000},
}

VIP_LEVELS = (
    (7, 200000), (6, 64800), (5, 32800), (4, 12800),
    (3, 6800), (2, 3000), (1, 600),
)

VIP_BENEFITS = {
    0: {"discount": 1.00, "daily_coins": 0, "luck_bonus": 0, "avatar_frame": "普通头像框", "label": "普通人生", "privileges": ["基础人生选择"]},
    1: {"discount": 0.98, "daily_coins": 5, "luck_bonus": 1, "avatar_frame": "微光头像框", "label": "VIP 1", "privileges": ["VIP 身份标志", "专属人生选择"]},
    2: {"discount": 0.95, "daily_coins": 15, "luck_bonus": 2, "avatar_frame": "夜路头像框", "label": "VIP 2", "privileges": ["特殊剧情入口", "海外留学路线资格"]},
    3: {"discount": 0.92, "daily_coins": 30, "luck_bonus": 3, "avatar_frame": "球场头像框", "label": "VIP 3", "privileges": ["特殊职业入口", "球场专属剧情"]},
    4: {"discount": 0.89, "daily_coins": 60, "luck_bonus": 4, "avatar_frame": "城市霓虹头像框", "label": "VIP 4", "privileges": ["豪车与房产路线资格", "豪门人生剧情"]},
    5: {"discount": 0.85, "daily_coins": 120, "luck_bonus": 6, "avatar_frame": "逆袭金边头像框", "label": "VIP 5", "privileges": ["高阶人脉选择", "政商精英路线资格"]},
    6: {"discount": 0.80, "daily_coins": 220, "luck_bonus": 8, "avatar_frame": "远方金边头像框", "label": "VIP 6", "privileges": ["远方城市特殊剧情", "顶级职业入口"]},
    7: {"discount": 0.75, "daily_coins": 400, "luck_bonus": 12, "avatar_frame": "人生主角头像框", "label": "VIP 7", "privileges": ["全部 VIP 人生选择", "主角专属剧情"]},
}

# "wealth" is a wealth-management ability, not direct game cash. Real cash remains part of the life simulation.
ATTRIBUTE_META = {
    "height": {"label": "身高", "tier": "body", "min": 150, "max": 220, "base": 20},
    "weight": {"label": "体重", "tier": "body", "min": 40, "max": 160, "base": 12},
    "strength": {"label": "力量", "tier": "normal", "min": 0, "max": 100, "base": 10},
    "speed": {"label": "速度", "tier": "normal", "min": 0, "max": 100, "base": 10},
    "vertical": {"label": "弹跳", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "basketball": {"label": "篮球技术", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "intelligence": {"label": "智力", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "emotional_intelligence": {"label": "情商", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "charm": {"label": "魅力", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "health": {"label": "健康", "tier": "normal", "min": 0, "max": 100, "base": 10},
    "wealth": {"label": "财富能力", "tier": "advanced", "min": 0, "max": 100, "base": 20},
    "luck": {"label": "幸运", "tier": "rare", "min": 0, "max": 100, "base": 50},
    "social": {"label": "社交能力", "tier": "normal", "min": 0, "max": 100, "base": 10},
    "english": {"label": "英语能力", "tier": "normal", "min": 0, "max": 100, "base": 10},
    "career": {"label": "职业能力", "tier": "normal", "min": 0, "max": 100, "base": 10},
}

DEFAULT_ATTRIBUTES = {
    "height": 185, "weight": 70, "strength": 35, "speed": 35, "vertical": 38,
    "basketball": 62, "intelligence": 52, "emotional_intelligence": 50, "charm": 50,
    "health": 78, "wealth": 30, "luck": 50, "social": 56, "english": 38, "career": 45,
}

ROUTE_CATALOG = {
    "basketball_star": {"name": "篮球巨星路线", "price_coins": 1200, "min_vip": 0, "perk": "篮球专属事件与职业机会"},
    "business_tycoon": {"name": "商业富豪路线", "price_coins": 1500, "min_vip": 0, "perk": "商业专属选择与投资剧情"},
    "world_traveler": {"name": "环球旅行路线", "price_coins": 1000, "min_vip": 0, "perk": "旅行签证与远方城市剧情"},
    "top_creator": {"name": "顶级网红路线", "price_coins": 1300, "min_vip": 1, "perk": "内容创作与粉丝增长剧情"},
    "overseas_study": {"name": "海外留学路线", "price_coins": 1800, "min_vip": 2, "perk": "留学申请与海外职业剧情"},
    "elite_family": {"name": "豪门人生路线", "price_coins": 3600, "min_vip": 4, "perk": "豪车房产与高期待剧情"},
    "civic_elite": {"name": "政商精英路线", "price_coins": 5000, "min_vip": 5, "perk": "高阶人脉与职业转折剧情"},
}

# A life start changes only fictional, in-game cash.  It is deliberately a small,
# fixed catalog: the browser cannot submit an amount, there is no random result,
# and the free option is always available.  Prices are growth coins, never RMB.
INITIAL_CASH_FREE_OPTION_ID = "ordinary"
INITIAL_CASH_OPTIONS = {
    "ordinary": {
        "id": "ordinary",
        "label": "普通起点",
        "initial_cash": 8000,
        "coins_cost": 0,
        "description": "免费基础起点：从 8,000 游戏内现金开始。",
    },
    "prepared": {
        "id": "prepared",
        "label": "准备充分",
        "initial_cash": 20000,
        "coins_cost": 120,
        "description": "以 20,000 游戏内现金开始，适合想留出缓冲的人生。",
    },
    "steady": {
        "id": "steady",
        "label": "安稳起点",
        "initial_cash": 50000,
        "coins_cost": 380,
        "description": "以 50,000 游戏内现金开始，能承担更多早期选择。",
    },
    "venture": {
        "id": "venture",
        "label": "创业储备",
        "initial_cash": 100000,
        "coins_cost": 900,
        "description": "以 100,000 游戏内现金开始，用于虚构人生中的创业尝试。",
    },
}

INITIAL_CASH_DISCLOSURE = (
    "仅影响本局游戏的初始现金，不兑换现实货币，不增加 VIP、幸运或抽奖概率；"
    "确认后不能改回或退款，请在支付前核对。"
)


def _load_local_env(path: Path) -> None:
    """Small dependency-free .env reader; real environment variables always win."""
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


@dataclass(frozen=True)
class Settings:
    project_root: Path
    db_path: Path
    app_env: str
    host: str
    port: int
    auth_jwt_secret: str
    dev_auth_secret: str
    quote_ttl_seconds: int
    wechat_mchid: str
    wechat_appid: str
    wechat_api_v3_key: str
    wechat_private_key_path: str
    wechat_private_key_serial: str
    wechat_platform_cert_path: str
    wechat_notify_url: str

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def dev_payment_enabled(self) -> bool:
        return not self.is_production

    @classmethod
    def from_env(cls) -> "Settings":
        root = Path(__file__).resolve().parents[1]
        _load_local_env(root / "backend" / ".env")
        env = os.getenv("APP_ENV", "development").strip().lower()
        if env not in {"development", "test", "production"}:
            raise RuntimeError("APP_ENV 只能是 development、test 或 production")
        secret = os.getenv("AUTH_JWT_SECRET", "")
        if env == "production" and len(secret) < 32:
            raise RuntimeError("生产环境必须提供至少 32 位的 AUTH_JWT_SECRET")
        return cls(
            project_root=root,
            db_path=Path(os.getenv("LIFE_DB_PATH", root / "backend" / "data" / "life_choice.db")),
            app_env=env,
            host=os.getenv("LIFE_HOST", "127.0.0.1"),
            port=int(os.getenv("LIFE_PORT", "8787")),
            auth_jwt_secret=secret or "development-only-change-me-not-for-production",
            dev_auth_secret=os.getenv("DEV_AUTH_SECRET", "development-only-demo-secret"),
            quote_ttl_seconds=int(os.getenv("GROWTH_QUOTE_TTL_SECONDS", "120")),
            wechat_mchid=os.getenv("WECHAT_PAY_MCHID", ""),
            wechat_appid=os.getenv("WECHAT_PAY_APPID", ""),
            wechat_api_v3_key=os.getenv("WECHAT_PAY_API_V3_KEY", ""),
            wechat_private_key_path=os.getenv("WECHAT_PAY_PRIVATE_KEY_PATH", ""),
            wechat_private_key_serial=os.getenv("WECHAT_PAY_PRIVATE_KEY_SERIAL", ""),
            wechat_platform_cert_path=os.getenv("WECHAT_PAY_PLATFORM_CERT_PATH", ""),
            wechat_notify_url=os.getenv("WECHAT_PAY_NOTIFY_URL", ""),
        )
