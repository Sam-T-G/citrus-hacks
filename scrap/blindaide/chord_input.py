from scrap.blindaide.braille import REVERSE_MAP, CAPITAL_PREFIX

# Control command bytes — must match the CMD_* constants in blindaide.ino.
# All values are > 0x3F so they never collide with valid 6-bit chord bytes.
CMD_SPACE     = 0x40
CMD_FINISH    = 0x41
CMD_BACKSPACE = 0x42
CMD_SEND      = 0x43


class ChordDecoder:
    def __init__(self):
        self.capitalize_next = False

    def decode(self, incoming_byte):
        """
        Decodes a byte received from the Arduino.

        The Arduino sends two kinds of bytes:
          - Chord bytes  (0x00–0x3F): 6-bit bitmask of dots pressed simultaneously.
          - Control bytes (0x40–0x43): single-button commands (space, finish, backspace, send).

        Returns one of:
          - A single character string (e.g. 'h', 'A', ' ')
          - 'CMD_FINISH'    — user pressed the finish-letter button
          - 'CMD_BACKSPACE' — user pressed backspace
          - 'CMD_SEND'      — user pressed send
          - None            — capital prefix received; next chord will be uppercased
        """
        # ── Control buttons ───────────────────────────────────────────────────
        if incoming_byte == CMD_SPACE:
            return ' '
        if incoming_byte == CMD_FINISH:
            return 'CMD_FINISH'
        if incoming_byte == CMD_BACKSPACE:
            return 'CMD_BACKSPACE'
        if incoming_byte == CMD_SEND:
            return 'CMD_SEND'

        # ── Chord bytes (6-bit Braille cell) ─────────────────────────────────
        if incoming_byte == CAPITAL_PREFIX:
            self.capitalize_next = True
            return None  # prefix only — wait for the next chord byte

        ch = REVERSE_MAP.get(incoming_byte & 0b111111, '?')

        if self.capitalize_next and ch.isalpha():
            ch = ch.upper()
            self.capitalize_next = False

        return ch
