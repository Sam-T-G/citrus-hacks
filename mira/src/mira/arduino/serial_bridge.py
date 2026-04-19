import asyncio
import json
from dataclasses import dataclass
from typing import Awaitable, Callable

import serial_asyncio

from mira.arduino.commands import ArduinoCommand, validate
from mira.utils.logging import get_logger

log = get_logger(__name__)


@dataclass
class SensorReading:
    temp: float   # Celsius
    prox: float   # cm
    pir: bool     # motion detected
    raw: dict


SensorCallback = Callable[[SensorReading], Awaitable[None]]


class SerialBridge:
    """Async wrapper around pyserial-asyncio for Arduino communication."""

    def __init__(
        self,
        port: str,
        baud: int = 115200,
        on_sensor: SensorCallback | None = None,
    ) -> None:
        self._port = port
        self._baud = baud
        self._on_sensor = on_sensor
        self._writer: asyncio.StreamWriter | None = None
        self._reader: asyncio.StreamReader | None = None
        self._lock = asyncio.Lock()
        self._reader_task: asyncio.Task | None = None
        self._latest: SensorReading | None = None
        self._connected = False

    async def connect(self) -> None:
        while True:
            try:
                self._reader, self._writer = await serial_asyncio.open_serial_connection(
                    url=self._port, baudrate=self._baud
                )
                self._connected = True
                log.info("arduino.connected", port=self._port)
                self._reader_task = asyncio.create_task(self._read_loop())
                return
            except Exception as e:
                log.warning("arduino.connect_failed", error=str(e), retrying_in=2)
                await asyncio.sleep(2)

    async def disconnect(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
        if self._writer:
            self._writer.close()
        self._connected = False
        log.info("arduino.disconnected")

    async def send(self, **kwargs) -> None:
        """Send a validated JSON command to the Arduino."""
        if not self._writer:
            log.warning("arduino.send_skipped", reason="not connected", cmd=kwargs)
            return
        try:
            cmd: ArduinoCommand = validate(kwargs)
        except ValueError as e:
            log.warning("arduino.invalid_command", error=str(e))
            return

        line = json.dumps(cmd) + "\n"
        async with self._lock:
            self._writer.write(line.encode())
            await self._writer.drain()
        log.debug("arduino.sent", cmd=cmd)

    @property
    def latest(self) -> SensorReading | None:
        return self._latest

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def _read_loop(self) -> None:
        assert self._reader is not None
        while True:
            try:
                raw = await self._reader.readline()
                line = raw.decode(errors="replace").strip()
                if not line:
                    continue
                data = json.loads(line)
                reading = SensorReading(
                    temp=float(data.get("temp", 0)),
                    prox=float(data.get("prox", 0)),
                    pir=bool(data.get("pir", 0)),
                    raw=data,
                )
                self._latest = reading
                if self._on_sensor:
                    await self._on_sensor(reading)
            except json.JSONDecodeError:
                log.warning("arduino.malformed_json", line=line[:80])
            except Exception as e:
                log.warning("arduino.read_error", error=str(e))
                self._connected = False
                await asyncio.sleep(2)
                await self.connect()
                return
