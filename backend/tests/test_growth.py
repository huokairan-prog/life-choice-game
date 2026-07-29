from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import sqlite3
import tempfile
import unittest

from backend.config import Settings
from backend.db import connect, init_database
from backend.growth import (
    ApiError,
    apply_quote,
    bootstrap_profile,
    confirm_initial_cash,
    create_initial_cash_quote,
    create_payment_order,
    create_quote,
    initial_cash_options,
    ledger,
    purchase_route,
    seed_initial_attributes,
    simulate_payment,
    simulate_upgrade,
)


def starter_character() -> dict:
    return {
        "body": {
            "height": 185,
            "weight": 70,
            "muscle": 55,
            "bodyFat": 14,
            "physical": {
                "strength": 35, "speed": 35, "endurance": 34, "agility": 35, "jump": 38,
                "coordination": 32, "reaction": 32, "recovery": 28, "resilience": 30,
            },
        },
        "appearance": {"temperament": "sunny", "style": "sport"},
        "personality": {"introversion": 58},
        "talents": {
            "learning": 20, "language": 18, "communication": 22, "leadership": 18,
            "creativity": 17, "logic": 17, "emotional": 22, "business": 17,
            "finance": 16, "sport": 28, "art": 12, "technology": 14,
            "execution": 24, "resilience": 22, "luckMode": "normal", "fatePoints": 0,
        },
    }


class GrowthDomainTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.settings = replace(Settings.from_env(), app_env="test", db_path=Path(self.temporary.name) / "test.db")
        init_database(self.settings)
        self.connection = connect(self.settings)
        bootstrap_profile(self.connection, "test-player")

    def tearDown(self) -> None:
        self.connection.close()
        self.temporary.cleanup()

    def test_one_time_character_seed_obeys_creator_budget(self) -> None:
        first = seed_initial_attributes(self.connection, "test-player", starter_character())
        self.assertTrue(first["seeded"])
        self.assertEqual(first["profile"]["attributes"]["height"], 185)
        self.assertTrue(first["profile"]["initial_attributes_seeded"])
        second = seed_initial_attributes(self.connection, "test-player", starter_character())
        self.assertFalse(second["seeded"])
        self.assertTrue(second["already_initialized"])

    def test_free_points_then_server_wallet_debit_and_idempotency(self) -> None:
        free_quote = create_quote(self.connection, self.settings, "test-player", {"attribute": "strength", "quantity": 1})
        self.assertEqual(free_quote["coins_cost"], 0)
        free_result = apply_quote(self.connection, "test-player", free_quote["id"], "free-once")
        self.assertEqual(free_result["profile"]["wallet"]["free_growth_points"], 7)

        order = create_payment_order(self.connection, "test-player", "coins_6", "order-6")
        repeated_order = create_payment_order(self.connection, "test-player", "coins_6", "order-6")
        self.assertTrue(repeated_order["idempotent_replay"])
        self.assertEqual(repeated_order["order"]["id"], order["order"]["id"])
        paid = simulate_payment(self.connection, self.settings, "test-player", order["order"]["id"])
        self.assertEqual(paid["order"]["total_coins"], 120)  # first recharge double

        paid_quote = create_quote(self.connection, self.settings, "test-player", {"attribute": "strength", "quantity": 8})
        self.assertGreater(paid_quote["coins_cost"], 0)
        paid_result = apply_quote(self.connection, "test-player", paid_quote["id"], "paid-once")
        self.assertGreater(paid_result["transaction"]["coins_spent"], 0)
        repeated = apply_quote(self.connection, "test-player", paid_quote["id"], "paid-once")
        self.assertEqual(repeated["transaction"]["id"], paid_result["transaction"]["id"])

    def test_stale_quote_and_body_surge_are_rejected_or_priced_server_side(self) -> None:
        one = create_quote(self.connection, self.settings, "test-player", {"attribute": "speed", "quantity": 1})
        two = create_quote(self.connection, self.settings, "test-player", {"attribute": "speed", "quantity": 1})
        apply_quote(self.connection, "test-player", one["id"], "first-speed")
        with self.assertRaises(ApiError) as stale:
            apply_quote(self.connection, "test-player", two["id"], "second-speed")
        self.assertEqual(stale.exception.code, "QUOTE_STALE")

        attrs = bootstrap_profile(self.connection, "test-player")["attributes"]
        to_195 = simulate_upgrade(attrs, 0, 0, {"attribute": "height", "target": 195})
        to_196 = simulate_upgrade(attrs, 0, 0, {"attribute": "height", "target": 196})
        self.assertGreater(to_196["coins_cost"], to_195["coins_cost"])

    def test_route_purchase_uses_server_coins_and_vip(self) -> None:
        order = create_payment_order(self.connection, "test-player", "coins_68", "order-68")
        payment = simulate_payment(self.connection, self.settings, "test-player", order["order"]["id"])
        self.assertGreaterEqual(payment["profile"]["vip"]["level"], 3)
        route = purchase_route(self.connection, "test-player", "basketball_star", "route-once")
        self.assertIn("basketball_star", [item["id"] for item in route["profile"]["routes"] if item["unlocked"]])

    def test_production_cannot_use_the_simulated_payment_endpoint(self) -> None:
        production = replace(self.settings, app_env="production")
        with self.assertRaises(ApiError) as blocked:
            simulate_payment(self.connection, production, "test-player", "does-not-matter")
        self.assertEqual(blocked.exception.code, "DEV_PAYMENT_DISABLED")

    def test_initial_cash_is_server_catalogued_paid_once_and_idempotent(self) -> None:
        options = initial_cash_options(self.connection, "test-player")
        ordinary = next(item for item in options["options"] if item["id"] == "ordinary")
        self.assertEqual(options["initial_cash"], 8000)
        self.assertEqual(ordinary["coins_cost"], 0)
        self.assertFalse(options["selected_option"]["confirmed"])

        quote = create_initial_cash_quote(self.connection, self.settings, "test-player", "prepared", {"resources": {"cash": 9999999}})
        self.assertEqual(quote["initial_cash"], 20000)
        self.assertEqual(quote["coins_cost"], 120)
        with self.assertRaises(ApiError) as insufficient:
            confirm_initial_cash(self.connection, "test-player", quote["id"], "initial-cash-insufficient")
        self.assertEqual(insufficient.exception.code, "INSUFFICIENT_COINS")
        self.assertFalse(initial_cash_options(self.connection, "test-player")["selected_option"]["confirmed"])

        order = create_payment_order(self.connection, "test-player", "coins_6", "initial-cash-order")
        simulate_payment(self.connection, self.settings, "test-player", order["order"]["id"])
        confirmed = confirm_initial_cash(self.connection, "test-player", quote["id"], "initial-cash-confirm")
        self.assertEqual(confirmed["initial_cash"], 20000)
        self.assertEqual(confirmed["selected_option"]["id"], "prepared")
        self.assertEqual(confirmed["transaction"]["coins_spent"], 120)
        self.assertEqual(confirmed["profile"]["wallet"]["growth_coins"], 0)
        repeated = confirm_initial_cash(self.connection, "test-player", quote["id"], "initial-cash-confirm")
        self.assertEqual(repeated["transaction"]["id"], confirmed["transaction"]["id"])
        spend_records = ledger(self.connection, "test-player", "spend")["records"]
        self.assertTrue(any(record["kind"] == "LIFE_START" for record in spend_records))

        character = starter_character()
        character["resources"] = {"cash": 9999999}
        seeded = seed_initial_attributes(self.connection, "test-player", character)
        self.assertEqual(seeded["profile"]["initial_cash"], 20000)
        self.assertTrue(seeded["profile"]["selected_option"]["locked"])
        with self.assertRaises(ApiError) as locked:
            create_initial_cash_quote(self.connection, self.settings, "test-player", "venture")
        self.assertEqual(locked.exception.code, "INITIAL_CASH_LOCKED")

    def test_initial_cash_defaults_to_free_8000_when_life_begins_without_purchase(self) -> None:
        bootstrap_profile(self.connection, "free-start")
        seeded = seed_initial_attributes(self.connection, "free-start", starter_character())
        self.assertEqual(seeded["profile"]["initial_cash"], 8000)
        option = seeded["profile"]["selected_option"]
        self.assertEqual(option["id"], "ordinary")
        self.assertEqual(option["coins_spent"], 0)
        self.assertTrue(option["confirmed"])
        self.assertTrue(option["locked"])

    def test_existing_wallet_ledger_schema_migrates_for_life_start_records(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            settings = replace(self.settings, db_path=Path(folder) / "legacy.db")
            legacy = sqlite3.connect(settings.db_path)
            legacy.executescript(
                """
                CREATE TABLE wallet_ledger (
                  id TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  kind TEXT NOT NULL CHECK (kind IN ('TOPUP', 'UPGRADE', 'ROUTE', 'VIP_DAILY', 'REFUND')),
                  coin_delta INTEGER NOT NULL,
                  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
                  reference_type TEXT NOT NULL,
                  reference_id TEXT NOT NULL,
                  description TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  UNIQUE (user_id, reference_type, reference_id, kind)
                );
                CREATE INDEX idx_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
                """
            )
            legacy.commit()
            legacy.close()
            init_database(settings)
            migrated = sqlite3.connect(settings.db_path)
            definition = migrated.execute(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'wallet_ledger'"
            ).fetchone()[0]
            migrated.close()
            self.assertIn("LIFE_START", definition)


if __name__ == "__main__":
    unittest.main()
