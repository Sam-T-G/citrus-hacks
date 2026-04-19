import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from mira.utils.logging import get_logger

log = get_logger(__name__)


class MemoryStore:
    """Persistent memory across sessions. JSON on disk, human-readable."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._data: dict = {"sessions": [], "carer_notes": [], "mood_log": []}
        self._current_session_id: str | None = None
        self._lock = asyncio.Lock()
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            self._data = json.loads(path.read_text())

    async def start_session(self) -> str:
        self._current_session_id = str(uuid.uuid4())[:8]
        session = {
            "id": self._current_session_id,
            "started": datetime.now(timezone.utc).isoformat(),
            "ended": None,
            "summary": None,
        }
        async with self._lock:
            self._data["sessions"].append(session)
            self._data["sessions"] = self._data["sessions"][-30:]
            await self._save()
        log.info("memory.session_started", session_id=self._current_session_id)
        return self._current_session_id

    async def end_session(self, summary: str) -> None:
        async with self._lock:
            for s in self._data["sessions"]:
                if s["id"] == self._current_session_id:
                    s["ended"]  = datetime.now(timezone.utc).isoformat()
                    s["summary"] = summary
                    break
            await self._save()
        log.info("memory.session_ended", session_id=self._current_session_id)
        self._current_session_id = None

    async def add_carer_note(self, note: str) -> None:
        async with self._lock:
            self._data["carer_notes"].append({
                "date": datetime.now(timezone.utc).date().isoformat(),
                "note": note,
            })
            self._data["carer_notes"] = self._data["carer_notes"][-50:]
            await self._save()

    def latest_carer_note(self) -> str | None:
        notes = self._data.get("carer_notes", [])
        return notes[-1]["note"] if notes else None

    async def log_mood(self, mood: str, context: str | None = None) -> None:
        async with self._lock:
            self._data["mood_log"].append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "mood": mood,
                "context": context,
            })
            self._data["mood_log"] = self._data["mood_log"][-500:]
            await self._save()

    def build_context_note(self) -> str:
        parts: list[str] = []

        sessions = self._data.get("sessions", [])
        if sessions:
            last = next((s for s in reversed(sessions) if s.get("ended")), None)
            if last:
                parts.append(f"Last session: {last['started'][:10]}. Summary: {last.get('summary', 'no summary')}")

        note = self.latest_carer_note()
        if note:
            parts.append(f"Carer note: {note}")

        recent_moods = [m["mood"] for m in self._data.get("mood_log", [])[-5:]]
        if recent_moods:
            parts.append(f"Recent mood: {', '.join(recent_moods)}")

        return "\n".join(parts) if parts else "No prior context available."

    async def _save(self) -> None:
        self._path.write_text(json.dumps(self._data, indent=2))
