import serial
import serial.tools.list_ports
import time
from config import SERIAL_PORT, SERIAL_BAUD


def find_arduino_port():
    ports = serial.tools.list_ports.comports()
    for p in ports:
        desc = p.description or ''
        if 'Arduino' in desc or 'CH340' in desc or 'ttyUSB' in p.device or 'ttyACM' in p.device:
            return p.device
    return None


class SerialBridge:
    def __init__(self, port=None, baud=None):
        port = port or SERIAL_PORT or find_arduino_port()
        baud = baud or SERIAL_BAUD
        if port is None:
            raise RuntimeError("Arduino not found. Check USB connection.")
        self.ser = serial.Serial(port, baud, timeout=1)
        time.sleep(2)  # wait for Arduino reset after serial open
        print(f"Connected to Arduino on {port}")

    def send_cell(self, byte_val):
        """Send a single braille cell byte to the Arduino display."""
        self.ser.write(bytes([byte_val & 0xFF]))

    def send_text(self, text, cell_duration=None):
        """Send a full string to the display, one cell at a time."""
        from config import CELL_DURATION
        from braille import text_to_cells
        dur = cell_duration if cell_duration is not None else CELL_DURATION
        for cell in text_to_cells(text):
            self.send_cell(cell)
            time.sleep(dur)
        self.send_cell(0b000000)  # blank cell after word ends

    def read_chord(self):
        """Read a chord byte sent by the Arduino keyboard. Returns int or None."""
        if self.ser.in_waiting > 0:
            return ord(self.ser.read(1))
        return None

    def close(self):
        self.ser.close()
