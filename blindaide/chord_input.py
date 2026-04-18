from braille import REVERSE_MAP, CAPITAL_PREFIX


class ChordDecoder:
    def __init__(self):
        self.capitalize_next = False

    def decode(self, chord_byte):
        """
        Takes a 6-bit chord byte from the Arduino.
        Returns the decoded character string, or None for control codes.
        """
        if chord_byte == CAPITAL_PREFIX:
            self.capitalize_next = True
            return None  # prefix — wait for next chord

        ch = REVERSE_MAP.get(chord_byte & 0b111111, '?')

        if self.capitalize_next and ch.isalpha():
            ch = ch.upper()
            self.capitalize_next = False

        return ch
