import asyncio
import random
from typing import Awaitable, Callable

from mira.arduino.commands import ArduinoCommand, validate
from mira.arduino.serial_bridge import SensorCallback, SensorReading
from mira.utils.logging import get_logger

log = get_logger(__name__)


class MockArduino:
    """In-memory Arduino mock. Accepts commands, emits synthetic sensor readings."""

    def __init__(
        self,
        on_sensor: SensorCallback | None = None,
        sensor_interval: float = 0.1,
        pir_transitions: list[float] | None = None,  # times (s) to flip PIR
    ) -> None:
        self._on_sensor = on_sensor
        self._sensor_interval = sensor_interval
        self._pir_transitions = pir_transitions or [3.0]  # PIR goes active after 3s by default
        self._commands: list[ArduinoCommand] = []
        self._connected = False
        self._task: asyncio.Task | None = None
        self._latest: SensorReading | None = None

    async def connect(self) -> None:
        self._connected = True
        self._task = asyncio.create_task(self._emit_loop())
        log.info("mock_arduino.connected")

    async def disconnect(self) -> None:
        if self._task:
            self._task.cancel()
        self._connected = False
        log.info("mock_arduino.disconnected")

    async def send(self, **kwargs) -> None:
        try:
            cmd = validate(kwargs)
        except ValueError as e:
            log.warning("mock_arduino.invalid_command", error=str(e))
            return
        self._commands.append(cmd)
        log.info("mock_arduino.command_received", cmd=cmd)

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def latest(self) -> SensorReading | None:
        return self._latest

    @property
    def received_commands(self) -> list[ArduinoCommand]:
        return list(self._commands)

    async def _emit_loop(self) -> None:
        start = asyncio.get_event_loop().time()
        pir = False
        transitions = sorted(self._pir_transitions)

        while True:
            await asyncio.sleep(self._sensor_interval)
            elapsed = asyncio.get_event_loop().time() - start

            # Flip PIR at configured times
            while transitions and elapsed >= transitions[0]:
                pir = not pir
                transitions.pop(0)
                log.debug("mock_arduino.pir_transition", pir=pir)

            reading = SensorReading(
                temp=round(20.0 + random.uniform(-0.5, 0.5), 1),
                prox=round(random.uniform(40, 120), 1),
                pir=pir,
                raw={},
            )
            self._latest = reading
            if self._on_sensor:
                await self._on_sensor(reading)
