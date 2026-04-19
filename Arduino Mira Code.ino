// Mira Owl — LCD expressions, pan servo (face tracking), arm servo (wave)
//
// Serial protocol (9600 baud, newline-terminated):
//   Face commands  → "happy", "plain", "robot", "tears", "dizzy", "wink", "dead"
//   Arm wave       → "wave"
//   Pan servo      → "pan:X"  where X is 0–320 (camera pixel x, mapped to 180–0°)
//
// The arm wave is non-blocking: a millis()-based state machine steps the servo
// one degree per WAVE_STEP_MS so serial input is never blocked during a wave.

#include <Servo.h>
#include <LiquidCrystal.h>

const int rs = 12, en = 11, d4 = 5, d5 = 4, d6 = 3, d7 = 2;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

Servo panServo;  // pin 10 — rotates owl head left/right
Servo armServo;  // pin  9 — waves wing

// ── Non-blocking wave state machine ─────────────────────────────────────────
enum WaveState { WAVE_IDLE, WAVE_EXTEND, WAVE_UP, WAVE_DOWN, WAVE_RETRACT };
WaveState waveState  = WAVE_IDLE;
int       armPos     = 0;
int       waveCount  = 0;
unsigned long lastWaveStep = 0;
const int WAVE_STEP_MS = 5;   // ms per degree — matches original delay(5) feel

void updateWave() {
  if (waveState == WAVE_IDLE) return;
  if (millis() - lastWaveStep < WAVE_STEP_MS) return;
  lastWaveStep = millis();

  switch (waveState) {
    case WAVE_EXTEND:
      armServo.write(++armPos);
      if (armPos >= 90) { waveState = WAVE_UP; }
      break;

    case WAVE_UP:
      armServo.write(++armPos);
      if (armPos >= 135) { waveState = WAVE_DOWN; }
      break;

    case WAVE_DOWN:
      armServo.write(--armPos);
      if (armPos <= 90) {
        if (++waveCount >= 3) { waveState = WAVE_RETRACT; }
        else                  { waveState = WAVE_UP; }
      }
      break;

    case WAVE_RETRACT:
      armServo.write(--armPos);
      if (armPos <= 0) { waveState = WAVE_IDLE; }
      break;

    default: break;
  }
}

void startWave() {
  armPos    = 0;
  waveCount = 0;
  waveState = WAVE_EXTEND;
  lastWaveStep = millis();
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50); // don't block loop() more than 50ms waiting for '\n'
  lcd.begin(16, 2);

  panServo.attach(10);
  armServo.attach(9);

  panServo.write(90);  // center
  armServo.write(0);   // resting

  plain();
  Serial.println("Mira ready");
}

// ── Main loop ────────────────────────────────────────────────────────────────
void loop() {
  updateWave();  // run wave state machine every tick — never blocks

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) return;

    if (cmd.startsWith("pan:")) {
      // Pixel x 0–320 → angle 180–0 (mirrored so owl follows face direction)
      int x     = cmd.substring(4).toInt();
      int angle = map(x, 0, 320, 180, 0);
      panServo.write(constrain(angle, 0, 180));
    } else {
      mood(cmd);
    }
  }
}

// ── Face functions ────────────────────────────────────────────────────────────
void plain() {
  lcd.setCursor(0, 0); lcd.print("(  B  )  (  B  )");
  lcd.setCursor(0, 1); lcd.print("----------------");
}

void robot() {
  lcd.setCursor(0, 0); lcd.print("[  o  ]  [  o  ]");
  lcd.setCursor(0, 1); lcd.print("================");
}

void tears() {
  lcd.setCursor(0, 0); lcd.print("(  T  )  (  T  )");
  lcd.setCursor(0, 1); lcd.print("   ||       ||  ");
}

void dizzy() {
  lcd.setCursor(0, 0); lcd.print("(  @  )  (  @  )");
  lcd.setCursor(0, 1); lcd.print("________________");
}

void happy() {
  lcd.setCursor(0, 0); lcd.print("(  ^  )  (  ^  )");
  lcd.setCursor(0, 1); lcd.print("~~~~~~~~~~~~~~~~");
}

void wink() {
  lcd.setCursor(0, 0); lcd.print("(  ^  )  (  -  )");
  lcd.setCursor(0, 1); lcd.print("----------------");
}

void dead() {
  lcd.setCursor(0, 0); lcd.print("(  X  )  (  X  )");
  lcd.setCursor(0, 1); lcd.print("________________");
}

// ── Command router ────────────────────────────────────────────────────────────
void mood(String cmd) {
  if      (cmd == "plain") plain();
  else if (cmd == "robot") robot();
  else if (cmd == "tears") tears();
  else if (cmd == "dizzy") dizzy();
  else if (cmd == "happy") happy();
  else if (cmd == "wink")  wink();
  else if (cmd == "dead")  dead();
  else if (cmd == "wave")  startWave();
}
