// include the library code:
#include <LiquidCrystal.h>
#include <Servo.h>

// initialize the library by associating any needed LCD interface pin
// with the arduino pin number it is connected to
const int rs = 12, en = 11, d4 = 5, d5 = 4, d6 = 3, d7 = 2;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);
Servo myservo;
String emo;
int pos = 0;

void setup() {
  lcd.begin(16, 2);
  myservo.attach(10);
  Serial.begin(9600);
}

void loop() {

  if (Serial.available()) {
    // Read the incoming data until timeout
    Serial.println("Enter your mood: ");
    emo = Serial.readString();
    Serial.println(emo);
    mood(emo);
  }

}

void plain(){
  lcd.setCursor(0,0);
  lcd.print("(  B  )  (  B  )");
  lcd.setCursor(0,1);
  lcd.print("----------------");
  lcd.setCursor(0,0);
}

void robot(){
  lcd.setCursor(0,0);
  lcd.print("[  o  ]  [  o  ]");
  lcd.setCursor(0,1);
  lcd.print("================");
  lcd.setCursor(0,0);
}

void tears(){
  lcd.setCursor(0,0);
  lcd.print("(  T  )  (  T  )");
  lcd.setCursor(0,1);
  lcd.print("   ||       ||  ");
  lcd.setCursor(0,0);
}

void dizzy(){
  lcd.setCursor(0,0);
  lcd.print("(  @  )  (  @  )");
  lcd.setCursor(0,1);
  lcd.print("________________");
  lcd.setCursor(0,0);
}

void happy(){
  lcd.setCursor(0,0);
  lcd.print("(  ^  )  (  ^  )");
  lcd.setCursor(0,1);
  lcd.print("~~~~~~~~~~~~~~~~~~");
  lcd.setCursor(0,0);
}

void wink(){
  lcd.setCursor(0,0);
  lcd.print("(  ^  )  (  -  )");
  lcd.setCursor(0,1);
  lcd.print("----------------");
  lcd.setCursor(0,0);
}

void dead(){
  lcd.setCursor(0,0);
  lcd.print("(  X  )  (  X  )");
  lcd.setCursor(0,1);
  lcd.print("________________");
  lcd.setCursor(0,0);
}

void wave(){
  for(pos = 0; pos <= 90; pos++){
    myservo.write(pos);
    delay(5);
  }
  for(int i = 0; i < 3; i++){
    for(pos = 90; pos <= 135; pos++){
      myservo.write(pos);
     delay(5);
    }
    for(pos = 135; pos >= 90; pos--){
      myservo.write(pos);
      delay(5);
    }
  }
  for(pos = 90; pos >= 0; pos--){
    myservo.write(pos);
    delay(5);
  }
}

void mood(String emo){
  if(emo == "plain\n"){
    plain();
  } else if(emo == "robot\n"){
    robot();
  } else if(emo == "tears\n"){
    tears();
  } else if(emo == "dizzy\n"){
    dizzy();
  } else if(emo == "happy\n"){
    happy();
  } else if(emo == "wink\n"){
    wink();
  } else if(emo == "dead\n"){
    dead();
  } else if(emo == "wave\n"){
    wave();
  }
  emo = " ";
}
