import threading
import pyttsx3
from scrap.blindaide.config import TTS_RATE, TTS_ENABLED

engine = pyttsx3.init()
engine.setProperty('rate', TTS_RATE)
engine.setProperty('volume', 0.9)


def speak(text, blocking=False):
    """Speak text via TTS. Non-blocking by default."""
    if not TTS_ENABLED:
        return

    def _speak():
        engine.say(text)
        engine.runAndWait()

    if blocking:
        _speak()
    else:
        threading.Thread(target=_speak, daemon=True).start()


def listen_for_input(timeout=5):
    """
    Listen for voice input and return transcribed string.
    Returns None on failure or timeout.
    """
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.Microphone() as source:
            r.adjust_for_ambient_noise(source, duration=0.5)
            audio = r.listen(source, timeout=timeout)
        return r.recognize_google(audio)
    except Exception as e:
        print(f"Voice input error: {e}")
        return None
