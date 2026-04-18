#include <Servo.h>

// -------------------------------------------------------------------
// BlindAide — Arduino Uno R3 firmware
//
// Protocol (PC → Arduino): single byte, 6-bit bitmask for one braille
//   cell. bit0=dot1 … bit5=dot6. Received over Serial at 9600 baud.
//
// Protocol (Arduino → PC): single byte, 6-bit bitmask of chord keys
//   currently held. Sent when all keys are released (chord complete).
// -------------------------------------------------------------------

Servo dots[6];
const int SERVO_PINS[]  = {3, 5, 6, 9, 10, 11};
const int BUTTON_PINS[] = {A0, A1, A2, A3, A4, A5};

const int UP   = 90;  // degrees — pin raised
const int DOWN = 0;   // degrees — pin retracted

byte prevChord   = 0;
bool chordActive = false;


void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 6; i++) {
    dots[i].attach(SERVO_PINS[i]);
    dots[i].write(DOWN);
    delay(50);  // stagger startup to reduce inrush current spike
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }
}


void loop() {
  // Receive display byte from host PC
  if (Serial.available() > 0) {
    byte cell = Serial.read();
    displayCell(cell);
  }

  // Read chord keyboard
  byte chord = 0;
  for (int i = 0; i < 6; i++) {
    if (digitalRead(BUTTON_PINS[i]) == LOW) {
      chord |= (1 << i);
    }
  }

  // Send chord on key release
  if (chord != 0) {
    chordActive = true;
    prevChord   = chord;
  } else if (chordActive) {
    Serial.write(prevChord);
    chordActive = false;
    prevChord   = 0;
  }
}


void displayCell(byte cell) {
  for (int i = 0; i < 6; i++) {
    dots[i].write((cell >> i & 1) ? UP : DOWN);
  }
  delay(50);  // let servos settle
}
