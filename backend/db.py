from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import sqlite3

try:
    from .config import Settings
except ImportError:  # Supports `python backend/app.py` during local development.
    from config import Settings


def connect(settings: Settings) -> sqlite3.Connection:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.db_path, timeout=8, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 8000")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_database(settings: Settings) -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    with connect(settings) as connection:
        connection.executescript(schema_path.read_text(encoding="utf-8"))
        _migrate_wallet_ledger_for_life_start(connection)


def _migrate_wallet_ledger_for_life_start(connection: sqlite3.Connection) -> None:
    """Upgrade databases created before LIFE_START was a valid ledger kind.

    SQLite cannot add a value to a CHECK constraint in place.  The migration
    copies the append-only ledger inside one transaction, so a failed upgrade
    leaves the original table intact.
    """
    row = connection.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'wallet_ledger'"
    ).fetchone()
    definition = str(row["sql"] or "") if row else ""
    if "LIFE_START" in definition:
        return
    connection.execute("BEGIN IMMEDIATE")
    try:
        connection.execute(
            """CREATE TABLE wallet_ledger__life_start_migration (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              kind TEXT NOT NULL CHECK (kind IN ('TOPUP', 'UPGRADE', 'ROUTE', 'LIFE_START', 'VIP_DAILY', 'REFUND')),
              coin_delta INTEGER NOT NULL,
              balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
              reference_type TEXT NOT NULL,
              reference_id TEXT NOT NULL,
              description TEXT NOT NULL,
              created_at TEXT NOT NULL,
              UNIQUE (user_id, reference_type, reference_id, kind)
            )"""
        )
        connection.execute(
            """INSERT INTO wallet_ledger__life_start_migration
               (id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at)
               SELECT id, user_id, kind, coin_delta, balance_after, reference_type, reference_id, description, created_at
               FROM wallet_ledger"""
        )
        connection.execute("DROP TABLE wallet_ledger")
        connection.execute("ALTER TABLE wallet_ledger__life_start_migration RENAME TO wallet_ledger")
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON wallet_ledger(user_id, created_at DESC)"
        )
    except Exception:
        connection.execute("ROLLBACK")
        raise
    else:
        connection.execute("COMMIT")


@contextmanager
def write_transaction(connection: sqlite3.Connection):
    connection.execute("BEGIN IMMEDIATE")
    try:
        yield connection
    except Exception:
        connection.execute("ROLLBACK")
        raise
    else:
        connection.execute("COMMIT")
