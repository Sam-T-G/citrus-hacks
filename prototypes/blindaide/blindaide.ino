// =============================================================================
// BlindAide — Arduino Uno R3 firmware
// =============================================================================
//
// WHAT THIS FILE DOES
// -------------------
// This sketch runs on the Arduino Uno R3. It does two things:
//
//   1. DISPLAY: Receives a single byte from the laptop over USB and moves
//      6 servo motors to raise or lower the 6 pins of a Braille cell.
//
//   2. KEYBOARD: Reads 6 physical buttons the user can press (chord keyboard).
//      When the user releases all buttons, sends the pressed combination back
//      to the laptop as a single byte so the laptop can decode the character.
//
// HOW IT CONNECTS
// ---------------
// The laptop runs Python (main.py). It talks to this Arduino over USB via
// the Serial port at 9600 baud. The laptop sends bytes TO this sketch to
// display Braille characters. This sketch sends bytes BACK to the laptop
// when the user types on the chord keyboard.
//
// BRAILLE CELL LAYOUT
// -------------------
// A Braille cell is a 2×3 grid of raised dots:
//
//   Dot 1  Dot 4
//   Dot 2  Dot 5
//   Dot 3  Dot 6
//
// Each dot is controlled by one SG90 servo motor.
// The servo rotates a small cam that physically pushes a pin upward.
//
// BYTE ENCODING (same format for display commands AND chord keyboard)
// -------------------------------------------------------------------
// Each byte uses only the lower 6 bits (bits 0–5). Each bit = one dot:
//
//   bit 0 (value 1)  = dot 1
//   bit 1 (value 2)  = dot 2
//   bit 2 (value 4)  = dot 3
//   bit 3 (value 8)  = dot 4
//   bit 4 (value 16) = dot 5
//   bit 5 (value 32) = dot 6
//
// Example: the letter H uses dots 1, 2, 5
//   bit 0 = 1, bit 1 = 1, bit 4 = 1  →  binary 010011  →  decimal 19  →  0x13
//
// HOW TO UPLOAD
// -------------
//   1. Open Arduino IDE
//   2. Select board: Tools → Board → Arduino Uno
//   3. Select port: Tools → Port → (whichever port the Uno appears on)
//   4. Click Upload (the right-arrow button)
// =============================================================================

// Servo.h is a built-in Arduino library that lets us control servo motors
// using PWM (Pulse Width Modulation) signals on digital pins.
#include <Servo.h>

// -----------------------------------------------------------------------------
// SERVO OBJECTS
// -----------------------------------------------------------------------------
// We create one Servo object for each of the 6 Braille dot positions.
// Each object controls one SG90 motor.
Servo dots[6];

// The PWM-capable digital pins we'll use for the 6 servos.
// On the Uno R3, PWM pins are: 3, 5, 6, 9, 10, 11  (marked with ~ on the board)
// These map to Braille dots 1–6 in order.
const int SERVO_PINS[] = {3, 5, 6, 9, 10, 11};

// The analog pins used for the 6 chord keyboard buttons (dots 1–6).
// A0–A5 can also be used as regular digital input pins — that's what we do here.
// Wire one leg of each button to the pin, other leg to GND.
//
// Physical layout:
//   Column 1 (left hand)   Column 2 (right hand)   Column 3 (control)
//   A0 = dot 1             A3 = dot 4              D2 = FINISH LETTER
//   A1 = dot 2             A4 = dot 5              D4 = BACKSPACE
//   A2 = dot 3             A5 = dot 6              D7 = SEND
//                          D8 = SPACE (below col 2)
const int BUTTON_PINS[] = {A0, A1, A2, A3, A4, A5};

// Control button pins — single-press actions, not part of the chord.
// These use the remaining available digital pins after servos claim D3,5,6,9,10,11.
const int PIN_FINISH    = D2;   // commit the current letter
const int PIN_BACKSPACE = D4;   // delete the last typed character
const int PIN_SEND      = D7;   // send the completed message
const int PIN_SPACE     = D8;   // insert a space

// Command bytes sent to Python for each control button.
// All values are above 0x3F (63), which is the maximum valid 6-bit chord byte.
// This lets Python distinguish control commands from chord characters unambiguously.
const byte CMD_FINISH    = 0x41;   // 65
const byte CMD_BACKSPACE = 0x42;   // 66
const byte CMD_SEND      = 0x43;   // 67
const byte CMD_SPACE     = 0x40;   // 64

// Previous pressed state for each control button, used for edge detection.
// We send the command once on the HIGH→LOW transition (unpressed→pressed),
// not continuously while held. This array tracks what each pin read last loop.
bool ctrlPrevState[4] = {HIGH, HIGH, HIGH, HIGH};

// Servo angle when a pin should be raised (dot ON — fingertip detectable).
// At 90°, the cam attached to the servo horn pushes the pin upward ~4–5mm.
// You can increase this to 100–110° if pins aren't rising high enough.
const int UP   = 90;

// Servo angle when a pin should be lowered (dot OFF — pin flush with surface).
const int DOWN = 0;


// -----------------------------------------------------------------------------
// CHORD KEYBOARD STATE
// -----------------------------------------------------------------------------
// A "chord" means pressing one or more buttons simultaneously to form a
// Braille dot pattern (e.g. buttons 1+2+5 = letter H).
//
// Key design decisions:
//
//   1. We ACCUMULATE bits with |= (OR), never overwrite with =.
//      This is critical: real users release fingers at slightly different times.
//      If we overwrote chordMask each loop, releasing button 2 before button 1
//      would erase dot 2 from the chord before we send it. With |=, once a dot
//      is recorded it stays recorded until the full chord is sent and reset.
//
//   2. We send the chord on RELEASE (all buttons up), not on press.
//      This gives the user time to press all intended buttons before we decide
//      what character was meant.
//
//   3. We debounce with a timestamp. Mechanical buttons bounce — the contact
//      physically vibrates for a few milliseconds on press and release, which
//      the Arduino reads as rapid HIGH/LOW flicker. Without debounce, one
//      physical press can register as two separate chords. We wait
//      DEBOUNCE_MS of stable "all buttons released" before declaring the chord
//      complete and sending it.

byte chordMask         = 0;     // accumulated OR of every button pressed this chord
bool chordActive       = false; // true from first button press until chord is sent
unsigned long releaseTime = 0;  // timestamp (ms) when all buttons were last released

// How long (ms) all buttons must stay released before we commit and send the chord.
// 20ms covers typical mechanical switch bounce. Increase if false triggers occur.
const unsigned long DEBOUNCE_MS = 20;


// -----------------------------------------------------------------------------
// SETUP — runs once when the Arduino powers on or resets
// -----------------------------------------------------------------------------
void setup() {
  // Start serial communication at 9600 baud.
  // This is the speed at which bytes are sent/received over USB to the laptop.
  // The Python script (serial_bridge.py) must use the same baud rate.
  Serial.begin(9600);

  // Initialize each servo and each chord button pin
  for (int i = 0; i < 6; i++) {

    // attach() tells the Servo library which pin to send PWM signals on.
    // After this, calling dots[i].write(angle) moves that servo.
    dots[i].attach(SERVO_PINS[i]);

    // Start all pins in the DOWN (retracted) position so the cell is blank.
    dots[i].write(DOWN);

    // Wait 50ms between attaching each servo.
    // All 6 servos trying to move at exactly the same instant would cause a
    // large current spike that could reset or brown out the Arduino.
    delay(50);

    // Set each chord button pin as INPUT_PULLUP.
    // HIGH = not pressed, LOW = pressed (button shorts pin to GND).
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }

  // Initialize the 4 control button pins the same way.
  pinMode(PIN_FINISH,    INPUT_PULLUP);
  pinMode(PIN_BACKSPACE, INPUT_PULLUP);
  pinMode(PIN_SEND,      INPUT_PULLUP);
  pinMode(PIN_SPACE,     INPUT_PULLUP);
}


// -----------------------------------------------------------------------------
// LOOP — runs repeatedly, forever, after setup() finishes
// -----------------------------------------------------------------------------
void loop() {

  // ── PART 1: Receive a display command from the laptop ──────────────────────
  //
  // Serial.available() returns the number of bytes waiting in the receive buffer.
  // If there's at least one byte ready, we read it and update the Braille display.
  if (Serial.available() > 0) {
    byte cell = Serial.read();   // read one byte from the laptop
    displayCell(cell);           // move the 6 servos to match this cell's dot pattern
  }

  // ── PART 2: Read the chord keyboard ────────────────────────────────────────
  //
  // Sample all 6 button pins and build a bitmask of what is currently pressed.
  byte currentButtons = 0;
  for (int i = 0; i < 6; i++) {
    if (digitalRead(BUTTON_PINS[i]) == LOW) {
      currentButtons |= (1 << i);   // set bit i — this button is pressed right now
    }
  }

  if (currentButtons != 0) {
    // At least one button is held down.
    // OR the new buttons into chordMask — this accumulates the full combination
    // even if buttons are pressed or released at slightly different times.
    chordActive = true;
    chordMask  |= currentButtons;
    releaseTime = 0;   // reset the release timer — we're not in release phase yet

  } else if (chordActive) {
    // All buttons are currently up, and we were in an active chord.
    // Start (or continue) the debounce countdown.

    if (releaseTime == 0) {
      // This is the first loop where all buttons are up — record the timestamp.
      releaseTime = millis();   // millis() returns ms elapsed since Arduino powered on
    }

    if (millis() - releaseTime >= DEBOUNCE_MS) {
      // Buttons have been stably released for DEBOUNCE_MS — the chord is genuine.
      // Send the accumulated bitmask to the laptop.
      Serial.write(chordMask);

      // Reset state for the next chord.
      chordActive = false;
      chordMask   = 0;
      releaseTime = 0;
    }
    // If millis() - releaseTime < DEBOUNCE_MS, we're still in the bounce window.
    // Do nothing yet — keep waiting.
  }

  // ── PART 3: Read the 4 control buttons ─────────────────────────────────────
  //
  // Control buttons are not chords — each one has a single fixed meaning.
  // We use edge detection: send the command byte exactly once per physical press
  // (on the HIGH→LOW transition), not repeatedly while held.
  //
  // ctrlPins[] and ctrlCmds[] are parallel arrays — index 0 is the same button
  // in both, so we can loop over them together.
  const int  ctrlPins[4] = {PIN_FINISH, PIN_BACKSPACE, PIN_SEND, PIN_SPACE};
  const byte ctrlCmds[4] = {CMD_FINISH, CMD_BACKSPACE, CMD_SEND, CMD_SPACE};

  for (int i = 0; i < 4; i++) {
    bool currentState = digitalRead(ctrlPins[i]);

    if (currentState == LOW && ctrlPrevState[i] == HIGH) {
      // Button just transitioned from unpressed to pressed — send the command.
      Serial.write(ctrlCmds[i]);
    }

    ctrlPrevState[i] = currentState;   // remember state for next loop
  }
}


// -----------------------------------------------------------------------------
// displayCell — move 6 servos to represent one Braille cell
// -----------------------------------------------------------------------------
// Parameters:
//   cell — a 6-bit bitmask where each bit represents one Braille dot.
//           bit 0 = dot 1, bit 1 = dot 2, ..., bit 5 = dot 6.
//           A 1 bit means raise that pin (dot ON); a 0 bit means lower it.
//
// Example: cell = 0b010011 = 19 decimal
//   bit 0 = 1 → dot 1 UP
//   bit 1 = 1 → dot 2 UP
//   bit 2 = 0 → dot 3 DOWN
//   bit 3 = 0 → dot 4 DOWN
//   bit 4 = 1 → dot 5 UP
//   bit 5 = 0 → dot 6 DOWN
//   This pattern represents the letter H.
void displayCell(byte cell) {
  for (int i = 0; i < 6; i++) {
    // (cell >> i) shifts the byte right by i positions, bringing bit i to position 0.
    // & 1 masks off everything except that lowest bit.
    // Result is 1 if dot i should be raised, 0 if it should be lowered.
    int angle = (cell >> i & 1) ? UP : DOWN;
    dots[i].write(angle);
  }

  // Brief pause to let all servos finish moving before we accept the next cell.
  // Without this, rapid successive cells could cause servos to skip.
  delay(50);
}
