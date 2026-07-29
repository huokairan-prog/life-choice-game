"""All money, pricing and paid progression decisions are made here on the server."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import math
import sqlite3
from typing import Any
from uuid import uuid4

try:
    from .config import (
        ATTRIBUTE_META, DEFAULT_ATTRIBUTES, INITIAL_CASH_DISCLOSURE, INITIAL_CASH_FREE_OPTION_ID,
        INITIAL_CASH_OPTIONS, ROUTE_CATALOG, TOPUP_PRODUCTS, VIP_BENEFITS, VIP_LEVELS, Settings,
    )
    from .db import write_transaction
except ImportError:  # Supports `python backend/app.py` during local development.
    from config import (
        ATTRIBUTE_META, DEFAULT_ATTRIBUTES, INITIAL_CASH_DISCLOSURE, INITIAL_CASH_FREE_OPTION_ID,
        INITIAL_CASH_OPTIONS, ROUTE_CATALOG, TOPUP_PRODUCTS, VIP_BENEFITS, VIP_LEVELS, Settings,
    )
    from db import write_transaction


ATTRIBUTE_KEYS = tuple(ATTRIBUTE_META.keys())
BODY_KEYS = {"height", "weight"}


class ApiError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}


def now() -> datetime:
    return datetime.now(timezone.utc)


def timestamp(value: datetime | None = None) -> str:
    return (value or now()).isoformat()


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(timezone.utc)


def money(cents: int) -> str:
    return f"¥{int(cents) / 100:.2f}"


def level_for_recharge(total_cents: int) -> int:
    for level, threshold in VIP_LEVELS:
        if total_cents >= threshold:
            return level
    return 0


def next_vip(total_cents: int) -> dict[str, int] | None:
    thresholds = sorted((threshold, level) for level, threshold in VIP_LEVELS)
    for threshold, level in thresholds:
        if total_cents < threshold:
            return {"level": level, "threshold_cents": threshold, "remaining_cents": threshold - total_cents}
    return None


def _user_row(connection: sqlite3.Connection, user_id: str) -> sqlite3.Row:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise ApiError("ACCOUNT_NOT_FOUND", "账户不存在，请重新登录。", 401)
    return row


def _wallet_row(connection: sqlite3.Connection, user_id: str) -> sqlite3.Row:
    row = connection.execute("SELECT * FROM wallets WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        raise ApiError("WALLET_NOT_FOUND", "成长钱包尚未初始化。", 500)
    return row


def _attributes_row(connection: sqlite3.Connection, user_id: str) -> sqlite3.Row:
    row = connection.execute("SELECT * FROM player_attributes WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        raise ApiError("ATTRIBUTES_NOT_FOUND", "成长属性尚未初始化。", 500)
    return row


def attributes_from_row(row: sqlite3.Row) -> dict[str, int]:
    return {key: int(row[key]) for key in ATTRIBUTE_KEYS}


def ensure_user(connection: sqlite3.Connection, user_id: str, is_minor: bool = False) -> None:
    existing = connection.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if existing:
        return
    created_at = timestamp()
    connection.execute(
        """INSERT INTO users (id, is_minor, created_at, updated_at)
           VALUES (?, ?, ?, ?)""",
        (user_id, 1 if is_minor else 0, created_at, created_at),
    )
    connection.execute(
        "INSERT INTO wallets (user_id, growth_coins, version, updated_at) VALUES (?, 0, 1, ?)",
        (user_id, created_at),
    )
    columns = ", ".join(("user_id", *ATTRIBUTE_KEYS, "version", "updated_at"))
    placeholders = ", ".join("?" for _ in range(len(ATTRIBUTE_KEYS) + 3))
    connection.execute(
        f"INSERT INTO player_attributes ({columns}) VALUES ({placeholders})",
        (user_id, *(DEFAULT_ATTRIBUTES[key] for key in ATTRIBUTE_KEYS), 1, created_at),
    )


def bootstrap_profile(connection: sqlite3.Connection, user_id: str, is_minor: bool = False) -> dict[str, Any]:
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        return profile_snapshot(connection, user_id)


def body_impact(attributes: dict[str, int]) -> dict[str, Any]:
    height = attributes["height"]
    weight = attributes["weight"]
    bmi = round(weight / ((height / 100) ** 2), 1)
    speed = -round(max(0, bmi - 24) * 1.2) - (2 if bmi < 18.5 else 0)
    strength = round(min(max(bmi - 21, 0), 7) * 0.55) - round(max(0, bmi - 31) * 0.8)
    health = -round(max(0, bmi - 27) * 1.3) - round(max(0, 18.5 - bmi) * 1.4)
    basketball = 0
    if 176 <= height <= 195:
        basketball += 3
    elif height >= 196:
        basketball += 2
        speed -= 1
    elif height <= 165:
        speed += 2
        basketball += 1
    if bmi >= 30:
        speed -= 2
        health -= 3
    elif bmi < 18.5:
        health -= 2
    if bmi < 18.5:
        body_type = "偏瘦轻盈"
    elif bmi < 24:
        body_type = "匀称运动型"
    elif bmi < 28:
        body_type = "结实力量型"
    else:
        body_type = "壮硕体型"
    return {
        "bmi": bmi,
        "body_type": body_type,
        "modifiers": {"speed": speed, "strength": strength, "health": health, "basketball": basketball},
        "hint": "体型会同时影响速度、力量和健康；高或低都不是绝对优势。",
    }


def effective_attributes(attributes: dict[str, int], vip_level: int) -> dict[str, int]:
    modifiers = body_impact(attributes)["modifiers"]
    effective = dict(attributes)
    for key, modifier in modifiers.items():
        effective[key] = max(0, min(100, attributes[key] + modifier))
    effective["luck"] = min(100, attributes["luck"] + int(VIP_BENEFITS[vip_level]["luck_bonus"]))
    return effective


def _route_state(connection: sqlite3.Connection, user_id: str, vip_level: int) -> list[dict[str, Any]]:
    unlocked = {
        row["entitlement_key"]
        for row in connection.execute("SELECT entitlement_key FROM user_entitlements WHERE user_id = ?", (user_id,)).fetchall()
    }
    return [
        {
            "id": route_id,
            "name": route["name"],
            "price_coins": route["price_coins"],
            "min_vip": route["min_vip"],
            "perk": route["perk"],
            "unlocked": route_id in unlocked,
            "eligible": vip_level >= route["min_vip"],
        }
        for route_id, route in ROUTE_CATALOG.items()
    ]


def _initial_cash_option(option_id: Any) -> dict[str, Any]:
    option = INITIAL_CASH_OPTIONS.get(str(option_id or ""))
    if not option:
        raise ApiError("INITIAL_CASH_OPTION_NOT_FOUND", "这个人生起点不存在，请从官方档位中选择。", 404)
    return option


def _initial_cash_option_view(
    option: dict[str, Any], *, selected: bool, confirmed: bool, locked: bool, coins_spent: int | None = None,
    source_type: str | None = None,
) -> dict[str, Any]:
    initial_cash = int(option["initial_cash"])
    configured_cost = int(option["coins_cost"])
    return {
        "id": str(option["id"]),
        "label": str(option["label"]),
        "initial_cash": initial_cash,
        "game_cash": initial_cash,
        "coins_cost": configured_cost,
        "coins_spent": configured_cost if coins_spent is None else int(coins_spent),
        "description": str(option["description"]),
        "selected": selected,
        "confirmed": confirmed,
        "locked": locked,
        "source_type": source_type,
    }


def _initial_cash_state(connection: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    """Return the server-owned life-start state, never a browser submitted amount."""
    selection = connection.execute(
        "SELECT * FROM initial_cash_selections WHERE user_id = ?", (user_id,)
    ).fetchone()
    initialized = bool(
        connection.execute("SELECT 1 FROM growth_initializations WHERE user_id = ?", (user_id,)).fetchone()
    )
    if selection:
        configured = INITIAL_CASH_OPTIONS.get(str(selection["option_id"]))
        # Retain the historical paid amount even if a later deployment changes
        # the public catalog.
        option = {
            "id": str(selection["option_id"]),
            "label": configured["label"] if configured else "已下架的人生起点",
            "initial_cash": int(selection["initial_cash"]),
            "coins_cost": int(selection["coins_spent"]),
            "description": configured["description"] if configured else "已确认的游戏内初始现金。",
        }
        selected_option = _initial_cash_option_view(
            option,
            selected=True,
            confirmed=True,
            locked=initialized or bool(selection["locked_at"]),
            coins_spent=int(selection["coins_spent"]),
            source_type=str(selection["source_type"]),
        )
        initial_cash = int(selection["initial_cash"])
    else:
        option = _initial_cash_option(INITIAL_CASH_FREE_OPTION_ID)
        selected_option = _initial_cash_option_view(option, selected=True, confirmed=False, locked=initialized)
        initial_cash = int(option["initial_cash"])
    return {
        "initial_cash": initial_cash,
        "selected_option": selected_option,
        "selection_confirmed": bool(selection),
        "locked": initialized or bool(selection and selection["locked_at"]),
        "disclosure": INITIAL_CASH_DISCLOSURE,
    }


def profile_snapshot(connection: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    user = _user_row(connection, user_id)
    wallet = _wallet_row(connection, user_id)
    attributes_row = _attributes_row(connection, user_id)
    attributes = attributes_from_row(attributes_row)
    vip_level = int(user["vip_level"])
    benefit = VIP_BENEFITS[vip_level]
    initial_cash = _initial_cash_state(connection, user_id)
    return {
        "wallet": {"growth_coins": int(wallet["growth_coins"]), "version": int(wallet["version"]), "free_growth_points": int(user["free_growth_points"])},
        "vip": {
            "level": vip_level,
            "label": benefit["label"],
            "total_recharge_cents": int(user["total_recharge_cents"]),
            "discount": benefit["discount"],
            "daily_coins": benefit["daily_coins"],
            "luck_bonus": benefit["luck_bonus"],
            "avatar_frame": benefit["avatar_frame"],
            "privileges": benefit["privileges"],
            "next": next_vip(int(user["total_recharge_cents"])),
        },
        "attributes": attributes,
        "effective_attributes": effective_attributes(attributes, vip_level),
        "body": body_impact(attributes),
        "attribute_version": int(attributes_row["version"]),
        "routes": _route_state(connection, user_id, vip_level),
        "initial_cash": initial_cash["initial_cash"],
        "selected_option": initial_cash["selected_option"],
        "initial_cash_state": initial_cash,
        "minor": {
            "is_minor": bool(user["is_minor"]),
            "monthly_limit_cents": int(user["monthly_minor_limit_cents"]),
            "notice": "未成年人充值将受到月度限额和消费提醒保护。" if user["is_minor"] else "",
        },
        "first_recharge_available": not bool(user["first_recharge_claimed"]),
        "initial_attributes_seeded": bool(connection.execute("SELECT 1 FROM growth_initializations WHERE user_id = ?", (user_id,)).fetchone()),
    }


def _creation_point_cost(value: int) -> int:
    point = max(0, min(100, int(value)))
    if point <= 60:
        return point
    if point <= 80:
        return 60 + (point - 60) * 2
    return 100 + (point - 80) * 3


def _creation_value(values: dict[str, Any], key: str) -> int:
    raw = values.get(key, 0)
    try:
        value = int(raw)
    except (TypeError, ValueError) as error:
        raise ApiError("INITIALIZATION_INVALID", "角色初始属性格式不正确。") from error
    if not 0 <= value <= 100:
        raise ApiError("INITIALIZATION_INVALID", "角色初始属性必须在 0 到 100 之间。")
    return value


def _creation_budget(values: dict[str, Any], keys: tuple[str, ...], budget: int) -> dict[str, int]:
    parsed = {key: _creation_value(values, key) for key in keys}
    if sum(_creation_point_cost(value) for value in parsed.values()) > budget:
        raise ApiError("INITIALIZATION_BUDGET", "角色初始属性点超过了创建页允许的上限。", 409)
    return parsed


def _seed_attributes_from_character(character: Any) -> dict[str, int]:
    if not isinstance(character, dict):
        raise ApiError("INITIALIZATION_INVALID", "首次同步需要完整的角色创建资料。")
    body = character.get("body") or {}
    physical_source = body.get("physical") or {}
    talents_source = character.get("talents") or {}
    personality = character.get("personality") or {}
    appearance = character.get("appearance") or {}
    if not isinstance(body, dict) or not isinstance(physical_source, dict) or not isinstance(talents_source, dict):
        raise ApiError("INITIALIZATION_INVALID", "角色创建资料不完整。")
    physical = _creation_budget(physical_source, ("strength", "speed", "endurance", "agility", "jump", "coordination", "reaction", "recovery", "resilience"), 300)
    talents = _creation_budget(talents_source, ("learning", "language", "communication", "leadership", "creativity", "logic", "emotional", "business", "finance", "sport", "art", "technology", "execution", "resilience"), 300)
    try:
        height = int(body.get("height"))
        weight = int(body.get("weight"))
        muscle = int(body.get("muscle", 0))
        body_fat = int(body.get("bodyFat", 20))
        fate_points = int(talents_source.get("fatePoints", 0))
    except (TypeError, ValueError) as error:
        raise ApiError("INITIALIZATION_INVALID", "身体资料格式不正确。") from error
    if not 150 <= height <= 220 or not 40 <= weight <= 160:
        raise ApiError("INITIALIZATION_RANGE", "首次身体资料必须符合身高 150–220 厘米、体重 40–160 公斤的成长规则。", 409)
    if not 0 <= muscle <= 100 or not 5 <= body_fat <= 45 or not -2 <= fate_points <= 2:
        raise ApiError("INITIALIZATION_RANGE", "首次身体或命运资料超出创建页允许范围。", 409)
    bmi = weight / ((height / 100) ** 2)
    height_sport = 4 if height < 166 else 8 if height <= 185 else 6 if height <= 195 else 2
    mobility = (physical["speed"] + physical["agility"] + physical["coordination"] + physical["reaction"]) / 4
    luck_mode = str(talents_source.get("luckMode", "normal"))
    luck_base = {"low": 38, "normal": 50, "high": 62}.get(luck_mode, 50)
    try:
        introversion = int(personality.get("introversion", 50) or 50)
    except (TypeError, ValueError) as error:
        raise ApiError("INITIALIZATION_INVALID", "角色性格资料格式不正确。") from error
    introversion = max(0, min(100, introversion))
    charm_base = 50 + (4 if appearance.get("temperament") in {"sunny", "bold", "sport"} else 0) + (3 if appearance.get("style") in {"street", "literary", "business"} else 0)
    return {
        "height": height,
        "weight": weight,
        "strength": physical["strength"],
        "speed": physical["speed"],
        "vertical": physical["jump"],
        "basketball": max(0, min(100, round(22 + talents["sport"] * .65 + height_sport + mobility * .14 + physical["jump"] * .16))),
        "intelligence": max(0, min(100, round(25 + talents["learning"] * .72 + talents["logic"] * .32))),
        "emotional_intelligence": talents["emotional"],
        "charm": max(0, min(100, round(charm_base + talents["communication"] * .18 + (introversion - 50) * -.05))),
        "health": max(0, min(100, round(56 + physical["resilience"] * .35 + physical["recovery"] * .22 - max(0, body_fat - 30) * .45 - max(0, 8 - body_fat) * .7 - max(0, bmi - 31) * .35))),
        "wealth": max(0, min(100, round(15 + talents["finance"] * .56 + talents["business"] * .40))),
        "luck": max(0, min(100, luck_base + fate_points * 4)),
        "social": max(0, min(100, round(25 + talents["communication"] * .7 + talents["emotional"] * .4 + (50 - introversion) * .16))),
        "english": max(0, min(100, round(18 + talents["language"] * .9 + talents["learning"] * .2))),
        "career": max(0, min(100, round(20 + talents["execution"] * .65 + talents["leadership"] * .25 + talents["technology"] * .15))),
    }


def _lock_initial_cash_for_initialization(connection: sqlite3.Connection, user_id: str, at: str) -> None:
    """Freeze a confirmed start, or atomically choose the free base for a new life."""
    selection = connection.execute(
        "SELECT user_id, locked_at FROM initial_cash_selections WHERE user_id = ?", (user_id,)
    ).fetchone()
    if selection:
        if not selection["locked_at"]:
            connection.execute(
                "UPDATE initial_cash_selections SET locked_at = ? WHERE user_id = ?", (at, user_id)
            )
        return
    option = _initial_cash_option(INITIAL_CASH_FREE_OPTION_ID)
    connection.execute(
        """INSERT INTO initial_cash_selections
           (user_id, option_id, initial_cash, coins_spent, source_type, quote_id, transaction_id, selected_at, locked_at)
           VALUES (?, ?, ?, 0, 'FREE_BASE', NULL, NULL, ?, ?)""",
        (user_id, option["id"], int(option["initial_cash"]), at, at),
    )


def seed_initial_attributes(connection: sqlite3.Connection, user_id: str, character: Any, is_minor: bool = False) -> dict[str, Any]:
    """Accept a valid character-creator payload once; subsequent progression is server-only."""
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        existing = connection.execute("SELECT seeded_at FROM growth_initializations WHERE user_id = ?", (user_id,)).fetchone()
        if existing:
            return {"profile": profile_snapshot(connection, user_id), "seeded": False, "already_initialized": True}
        attributes = _seed_attributes_from_character(character)
        source = json.dumps(character, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        at = timestamp()
        assignments = ", ".join(f"{key} = ?" for key in ATTRIBUTE_KEYS)
        connection.execute(
            f"UPDATE player_attributes SET {assignments}, version = version + 1, updated_at = ? WHERE user_id = ?",
            (*(attributes[key] for key in ATTRIBUTE_KEYS), at, user_id),
        )
        # `character.resources.cash` and family savings are intentionally not
        # read here.  The server's fixed life-start selection is the only
        # authoritative initial-cash value for this game life.
        _lock_initial_cash_for_initialization(connection, user_id, at)
        connection.execute(
            "INSERT INTO growth_initializations (user_id, source_digest, seeded_at) VALUES (?, ?, ?)",
            (user_id, sha256(source.encode("utf-8")).hexdigest(), at),
        )
        return {"profile": profile_snapshot(connection, user_id), "seeded": True, "already_initialized": False}


def _discount(user: sqlite3.Row) -> float:
    return float(VIP_BENEFITS[int(user["vip_level"])]["discount"])


def _normal_price(base: int, level: int, discount: float) -> int:
    return max(1, math.ceil(base * (1 + max(0, level) * 0.08) * discount))


def _body_price(attribute: str, next_value: int, discount: float) -> int:
    meta = ATTRIBUTE_META[attribute]
    if attribute == "height":
        level = next_value - meta["min"]
        surge = 2.5 if next_value > 195 else 1.0
        return max(1, math.ceil(meta["base"] * (1 + level * 0.08) * surge * discount))
    level = abs(next_value - 70)
    return max(1, math.ceil(meta["base"] * (1 + level * 0.08) * discount))


def validate_action(action: Any) -> dict[str, Any]:
    if not isinstance(action, dict):
        raise ApiError("INVALID_ACTION", "升级请求格式不正确。")
    attribute = str(action.get("attribute", ""))
    if attribute not in ATTRIBUTE_META:
        raise ApiError("INVALID_ATTRIBUTE", "该属性不能升级。")
    if attribute in BODY_KEYS:
        if "target" not in action:
            raise ApiError("TARGET_REQUIRED", "身高和体重调整需要目标数值。")
        try:
            target = int(action["target"])
        except (TypeError, ValueError) as error:
            raise ApiError("INVALID_TARGET", "目标数值不正确。") from error
        meta = ATTRIBUTE_META[attribute]
        if not meta["min"] <= target <= meta["max"]:
            raise ApiError("OUT_OF_RANGE", f"{meta['label']}只能在 {meta['min']} 到 {meta['max']} 之间调整。")
        return {"attribute": attribute, "target": target}
    try:
        quantity = int(action.get("quantity", 1))
    except (TypeError, ValueError) as error:
        raise ApiError("INVALID_QUANTITY", "升级数量不正确。") from error
    if quantity < 1 or quantity > 10:
        raise ApiError("INVALID_QUANTITY", "单次批量升级只能是 1 到 10 点。")
    return {"attribute": attribute, "quantity": quantity}


def simulate_upgrade(attributes: dict[str, int], free_points: int, vip_level: int, action: dict[str, Any]) -> dict[str, Any]:
    action = validate_action(action)
    attribute = action["attribute"]
    meta = ATTRIBUTE_META[attribute]
    before = dict(attributes)
    after = dict(attributes)
    discount = VIP_BENEFITS[vip_level]["discount"]
    costs: list[int] = []
    free_used = 0
    if attribute in BODY_KEYS:
        target = action["target"]
        current = before[attribute]
        if target == current:
            raise ApiError("NO_CHANGE", "目标数值和当前数值相同。")
        if abs(target - current) > 30:
            raise ApiError("ADJUSTMENT_TOO_LARGE", "单次身体调整不能超过 30 个单位，请分次确认。")
        direction = 1 if target > current else -1
        value = current
        while value != target:
            value += direction
            costs.append(_body_price(attribute, value, discount))
        after[attribute] = target
        quantity = abs(target - current)
    else:
        quantity = action["quantity"]
        target = before[attribute] + quantity
        if target > meta["max"]:
            raise ApiError("ATTRIBUTE_MAX", f"{meta['label']}最高只能到 {meta['max']}。")
        value = before[attribute]
        for index in range(quantity):
            value += 1
            if index < min(int(free_points), quantity):
                free_used += 1
                costs.append(0)
            else:
                costs.append(_normal_price(meta["base"], value - 1, discount))
        after[attribute] = target
    before_body = body_impact(before)
    after_body = body_impact(after)
    modifier_delta = {
        key: after_body["modifiers"][key] - before_body["modifiers"][key]
        for key in after_body["modifiers"]
        if after_body["modifiers"][key] != before_body["modifiers"][key]
    }
    return {
        "action": action,
        "attribute": attribute,
        "label": meta["label"],
        "before": before[attribute],
        "after": after[attribute],
        "quantity": quantity,
        "free_points_used": free_used,
        "coins_cost": sum(costs),
        "cost_breakdown": costs,
        "vip_discount": discount,
        "attributes_after": after,
        "body_before": before_body,
        "body_after": after_body,
        "body_modifier_delta": modifier_delta,
    }


def create_quote(connection: sqlite3.Connection, settings: Settings, user_id: str, action: Any, is_minor: bool = False) -> dict[str, Any]:
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        user = _user_row(connection, user_id)
        wallet = _wallet_row(connection, user_id)
        attributes_row = _attributes_row(connection, user_id)
        quote = simulate_upgrade(attributes_from_row(attributes_row), int(user["free_growth_points"]), int(user["vip_level"]), action)
        quote_id = uuid4().hex
        expires_at = now() + timedelta(seconds=settings.quote_ttl_seconds)
        quote["id"] = quote_id
        quote["expires_at"] = timestamp(expires_at)
        quote["balance_before"] = int(wallet["growth_coins"])
        quote["balance_after"] = int(wallet["growth_coins"]) - quote["coins_cost"]
        connection.execute(
            """INSERT INTO growth_quotes (id, user_id, action_json, quote_json, attribute_version, wallet_version, expires_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (quote_id, user_id, json.dumps(quote["action"]), json.dumps(quote), int(attributes_row["version"]), int(wallet["version"]), timestamp(expires_at), timestamp()),
        )
        return quote


def initial_cash_options(connection: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    """Expose only fixed, transparent game-cash starting points to the client."""
    user = _user_row(connection, user_id)
    wallet = _wallet_row(connection, user_id)
    state = _initial_cash_state(connection, user_id)
    selected_id = str(state["selected_option"]["id"])
    can_select = not state["selection_confirmed"] and not state["locked"]
    return {
        "options": [
            _initial_cash_option_view(
                option,
                selected=str(option["id"]) == selected_id,
                confirmed=bool(state["selection_confirmed"] and str(option["id"]) == selected_id),
                locked=bool(state["locked"]),
            )
            for option in INITIAL_CASH_OPTIONS.values()
        ],
        "initial_cash": state["initial_cash"],
        "selected_option": state["selected_option"],
        "can_select": can_select,
        "wallet": {"growth_coins": int(wallet["growth_coins"]), "version": int(wallet["version"])},
        "minor": {
            "is_minor": bool(user["is_minor"]),
            "notice": "未成年人账户仍受已有充值限额与消费提醒保护。" if user["is_minor"] else "",
        },
        "disclosure": INITIAL_CASH_DISCLOSURE,
    }


def create_initial_cash_quote(
    connection: sqlite3.Connection,
    settings: Settings,
    user_id: str,
    option_id: Any,
    character: Any = None,
    is_minor: bool = False,
) -> dict[str, Any]:
    """Quote a fixed life-start option without committing it or touching cash.

    `character` is accepted for the creation-screen contract only.  It is not
    used in pricing or the selected amount, which prevents client-side family
    savings/resources fields from influencing the authoritative cash value.
    """
    if character is not None and not isinstance(character, dict):
        raise ApiError("INITIAL_CASH_CHARACTER_INVALID", "角色资料格式不正确。")
    option = _initial_cash_option(option_id)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        if connection.execute("SELECT 1 FROM growth_initializations WHERE user_id = ?", (user_id,)).fetchone():
            raise ApiError("INITIAL_CASH_LOCKED", "人生已经开始，初始现金不能再调整。", 409)
        if connection.execute("SELECT 1 FROM initial_cash_selections WHERE user_id = ?", (user_id,)).fetchone():
            raise ApiError("INITIAL_CASH_ALREADY_SELECTED", "这个人生起点已经确认，不能重复选择。", 409)
        wallet = _wallet_row(connection, user_id)
        user = _user_row(connection, user_id)
        quote_id = uuid4().hex
        expires_at = now() + timedelta(seconds=settings.quote_ttl_seconds)
        coins_cost = int(option["coins_cost"])
        connection.execute(
            """INSERT INTO initial_cash_quotes
               (id, user_id, option_id, initial_cash, coins_cost, wallet_version, expires_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                quote_id, user_id, option["id"], int(option["initial_cash"]), coins_cost,
                int(wallet["version"]), timestamp(expires_at), timestamp(),
            ),
        )
        return {
            "id": quote_id,
            "option": _initial_cash_option_view(option, selected=False, confirmed=False, locked=False),
            "option_id": option["id"],
            "initial_cash": int(option["initial_cash"]),
            "coins_cost": coins_cost,
            "balance_before": int(wallet["growth_coins"]),
            "balance_after": int(wallet["growth_coins"]) - coins_cost,
            "affordable": int(wallet["growth_coins"]) >= coins_cost,
            "expires_at": timestamp(expires_at),
            "minor_notice": "未成年人账户仍受已有充值限额与消费提醒保护。" if user["is_minor"] else "",
            "disclosure": INITIAL_CASH_DISCLOSURE,
        }


def _request_hash(*parts: str) -> str:
    return sha256("|".join(parts).encode("utf-8")).hexdigest()


def _idempotent_response(connection: sqlite3.Connection, user_id: str, operation: str, key: str, request_hash: str) -> dict[str, Any] | None:
    row = connection.execute(
        "SELECT request_hash, response_json FROM idempotency_keys WHERE user_id = ? AND operation = ? AND idempotency_key = ?",
        (user_id, operation, key),
    ).fetchone()
    if not row:
        return None
    if row["request_hash"] != request_hash:
        raise ApiError("IDEMPOTENCY_CONFLICT", "重复请求的内容不一致，请刷新后再试。", 409)
    return json.loads(row["response_json"])


def _save_idempotency(connection: sqlite3.Connection, user_id: str, operation: str, key: str, request_hash: str, response: dict[str, Any]) -> None:
    connection.execute(
        """INSERT INTO idempotency_keys (user_id, operation, idempotency_key, request_hash, response_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, operation, key, request_hash, json.dumps(response, ensure_ascii=False), timestamp()),
    )


def confirm_initial_cash(
    connection: sqlite3.Connection, user_id: str, quote_id: str, idempotency_key: str, is_minor: bool = False,
) -> dict[str, Any]:
    """Atomically spend server-owned coins and lock one starting-cash preset."""
    if not idempotency_key or len(idempotency_key) > 160:
        raise ApiError("IDEMPOTENCY_REQUIRED", "确认人生起点需要有效的防重复标识。")
    request_hash = _request_hash(quote_id)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        repeated = _idempotent_response(connection, user_id, "confirm_initial_cash", idempotency_key, request_hash)
        if repeated:
            return repeated
        if connection.execute("SELECT 1 FROM growth_initializations WHERE user_id = ?", (user_id,)).fetchone():
            raise ApiError("INITIAL_CASH_LOCKED", "人生已经开始，初始现金不能再调整。", 409)
        quote = connection.execute(
            "SELECT * FROM initial_cash_quotes WHERE id = ? AND user_id = ?", (quote_id, user_id)
        ).fetchone()
        if not quote:
            raise ApiError("INITIAL_CASH_QUOTE_NOT_FOUND", "人生起点报价不存在，请重新选择。", 404)
        if quote["consumed_at"]:
            raise ApiError("INITIAL_CASH_QUOTE_USED", "这份人生起点报价已经使用。", 409)
        if parse_timestamp(str(quote["expires_at"])) <= now():
            raise ApiError("INITIAL_CASH_QUOTE_EXPIRED", "人生起点报价已过期，请重新确认。", 409)
        if connection.execute("SELECT 1 FROM initial_cash_selections WHERE user_id = ?", (user_id,)).fetchone():
            raise ApiError("INITIAL_CASH_ALREADY_SELECTED", "这个人生起点已经确认，不能重复选择。", 409)
        option = _initial_cash_option(quote["option_id"])
        # Prices and amounts are snapshotted by the server in the quote.  The
        # catalog comparison detects a deployment/configuration mismatch rather
        # than silently charging a different amount from the displayed quote.
        if int(quote["initial_cash"]) != int(option["initial_cash"]) or int(quote["coins_cost"]) != int(option["coins_cost"]):
            raise ApiError("INITIAL_CASH_QUOTE_STALE", "人生起点价格已更新，请重新查看档位。", 409)
        wallet = _wallet_row(connection, user_id)
        coins_cost = int(quote["coins_cost"])
        balance_before = int(wallet["growth_coins"])
        if balance_before < coins_cost:
            raise ApiError(
                "INSUFFICIENT_COINS",
                "成长币不足，充值后即可继续改变人生。",
                409,
                {"required": coins_cost, "balance": balance_before},
            )
        at = timestamp()
        transaction_id = uuid4().hex
        balance_after = balance_before - coins_cost
        source_type = "FREE_BASE" if coins_cost == 0 else "COIN_PURCHASE"
        connection.execute(
            """INSERT INTO initial_cash_selections
               (user_id, option_id, initial_cash, coins_spent, source_type, quote_id, transaction_id, selected_at, locked_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)""",
            (
                user_id, option["id"], int(quote["initial_cash"]), coins_cost,
                source_type, quote_id, transaction_id, at,
            ),
        )
        if coins_cost:
            connection.execute(
                "UPDATE wallets SET growth_coins = ?, version = version + 1, updated_at = ? WHERE user_id = ?",
                (balance_after, at, user_id),
            )
        connection.execute(
            """INSERT INTO wallet_ledger
               (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
               VALUES (?, ?, 'LIFE_START', ?, ?, 'LIFE_START', ?, ?, ?)""",
            (
                uuid4().hex, user_id, -coins_cost, balance_after, quote_id,
                f"确认{option['label']}：初始现金 ¥{int(quote['initial_cash']):,}", at,
            ),
        )
        connection.execute(
            """INSERT INTO initial_cash_transactions
               (id, user_id, quote_id, option_id, initial_cash, coins_spent, wallet_balance_after, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (transaction_id, user_id, quote_id, option["id"], int(quote["initial_cash"]), coins_cost, balance_after, at),
        )
        connection.execute("UPDATE initial_cash_quotes SET consumed_at = ? WHERE id = ?", (at, quote_id))
        profile = profile_snapshot(connection, user_id)
        response = {
            "transaction": {
                "id": transaction_id,
                "option_id": option["id"],
                "initial_cash": int(quote["initial_cash"]),
                "coins_spent": coins_cost,
                "wallet_balance_after": balance_after,
            },
            "initial_cash": profile["initial_cash"],
            "selected_option": profile["selected_option"],
            "profile": profile,
        }
        _save_idempotency(connection, user_id, "confirm_initial_cash", idempotency_key, request_hash, response)
        return response


def apply_quote(connection: sqlite3.Connection, user_id: str, quote_id: str, idempotency_key: str, is_minor: bool = False) -> dict[str, Any]:
    if not idempotency_key or len(idempotency_key) > 160:
        raise ApiError("IDEMPOTENCY_REQUIRED", "升级请求缺少有效的防重复标识。")
    request_hash = _request_hash(quote_id)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        repeated = _idempotent_response(connection, user_id, "upgrade", idempotency_key, request_hash)
        if repeated:
            return repeated
        quote_row = connection.execute("SELECT * FROM growth_quotes WHERE id = ? AND user_id = ?", (quote_id, user_id)).fetchone()
        if not quote_row:
            raise ApiError("QUOTE_NOT_FOUND", "报价不存在，请重新预览。", 404)
        if quote_row["consumed_at"]:
            raise ApiError("QUOTE_USED", "这份报价已经使用，请重新预览。", 409)
        if parse_timestamp(quote_row["expires_at"]) <= now():
            raise ApiError("QUOTE_EXPIRED", "报价已过期，请重新预览。", 409)
        user = _user_row(connection, user_id)
        wallet = _wallet_row(connection, user_id)
        attributes_row = _attributes_row(connection, user_id)
        if int(attributes_row["version"]) != int(quote_row["attribute_version"]):
            raise ApiError("QUOTE_STALE", "属性已经变化，请重新预览价格。", 409)
        action = json.loads(quote_row["action_json"])
        quote = simulate_upgrade(attributes_from_row(attributes_row), int(user["free_growth_points"]), int(user["vip_level"]), action)
        quoted = json.loads(quote_row["quote_json"])
        if quote["coins_cost"] != int(quoted["coins_cost"]):
            raise ApiError("QUOTE_STALE", "优惠或属性状态已变化，请重新预览价格。", 409)
        if int(wallet["growth_coins"]) < quote["coins_cost"]:
            raise ApiError(
                "INSUFFICIENT_COINS",
                "成长币不足，充值后即可继续改变人生。",
                409,
                {"required": quote["coins_cost"], "balance": int(wallet["growth_coins"])},
            )
        attributes_after = quote["attributes_after"]
        assignments = ", ".join(f"{key} = ?" for key in ATTRIBUTE_KEYS)
        updated_at = timestamp()
        connection.execute(
            f"UPDATE player_attributes SET {assignments}, version = version + 1, updated_at = ? WHERE user_id = ?",
            (*(attributes_after[key] for key in ATTRIBUTE_KEYS), updated_at, user_id),
        )
        new_free_points = int(user["free_growth_points"]) - quote["free_points_used"]
        connection.execute("UPDATE users SET free_growth_points = ?, updated_at = ? WHERE id = ?", (new_free_points, updated_at, user_id))
        new_balance = int(wallet["growth_coins"]) - quote["coins_cost"]
        if quote["coins_cost"]:
            connection.execute("UPDATE wallets SET growth_coins = ?, version = version + 1, updated_at = ? WHERE user_id = ?", (new_balance, updated_at, user_id))
            transaction_id = uuid4().hex
            connection.execute(
                """INSERT INTO wallet_ledger (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
                   VALUES (?, ?, 'UPGRADE', ?, ?, 'UPGRADE', ?, ?, ?)""",
                (transaction_id, user_id, -quote["coins_cost"], new_balance, quote_id, f"提升{quote['label']} {quote['quantity']}点", updated_at),
            )
        transaction_id = uuid4().hex
        connection.execute(
            """INSERT INTO progression_transactions (id, user_id, quote_id, attribute_key, quantity, free_points_used, coins_spent, before_json, after_json, wallet_balance_after, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (transaction_id, user_id, quote_id, quote["attribute"], quote["quantity"], quote["free_points_used"], quote["coins_cost"], json.dumps({quote["attribute"]: quote["before"]}), json.dumps({quote["attribute"]: quote["after"]}), new_balance, updated_at),
        )
        connection.execute("UPDATE growth_quotes SET consumed_at = ? WHERE id = ?", (updated_at, quote_id))
        response = {
            "transaction": {"id": transaction_id, "attribute": quote["attribute"], "before": quote["before"], "after": quote["after"], "coins_spent": quote["coins_cost"], "free_points_used": quote["free_points_used"]},
            "profile": profile_snapshot(connection, user_id),
        }
        _save_idempotency(connection, user_id, "upgrade", idempotency_key, request_hash, response)
        return response


def product_catalog(connection: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    user = _user_row(connection, user_id)
    first_available = not bool(user["first_recharge_claimed"])
    products = []
    for product in TOPUP_PRODUCTS.values():
        products.append({**product, "first_recharge_bonus": product["coins"] if first_available else 0, "first_recharge_available": first_available})
    return {"products": products, "minor": bool(user["is_minor"]), "monthly_minor_limit_cents": int(user["monthly_minor_limit_cents"])}


def _minor_payment_check(connection: sqlite3.Connection, user: sqlite3.Row, amount_cents: int) -> None:
    if not user["is_minor"]:
        return
    month_start = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    spent = connection.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payment_orders WHERE user_id = ? AND status = 'PAID' AND paid_at >= ?",
        (user["id"], timestamp(month_start)),
    ).fetchone()["total"]
    limit = int(user["monthly_minor_limit_cents"])
    if int(spent) + amount_cents > limit:
        raise ApiError("MINOR_LIMIT", "未成年人本月充值额度已达上限，请联系监护人后再试。", 403, {"limit": limit, "spent": int(spent), "requested": amount_cents})


def create_payment_order(connection: sqlite3.Connection, user_id: str, sku: str, idempotency_key: str, is_minor: bool = False) -> dict[str, Any]:
    if sku not in TOPUP_PRODUCTS:
        raise ApiError("PRODUCT_NOT_FOUND", "充值套餐不存在。", 404)
    if not idempotency_key or len(idempotency_key) > 160:
        raise ApiError("IDEMPOTENCY_REQUIRED", "创建订单需要防重复标识。")
    request_hash = _request_hash(sku)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        repeated = _idempotent_response(connection, user_id, "create_order", idempotency_key, request_hash)
        if repeated:
            return {**repeated, "idempotent_replay": True}
        user = _user_row(connection, user_id)
        product = TOPUP_PRODUCTS[sku]
        _minor_payment_check(connection, user, int(product["price_cents"]))
        order_id = uuid4().hex
        out_trade_no = f"LIFE{now().strftime('%Y%m%d%H%M%S')}{uuid4().hex[:10].upper()}"
        created_at = timestamp()
        expires_at = timestamp(now() + timedelta(minutes=30))
        connection.execute(
            """INSERT INTO payment_orders (id, user_id, out_trade_no, product_sku, amount_cents, base_coins, channel, status, created_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, 'WECHAT', 'PENDING', ?, ?)""",
            (order_id, user_id, out_trade_no, sku, product["price_cents"], product["coins"], created_at, expires_at),
        )
        response = {
            "order": {
                "id": order_id, "out_trade_no": out_trade_no, "sku": sku, "amount_cents": product["price_cents"], "amount": money(product["price_cents"]),
                "base_coins": product["coins"], "first_recharge_candidate": not bool(user["first_recharge_claimed"]), "expires_at": expires_at, "status": "PENDING",
            }
        }
        _save_idempotency(connection, user_id, "create_order", idempotency_key, request_hash, response)
        return response


def order_for_user(connection: sqlite3.Connection, user_id: str, order_id: str) -> dict[str, Any]:
    row = connection.execute("SELECT * FROM payment_orders WHERE id = ? AND user_id = ?", (order_id, user_id)).fetchone()
    if not row:
        raise ApiError("ORDER_NOT_FOUND", "订单不存在。", 404)
    return {
        "id": row["id"], "out_trade_no": row["out_trade_no"], "sku": row["product_sku"], "amount_cents": int(row["amount_cents"]),
        "amount": money(int(row["amount_cents"])), "base_coins": int(row["base_coins"]), "bonus_coins": int(row["bonus_coins"]),
        "total_coins": int(row["total_coins"]), "status": row["status"], "paid_at": row["paid_at"], "expires_at": row["expires_at"], "prepay_id": row["prepay_id"],
    }


def attach_prepay_id(connection: sqlite3.Connection, user_id: str, order_id: str, prepay_id: str) -> None:
    row = connection.execute("SELECT id FROM payment_orders WHERE id = ? AND user_id = ? AND status = 'PENDING'", (order_id, user_id)).fetchone()
    if not row:
        raise ApiError("ORDER_NOT_PAYABLE", "订单当前不能发起支付。", 409)
    connection.execute("UPDATE payment_orders SET prepay_id = ? WHERE id = ?", (prepay_id, order_id))


def settle_payment(connection: sqlite3.Connection, order_id: str, transaction_id: str, amount_cents: int, raw_payload: dict[str, Any] | None = None) -> dict[str, Any]:
    with write_transaction(connection):
        order = connection.execute("SELECT * FROM payment_orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            raise ApiError("ORDER_NOT_FOUND", "订单不存在。", 404)
        if order["status"] == "PAID":
            return {"order": order_for_user(connection, order["user_id"], order_id), "profile": profile_snapshot(connection, order["user_id"]), "already_processed": True}
        if order["status"] != "PENDING":
            raise ApiError("ORDER_NOT_PAYABLE", "订单当前不能支付。", 409)
        if int(order["amount_cents"]) != int(amount_cents):
            raise ApiError("PAYMENT_AMOUNT_MISMATCH", "支付金额校验失败。", 409)
        duplicate = connection.execute("SELECT id FROM payment_orders WHERE wechat_transaction_id = ?", (transaction_id,)).fetchone()
        if duplicate:
            raise ApiError("DUPLICATE_PAYMENT", "该支付流水已经处理。", 409)
        user = _user_row(connection, order["user_id"])
        wallet = _wallet_row(connection, order["user_id"])
        first = not bool(user["first_recharge_claimed"])
        base_coins = int(order["base_coins"])
        bonus_coins = base_coins if first else 0
        total_coins = base_coins + bonus_coins
        paid_at = timestamp()
        new_total = int(user["total_recharge_cents"]) + int(order["amount_cents"])
        vip_level = level_for_recharge(new_total)
        new_balance = int(wallet["growth_coins"]) + total_coins
        connection.execute(
            """UPDATE payment_orders SET status = 'PAID', bonus_coins = ?, total_coins = ?, wechat_transaction_id = ?, paid_at = ? WHERE id = ?""",
            (bonus_coins, total_coins, transaction_id, paid_at, order_id),
        )
        connection.execute(
            """UPDATE users SET total_recharge_cents = ?, vip_level = ?, first_recharge_claimed = CASE WHEN ? THEN 1 ELSE first_recharge_claimed END, updated_at = ? WHERE id = ?""",
            (new_total, vip_level, 1 if first else 0, paid_at, order["user_id"]),
        )
        connection.execute("UPDATE wallets SET growth_coins = ?, version = version + 1, updated_at = ? WHERE user_id = ?", (new_balance, paid_at, order["user_id"]))
        connection.execute(
            """INSERT INTO wallet_ledger (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
               VALUES (?, ?, 'TOPUP', ?, ?, 'ORDER', ?, ?, ?)""",
            (uuid4().hex, order["user_id"], total_coins, new_balance, order_id, f"充值{money(int(order['amount_cents']))}，获得 {total_coins} 成长币", paid_at),
        )
        if raw_payload is not None:
            connection.execute(
                """INSERT INTO payment_notifications (id, out_trade_no, wechat_transaction_id, raw_payload, received_at, verified_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (uuid4().hex, order["out_trade_no"], transaction_id, json.dumps(raw_payload, ensure_ascii=False), paid_at, paid_at),
            )
        return {"order": order_for_user(connection, order["user_id"], order_id), "profile": profile_snapshot(connection, order["user_id"]), "already_processed": False}


def simulate_payment(connection: sqlite3.Connection, settings: Settings, user_id: str, order_id: str) -> dict[str, Any]:
    if not settings.dev_payment_enabled:
        raise ApiError("DEV_PAYMENT_DISABLED", "正式环境禁止模拟充值。", 403)
    order = connection.execute("SELECT * FROM payment_orders WHERE id = ? AND user_id = ?", (order_id, user_id)).fetchone()
    if not order:
        raise ApiError("ORDER_NOT_FOUND", "订单不存在。", 404)
    return settle_payment(connection, order_id, f"DEV-{uuid4().hex.upper()}", int(order["amount_cents"]), {"environment": settings.app_env, "simulated": True})


def purchase_route(connection: sqlite3.Connection, user_id: str, route_id: str, idempotency_key: str, is_minor: bool = False) -> dict[str, Any]:
    route = ROUTE_CATALOG.get(route_id)
    if not route:
        raise ApiError("ROUTE_NOT_FOUND", "人生路线不存在。", 404)
    if not idempotency_key:
        raise ApiError("IDEMPOTENCY_REQUIRED", "购买路线需要防重复标识。")
    request_hash = _request_hash(route_id)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        repeated = _idempotent_response(connection, user_id, "purchase_route", idempotency_key, request_hash)
        if repeated:
            return repeated
        user = _user_row(connection, user_id)
        wallet = _wallet_row(connection, user_id)
        if int(user["vip_level"]) < route["min_vip"]:
            raise ApiError("VIP_REQUIRED", f"这条路线需要 VIP{route['min_vip']} 才能开启。", 403)
        if connection.execute("SELECT 1 FROM user_entitlements WHERE user_id = ? AND entitlement_key = ?", (user_id, route_id)).fetchone():
            raise ApiError("ALREADY_UNLOCKED", "这条人生路线已经开启。", 409)
        price = int(route["price_coins"])
        if int(wallet["growth_coins"]) < price:
            raise ApiError("INSUFFICIENT_COINS", "成长币不足，充值后即可继续改变人生。", 409, {"required": price, "balance": int(wallet["growth_coins"])})
        at = timestamp()
        new_balance = int(wallet["growth_coins"]) - price
        source_id = uuid4().hex
        connection.execute("UPDATE wallets SET growth_coins = ?, version = version + 1, updated_at = ? WHERE user_id = ?", (new_balance, at, user_id))
        connection.execute("INSERT INTO user_entitlements (user_id, entitlement_key, source_type, source_id, granted_at) VALUES (?, ?, 'ROUTE_PURCHASE', ?, ?)", (user_id, route_id, source_id, at))
        connection.execute(
            """INSERT INTO wallet_ledger (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
               VALUES (?, ?, 'ROUTE', ?, ?, 'ROUTE', ?, ?, ?)""",
            (uuid4().hex, user_id, -price, new_balance, route_id, f"开启{route['name']}", at),
        )
        response = {"route": route_id, "profile": profile_snapshot(connection, user_id)}
        _save_idempotency(connection, user_id, "purchase_route", idempotency_key, request_hash, response)
        return response


def claim_daily_reward(connection: sqlite3.Connection, user_id: str, idempotency_key: str, is_minor: bool = False) -> dict[str, Any]:
    if not idempotency_key:
        raise ApiError("IDEMPOTENCY_REQUIRED", "领取奖励需要防重复标识。")
    date_key = now().date().isoformat()
    request_hash = _request_hash(date_key)
    with write_transaction(connection):
        ensure_user(connection, user_id, is_minor)
        repeated = _idempotent_response(connection, user_id, "daily_reward", idempotency_key, request_hash)
        if repeated:
            return repeated
        user = _user_row(connection, user_id)
        reward = int(VIP_BENEFITS[int(user["vip_level"])]["daily_coins"])
        if reward <= 0:
            raise ApiError("VIP_REQUIRED", "VIP1 起可领取每日成长币。", 403)
        if user["daily_reward_date"] == date_key:
            raise ApiError("DAILY_REWARD_CLAIMED", "今天的每日成长币已经领取。", 409)
        wallet = _wallet_row(connection, user_id)
        at = timestamp()
        new_balance = int(wallet["growth_coins"]) + reward
        connection.execute("UPDATE users SET daily_reward_date = ?, updated_at = ? WHERE id = ?", (date_key, at, user_id))
        connection.execute("UPDATE wallets SET growth_coins = ?, version = version + 1, updated_at = ? WHERE user_id = ?", (new_balance, at, user_id))
        connection.execute(
            """INSERT INTO wallet_ledger (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
               VALUES (?, ?, 'VIP_DAILY', ?, ?, 'VIP_DAILY', ?, ?, ?)""",
            (uuid4().hex, user_id, reward, new_balance, date_key, "VIP 每日成长币", at),
        )
        response = {"reward": reward, "profile": profile_snapshot(connection, user_id)}
        _save_idempotency(connection, user_id, "daily_reward", idempotency_key, request_hash, response)
        return response


def ledger(connection: sqlite3.Connection, user_id: str, record_type: str | None = None) -> dict[str, list[dict[str, Any]]]:
    query = "SELECT * FROM wallet_ledger WHERE user_id = ?"
    values: list[Any] = [user_id]
    if record_type == "recharge":
        query += " AND kind = 'TOPUP'"
    elif record_type == "spend":
        query += " AND kind IN ('UPGRADE', 'ROUTE', 'LIFE_START')"
    query += " ORDER BY created_at DESC LIMIT 100"
    rows = connection.execute(query, values).fetchall()
    return {
        "records": [
            {"id": row["id"], "kind": row["kind"], "coin_delta": int(row["coin_delta"]), "balance_after": int(row["balance_after"]), "description": row["description"], "created_at": row["created_at"], "reference_id": row["reference_id"]}
            for row in rows
        ]
    }
