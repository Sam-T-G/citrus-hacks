import asyncio
from enum import Enum, auto

from mira.config import get_config
from mira.utils.logging import get_logger

log = get_logger(__name__)


class PresenceState(Enum):
    ASLEEP  = auto()   # no presence detected; engine stopped
    WAKING  = auto()   # presence just detected; brief debounce before full wake
    AWAKE   = auto()   # actively conversing; engine running
    DORMANT = auto()   # presence faded; grace period before sleep


class PresenceManager:
    """State machine: PIR sensor events → PresenceState transitions.

    ASLEEP ──pir on──► WAKING ──debounce──► AWAKE
    AWAKE  ──pir off──► DORMANT ──timeout──► ASLEEP
    DORMANT ──pir on──► AWAKE  (immediate re-wake)
    """

    WAKE_DEBOUNCE_S = 2.0

    def __init__(self) -> None:
        cfg = get_config()
        self._awake_to_dormant   = cfg.awake_to_dormant_seconds
        self._dormant_to_asleep  = cfg.dormant_to_asleep_seconds
        self._state              = PresenceState.ASLEEP
        self._timer_task: asyncio.Task | None = None

    @property
    def state(self) -> PresenceState:
        return self._state

    def on_pir_change(self, pir_active: bool) -> PresenceState:
        """Call with current PIR value. Returns new state (may be unchanged)."""
        prev = self._state

        if pir_active:
            if self._state in (PresenceState.ASLEEP,):
                self._transition(PresenceState.WAKING)
                self._schedule(self.WAKE_DEBOUNCE_S, self._finish_waking)
            elif self._state == PresenceState.DORMANT:
                self._cancel_timer()
                self._transition(PresenceState.AWAKE)
        else:
            if self._state == PresenceState.AWAKE:
                self._transition(PresenceState.DORMANT)
                self._schedule(self._awake_to_dormant, self._begin_sleep_countdown)
            elif self._state == PresenceState.WAKING:
                self._cancel_timer()
                self._transition(PresenceState.ASLEEP)

        if self._state != prev:
            log.info("presence.transition", prev=prev.name, new=self._state.name)

        return self._state

    async def force_wake(self) -> None:
        self._cancel_timer()
        self._transition(PresenceState.AWAKE)

    async def force_sleep(self) -> None:
        self._cancel_timer()
        self._transition(PresenceState.ASLEEP)

    # ── internal ──────────────────────────────────────────────────────────────

    def _transition(self, new: PresenceState) -> None:
        self._state = new

    def _schedule(self, delay: float, coro_fn) -> None:
        self._cancel_timer()
        self._timer_task = asyncio.create_task(self._delayed(delay, coro_fn))

    async def _delayed(self, delay: float, coro_fn) -> None:
        await asyncio.sleep(delay)
        await coro_fn()

    def _cancel_timer(self) -> None:
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        self._timer_task = None

    async def _finish_waking(self) -> None:
        if self._state == PresenceState.WAKING:
            self._transition(PresenceState.AWAKE)
            log.info("presence.awake")

    async def _begin_sleep_countdown(self) -> None:
        if self._state == PresenceState.DORMANT:
            self._schedule(self._dormant_to_asleep, self._go_to_sleep)

    async def _go_to_sleep(self) -> None:
        if self._state == PresenceState.DORMANT:
            self._transition(PresenceState.ASLEEP)
            log.info("presence.asleep")
