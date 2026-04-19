// button_test.ino — prints one line only when any pin state changes

const int PIN_DOT1      = A0;
const int PIN_FINISH    = 2;
const int PIN_BACKSPACE = 4;
const int PIN_SEND      = 7;
const int PIN_SPACE     = 8;

const int   PINS[5]   = {PIN_DOT1, PIN_FINISH, PIN_BACKSPACE, PIN_SEND, PIN_SPACE};
const char* LABELS[5] = {"DOT1", "FINISH", "BKSPC", "SEND", "SPACE"};

int prevState[5] = {-1, -1, -1, -1, -1};  // -1 forces a print on first loop

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 5; i++) {
    pinMode(PINS[i], INPUT_PULLUP);
  }
  Serial.println("Ready. Waiting for changes...");
  Serial.println("DOT1  FINISH  BKSPC  SEND  SPACE");
  Serial.println("---------------------------------");
}

void loop() {
  bool changed = false;
  int current[5];

  for (int i = 0; i < 5; i++) {
    current[i] = digitalRead(PINS[i]);
    if (current[i] != prevState[i]) changed = true;
  }

  if (changed) {
    for (int i = 0; i < 5; i++) {
      Serial.print(current[i]);
      Serial.print("     ");
      prevState[i] = current[i];
    }
    Serial.println();
  }

  delay(10);
}
