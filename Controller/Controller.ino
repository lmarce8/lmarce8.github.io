const int JOYX_PIN = A4;
const int JOYY_PIN = A5;
const int SW_PIN = 2;

const int POT_PIN = A0;
const int COLOR_BUTTON_PIN = 2;

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;

int colorIndex = 0;
bool lastButtonState = false;
bool colorSelected = false;

const int NUM_READINGS = 10;

struct AxisReadings {
  int readIndex;
  int readings[NUM_READINGS];
  float total = 0;
  int average = 0;
  int zeroed;
} xAxisReadings, yAxisReadings;

bool zeroing = false;
bool ready = false;

int colors[10][3] = {
  {255, 0, 0},     // Red
  {255, 100, 0},   // Orange
  {255, 255, 0},   // Yellow
  {0, 255, 0},     // Green
  {0, 255, 255},   // Turquoise
  {0, 0, 255},     // Blue
  {255, 0, 255},   // Pink
  {139, 69, 19},   // Brown
  {255, 255, 255}, // White
  {0, 0, 0}        // Black
};

void setup() {
  Serial.begin(9600);

  pinMode(SW_PIN, INPUT_PULLUP);
  pinMode(COLOR_BUTTON_PIN, INPUT_PULLUP);

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  for (int i = 0; i < NUM_READINGS; i++) {
    xAxisReadings.readings[i] = yAxisReadings.readings[i] = 0;
  }
}

void loop() {
  int xValue = analogRead(JOYX_PIN);
  int yValue = analogRead(JOYY_PIN);
  int swValue = !digitalRead(SW_PIN);
  int buttonState = !digitalRead(COLOR_BUTTON_PIN);
  int potValue = analogRead(POT_PIN);

  smoothAxis(&xAxisReadings, xValue);
  smoothAxis(&yAxisReadings, yValue);

  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\n');
    if (msg == "zero") {
      zeroing = true;
    }
  }

  if (zeroing) {
    xAxisReadings.zeroed = xAxisReadings.average;
    yAxisReadings.zeroed = yAxisReadings.average;
    zeroing = false;
    ready = true;
  }

  // Update color index from potentiometer (scaled 0-9)
  if (!colorSelected) {
    colorIndex = map(potValue, 0, 1023, 0, 9);
  }

  // On button press, update RGB LED and lock in color
  if (buttonState && !lastButtonState) {
    colorSelected = true;
    analogWrite(RED_PIN, colors[colorIndex][0]);
    analogWrite(GREEN_PIN, colors[colorIndex][1]);
    analogWrite(BLUE_PIN, colors[colorIndex][2]);
  }
  lastButtonState = buttonState;

  if (ready) {
    Serial.print(xAxisReadings.average - xAxisReadings.zeroed);
    Serial.print(",");
    Serial.print(yAxisReadings.average - yAxisReadings.zeroed);
    Serial.print(",");
    Serial.print(swValue);
    Serial.print(",");
    Serial.println(colorIndex);
  }

  delay(16);
}

void smoothAxis(AxisReadings *readings, int newValue) {
  int index = readings->readIndex;
  readings->total = readings->total - readings->readings[index];
  readings->readings[index] = newValue;
  readings->total += newValue;
  readings->readIndex = (index + 1) % NUM_READINGS;
  readings->average = round(readings->total / NUM_READINGS);
}
