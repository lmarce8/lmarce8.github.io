let port;
let connectBtn, zeroBtn, resetBtn;
let cursorX, cursorY;
let prevX, prevY;
let speed = 0.1; // slower speed for better control

let selectedColor = [0, 100, 100];
let colorIndex = 0;

let colors = [
  [0, 80, 100], [30, 80, 100], [60, 70, 95], [120, 60, 100],
  [180, 60, 100], [240, 70, 90], [300, 60, 100], [30, 50, 40],
  [0, 0, 100], [0, 0, 0], [100, 40, 100], [350, 30, 100],
  [60, 20, 100], [210, 30, 100], [270, 60, 100], [0, 0, 30]
];

let brushSound, colorChangeSound, clearSound, saveSound, bgMusic, eraserSound;
let eraserIcon;

let lastColorIndex = -1;
let lastPaintTime = 0;
let savedPlayed = false;

let paintingEnabled = true;
let lastSwitchState = 0;
let eraserMode = false;
let lastEraserButtonState = 0;

function preload() {
  soundFormats('mp3', 'wav');
  brushSound = loadSound('sounds/brush-stroke.mp3');
  colorChangeSound = loadSound('sounds/color-change.mp3');
  clearSound = loadSound('sounds/clear-screen.mp3');
  saveSound = loadSound('sounds/save-success.mp3');
  bgMusic = loadSound('sounds/background-music.mp3');
  eraserSound = loadSound('sounds/eraser.mp3');
  eraserIcon = loadImage('eraser.png');
}

function setup() {
  createCanvas(800, 600);
  colorMode(HSB);
  background(250);

  port = createSerial();

  connectBtn = createButton("Connect");
  connectBtn.position(10, height + 10);
  connectBtn.mousePressed(() => {
    port.open("Arduino", 9600);
    userStartAudio().then(() => {
      bgMusic.setVolume(0.4);
      bgMusic.loop();
    });
  });

  zeroBtn = createButton("Zero Joystick");
  zeroBtn.position(100, height + 10);
  zeroBtn.mousePressed(() => port.write("zero\n"));

  resetBtn = createButton("Reset Canvas");
  resetBtn.position(220, height + 10);
  resetBtn.mousePressed(() => {
    background(250);
    clearSound.play();
    lastPaintTime = millis();
    savedPlayed = false;
  });

  cursorX = width / 2;
  cursorY = height / 2;
  prevX = cursorX;
  prevY = cursorY;
}

function draw() {
  let str = port.readUntil("\n");
  if (str !== "") {
    let values = str.split(",");
    if (values.length === 5) {
      let x = Number(values[1]);
      let y = -Number(values[0]);
      let sw = Number(values[2]);
      colorIndex = Number(values[3]);
      let eraserButton = Number(values[4]);

      // Move joystick-controlled cursor
      cursorX += x * speed;
      cursorY += y * speed;
      cursorX = constrain(cursorX, 0, width);
      cursorY = constrain(cursorY, 0, height);

      // Toggle painting ON/OFF
      if (sw === 1 && lastSwitchState === 0) {
        paintingEnabled = !paintingEnabled;
      }
      lastSwitchState = sw;

      // Toggle eraser mode
      if (eraserButton === 1 && lastEraserButtonState === 0) {
        eraserMode = !eraserMode;
        if (eraserMode) {
          eraserSound.play();
        }
      }
      lastEraserButtonState = eraserButton;

      // Set brush or eraser color
      selectedColor = eraserMode ? [0, 0, 100] : colors[colorIndex];

      if (colorIndex !== lastColorIndex && !eraserMode) {
        colorChangeSound.play();
        lastColorIndex = colorIndex;
      }

      // Paint if paintingEnabled
      if (paintingEnabled) {
        stroke(...selectedColor);
        strokeWeight(eraserMode ? 30 : 20);
        line(prevX, prevY, cursorX, cursorY);

        if (!brushSound.isPlaying()) {
          brushSound.loop();
        }

        lastPaintTime = millis();
        savedPlayed = false;

        // Update only after painting
        prevX = cursorX;
        prevY = cursorY;
      } else {
        brushSound.stop();
      }

      // Cursor preview (always on top)
      noStroke();
      if (eraserMode && !paintingEnabled) {
        image(eraserIcon, cursorX - 15, cursorY - 15, 30, 30);
      } else if (!eraserMode) {
        fill(...selectedColor);
        circle(cursorX, cursorY, 20);
      }
    }
  }

  // Idle timer: play save-success after 5 sec
  if (!savedPlayed && millis() - lastPaintTime > 5000) {
    saveSound.play();
    savedPlayed = true;
  }

  // Draw eraser icon last (on top of paint)
  if (eraserMode && paintingEnabled) {
    image(eraserIcon, cursorX - 15, cursorY - 15, 30, 30);
  }
}
