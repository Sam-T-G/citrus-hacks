import cv2
import threading
import time

from scrap.blindaide.vision import analyze_frame
from scrap.blindaide.context_engine import ContextEngine
from scrap.blindaide.braille import text_to_cells
from scrap.blindaide.serial_bridge import SerialBridge
from scrap.blindaide.chord_input import ChordDecoder
from scrap.blindaide.audio import speak

CV_MODE    = 'cv'
TEXT_MODE  = 'text'
VOICE_MODE = 'voice'

bridge  = SerialBridge()
context = ContextEngine()
decoder = ChordDecoder()
cap     = cv2.VideoCapture(0)
mode    = CV_MODE
running = True

# --- Display state -----------------------------------------------------------
# Holds the sequence of cells for the current word/phrase being shown.
# The user presses SPACE to step forward one cell at a time.
_display_cells = []
_display_index = 0
_display_lock  = threading.Lock()


def start_display(text):
    """Load a new text string into the display and show the first cell."""
    global _display_cells, _display_index
    cells = text_to_cells(text.upper())
    with _display_lock:
        _display_cells = cells
        _display_index = 0
    if cells:
        bridge.send_cell(cells[0])
        print(f"[DISPLAY] Showing cell 1/{len(cells)}")


def advance_display():
    """
    Step to the next cell. Returns True if a cell was shown,
    False if the display was already finished (so SPACE can be
    treated as a word separator in input mode instead).
    """
    global _display_index
    with _display_lock:
        if not _display_cells:
            return False
        _display_index += 1
        if _display_index >= len(_display_cells):
            bridge.send_cell(0b000000)  # blank — end of text
            _display_cells.clear()
            _display_index = 0
            print("[DISPLAY] End of text — display cleared")
            return True  # still consumed the SPACE
        bridge.send_cell(_display_cells[_display_index])
        print(f"[DISPLAY] Showing cell {_display_index + 1}/{len(_display_cells)}")
        return True


# --- CV loop -----------------------------------------------------------------

def cv_loop():
    while running:
        ret, frame = cap.read()
        if not ret:
            continue
        cues  = analyze_frame(frame)
        label = context.process(cues)
        if label:
            print(f"[CV] Detected: {label}")
            speak(label)
            start_display(label)

        cv2.imshow('BlindAide — CV debug', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


# --- Chord input loop --------------------------------------------------------

def chord_loop():
    buffer = []
    while running:
        chord = bridge.read_chord()
        if chord is not None:
            ch = decoder.decode(chord)

            if ch is None:
                # Capital prefix received — next chord will be uppercased.
                # ChordDecoder tracks this internally; nothing to do here.
                pass

            elif ch == 'CMD_FINISH':
                # Arduino already accumulated the chord before sending it —
                # the character is already in the buffer via the chord byte.
                # FINISH has no separate action on the Python side.
                pass

            elif ch == 'CMD_BACKSPACE':
                if buffer:
                    removed = buffer.pop()
                    print(f"[CHORD] Backspace — removed '{removed}', buffer: {''.join(buffer)}")
                else:
                    print("[CHORD] Backspace — buffer already empty")

            elif ch == 'CMD_SEND':
                message = ''.join(buffer).strip()
                if message:
                    print(f"[CHORD] Send: {message}")
                    speak(message)
                buffer.clear()

            elif ch == ' ':
                # SPACE: advance the Braille display if one is active.
                # If no display is running, treat it as a word separator.
                if not advance_display():
                    word = ''.join(buffer).strip()
                    if word:
                        print(f"[CHORD] Word: {word}")
                        speak(word)
                    buffer.clear()

            else:
                buffer.append(ch)
                print(f"[CHORD] Char: {ch}  buffer: {''.join(buffer)}")

        time.sleep(0.02)


# --- Entry point -------------------------------------------------------------

def main():
    global mode, running

    print("BlindAide starting...")
    print("  ENTER (empty) = cycle mode (CV → Text → Voice)")
    print("  q             = quit")
    print("  SPACE button  = advance Braille display one cell\n")

    cv_thread    = threading.Thread(target=cv_loop,    daemon=True)
    chord_thread = threading.Thread(target=chord_loop, daemon=True)
    cv_thread.start()
    chord_thread.start()

    while True:
        user_in = input(f"[{mode.upper()} MODE] > ").strip()

        if user_in.lower() == 'q':
            running = False
            break

        if user_in == '':
            modes = [CV_MODE, TEXT_MODE, VOICE_MODE]
            mode  = modes[(modes.index(mode) + 1) % len(modes)]
            print(f"Switched to {mode.upper()} mode")
            continue

        if mode == TEXT_MODE:
            print(f"Sending to display: {user_in}")
            start_display(user_in)
            speak(user_in)

        elif mode == VOICE_MODE:
            from scrap.blindaide.audio import listen_for_input
            print("Listening...")
            text = listen_for_input(timeout=5)
            if text:
                print(f"Heard: {text}")
                start_display(text)
                speak(text)

    cap.release()
    cv2.destroyAllWindows()
    bridge.close()


if __name__ == '__main__':
    main()
