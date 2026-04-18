import cv2
import threading
import time

from vision import analyze_frame
from context_engine import ContextEngine
from braille import cell_to_char
from serial_bridge import SerialBridge
from chord_input import ChordDecoder
from audio import speak

CV_MODE    = 'cv'
TEXT_MODE  = 'text'
VOICE_MODE = 'voice'

bridge  = SerialBridge()
context = ContextEngine()
decoder = ChordDecoder()
cap     = cv2.VideoCapture(0)
mode    = CV_MODE
running = True


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
            bridge.send_text(label)

        cv2.imshow('BlindAide — CV debug', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


def chord_loop():
    buffer = []
    while running:
        chord = bridge.read_chord()
        if chord is not None:
            ch = decoder.decode(chord)
            if ch == ' ':
                word = ''.join(buffer)
                print(f"[CHORD] Word: {word}")
                speak(word)
                buffer.clear()
            elif ch is not None:
                buffer.append(ch)
                print(f"[CHORD] Char: {ch}")
        time.sleep(0.02)


def main():
    global mode, running

    print("BlindAide starting...")
    print("  ENTER (empty) = toggle mode (CV / Text / Voice)")
    print("  q             = quit\n")

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
            bridge.send_text(user_in)
            speak(user_in)

        elif mode == VOICE_MODE:
            from audio import listen_for_input
            print("Listening...")
            text = listen_for_input(timeout=5)
            if text:
                print(f"Heard: {text}")
                bridge.send_text(text)
                speak(text)

    cap.release()
    cv2.destroyAllWindows()
    bridge.close()


if __name__ == '__main__':
    main()
