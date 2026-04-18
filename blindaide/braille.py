"""
Grade 1 English Braille encoding.
Each character maps to a 6-bit integer.
Bit positions correspond to braille dots:
  bit 0 = dot 1 (top-left)
  bit 1 = dot 2 (mid-left)
  bit 2 = dot 3 (bottom-left)
  bit 3 = dot 4 (top-right)
  bit 4 = dot 5 (mid-right)
  bit 5 = dot 6 (bottom-right)

Braille cell layout:
  dot1  dot4
  dot2  dot5
  dot3  dot6
"""

BRAILLE_MAP = {
    'A': 0b000001, 'B': 0b000011, 'C': 0b001001,
    'D': 0b011001, 'E': 0b010001, 'F': 0b001011,
    'G': 0b011011, 'H': 0b010011, 'I': 0b001010,
    'J': 0b011010, 'K': 0b000101, 'L': 0b000111,
    'M': 0b001101, 'N': 0b011101, 'O': 0b010101,
    'P': 0b001111, 'Q': 0b011111, 'R': 0b010111,
    'S': 0b001110, 'T': 0b011110, 'U': 0b100101,
    'V': 0b100111, 'W': 0b111010, 'X': 0b101101,
    'Y': 0b111101, 'Z': 0b110101,
    ' ': 0b000000,
    '.': 0b110010, ',': 0b000010, '?': 0b100110,
    '!': 0b010110, ';': 0b000110, ':': 0b010010,
    "'": 0b000100, '-': 0b100100,
}

# Reverse map: byte → character (for chord keyboard decoding)
REVERSE_MAP = {v: k for k, v in BRAILLE_MAP.items()}

# Capital indicator prefix byte (dot 6 = bit5)
CAPITAL_PREFIX = 0b100000


def text_to_cells(text):
    """Convert a string to a list of braille cell bytes."""
    cells = []
    for ch in text:
        upper = ch.upper()
        if ch.isupper() and upper in BRAILLE_MAP:
            cells.append(CAPITAL_PREFIX)
        if upper in BRAILLE_MAP:
            cells.append(BRAILLE_MAP[upper])
        else:
            cells.append(0b000000)  # unknown char → blank cell
    return cells


def cell_to_char(byte):
    """Decode a braille cell byte to a character. Returns '?' if unknown."""
    return REVERSE_MAP.get(byte & 0b111111, '?')


def debug_cell(byte):
    """Print a visual representation of a braille cell."""
    def dot(b, pos):
        return '●' if (b >> pos & 1) else '○'
    print(f"  {dot(byte,0)} {dot(byte,3)}")
    print(f"  {dot(byte,1)} {dot(byte,4)}")
    print(f"  {dot(byte,2)} {dot(byte,5)}")
