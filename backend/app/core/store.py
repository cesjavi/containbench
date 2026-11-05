import sqlite3
import threading
from pathlib import Path
from typing import List, Optional, Type, TypeVar

from pydantic import BaseModel

from app.config import settings
from app.models.schemas import ApprovalRequest, RunResult

T = TypeVar("T", bound=BaseModel)


class SQLiteStore:
    """
    Durable storage for runs and approval requests.
    Each record is stored as its JSON document; the columns only serve lookups and ordering.
    """

    _TABLES = ("runs", "approvals")

    def __init__(self, path: str):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._lock = threading.Lock()
        with self._lock, self._conn:
            for table in self._TABLES:
                self._conn.execute(
                    f"CREATE TABLE IF NOT EXISTS {table} ("
                    "id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT, data TEXT NOT NULL)"
                )

    def _put(self, table: str, record_id: str, created_at: str, status: Optional[str], model: BaseModel) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                f"INSERT OR REPLACE INTO {table} (id, created_at, status, data) VALUES (?, ?, ?, ?)",
                (record_id, created_at, status, model.model_dump_json()),
            )

    def _get(self, table: str, record_id: str, model: Type[T]) -> Optional[T]:
        with self._lock:
            row = self._conn.execute(f"SELECT data FROM {table} WHERE id = ?", (record_id,)).fetchone()
        return model.model_validate_json(row[0]) if row else None

    def _list(self, table: str, model: Type[T], status: Optional[str] = None,
              limit: Optional[int] = None) -> List[T]:
        query = f"SELECT data FROM {table}"
        params: tuple = ()
        if status is not None:
            query += " WHERE status = ?"
            params = (status,)
        query += " ORDER BY created_at DESC"
        if limit is not None:
            query += " LIMIT ?"
            params += (limit,)
        with self._lock:
            rows = self._conn.execute(query, params).fetchall()
        return [model.model_validate_json(r[0]) for r in rows]

    # Runs
    def put_run(self, run: RunResult) -> None:
        self._put("runs", run.id, run.created_at, run.status.value, run)

    def get_run(self, run_id: str) -> Optional[RunResult]:
        return self._get("runs", run_id, RunResult)

    def list_runs(self, limit: Optional[int] = None) -> List[RunResult]:
        return self._list("runs", RunResult, limit=limit)

    # Approvals
    def put_approval(self, approval: ApprovalRequest) -> None:
        self._put("approvals", approval.id, approval.created_at, approval.status.value, approval)

    def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        return self._get("approvals", approval_id, ApprovalRequest)

    def list_approvals(self, status: Optional[str] = None) -> List[ApprovalRequest]:
        return self._list("approvals", ApprovalRequest, status)


store = SQLiteStore(settings.DATABASE_PATH)
