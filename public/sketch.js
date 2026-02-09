let socket;

//global variables
let askButton;

// device motion
let accX = 0;
let accY = 0;
let accZ = 0;
let rrateX = 0;
let rrateY = 0;
let rrateZ = 0;

// device orientation
let rotateDegrees = 0;
let frontToBack = 0; // up and down
let leftToRight = 0; // left and right

let cX;
let cY;

// let averagingAmt = 0.1;//change this to 1 or 0.9 to see it keep up with the mouse
let curx = 0.0;
let cury = 0.0;

let stepDistance = 15;

let rightFoot = true;

let footprints = [];

function setup() {
  socket = io();

  // createCanvas(400, 400);
  createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
  angleMode(DEGREES);

  cX = width / 2;
  cY = height / 2;

  //----------
  //the bit between the two comment lines could be move to a three.js sketch except you'd need to create a button there
  if (
    typeof DeviceMotionEvent.requestPermission === "function" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    // iOS 13+
    askButton = createButton("Permission"); //p5 create button
    askButton.mousePressed(handlePermissionButtonPressed); //p5 listen to mousePressed event
  } else {
    //if there is a device that doesn't require permission
    window.addEventListener("devicemotion", deviceMotionHandler, true);
    window.addEventListener("deviceorientation", deviceTurnedHandler, true);
  }

  //----------
  background(255);

socket.on("step", (data) => {
  console.log("收到网络脚印", data);

  footprints.push({
    x: data.x,
    y: data.y,
    angle: data.angle,
    rightFoot: data.rightFoot,
    rotOffset: data.rotOffset || 0,
    alpha: 255,
    isCurrent: false
  });
});

}

//we are using p5.js to visualise this movement data
function draw() {
  background(255);

  // noStroke();
  // fill(239,237,248, 20); // 低 alpha
  // rect(0, 0, width, height);

  // ---------- ① 根据手机输入更新目标位置 ----------
  if (frontToBack > 40) {
    // down
    cY += 1;
  } else if (frontToBack < 0) {
    // up
    cY += -1;
  }

  if (leftToRight > 20) {
    // Right
    cX += 1;
  } else if (leftToRight < -20) {
    // Left
    cX += -1;
  }

  // ---------- ② 计算位移 ----------
  let dx = cX - curx;
  let dy = cY - cury;
  let magnitude = dist(curx, cury, cX, cY);

  // ---------- ③ 是否走了一步 ----------
  if (magnitude > stepDistance) {
    makeStep(dx, dy);
  }

  for (let f of footprints) {
    drawFootprint(f);
    if (!f.isCurrent) {
      f.alpha -= 2; // ❄️ 被雪覆盖⭐ 消失速度，调这个
    }
  }

  // 把看不见的脚印清掉
  // footprints = footprints.filter(f => f.alpha > 0);

  footprints = footprints.filter(
  f => f.alpha > 0 || f.isCurrent
);


  // ---------- ④ Debug UI ----------
  // drawDebug();
}

function makeStep(dx, dy) {
  // 1️⃣ 更新“当前脚印参考位置”
  curx += dx;
  cury += dy;

  // 2️⃣ 方向
  let angle = atan2(dy, dx);
  // let angle = degrees(atan2(dy, dx));

  // ⭐ 之前的“当前脚印”不再是 current
  for (let f of footprints) {
    f.isCurrent = false;
  }

  // 3️⃣ 存脚印
  footprints.push({
    x: curx,
    y: cury,
    angle: angle,
    rightFoot: rightFoot,
    alpha: 255,
    isCurrent: true,
    rotOffset: random(-10, 10)
  });

  let stepData={
    x: curx,
    y: cury,
    angle: angle,
    rightFoot: rightFoot,
    // alpha: 255,
    // isCurrent: true,
    rotOffset: random(-10, 10)
  }
  
  socket.emit("step",stepData);

  // 4️⃣ 切换左右脚
  rightFoot = !rightFoot;

  

  
}

function drawFootprint(f) {
  let offset;
  if (f.rightFoot) {
    offset = -3;
    // scale(0.4,-0.4);
  } else {
    offset = 3;
    // scale(-0.4, -0.4);
  }

  push();
  translate(f.x, f.y);
  rotate(f.angle+ f.rotOffset);
  rotate(90);

  translate(offset, 0);

  if (!f.rightFoot) {
    scale(-1, 1);
  }

  scale(1);

  // fill(rightFoot ? color(255, 0, 0) : color(0, 255, 0));
  // noStroke();
  // stroke(170,187,237);
  strokeWeight(2);
  fill(170,187,237, f.alpha);
  // fill(118,153,191, f.alpha);
  // ellipse(0, 0, 5, 3);

  push();
  beginShape();
  vertex(-6, 0); // heel
  vertex(-2, -8); // left side
  vertex(2, -8); // toe left
  vertex(6, -1); // toe
  vertex(4, 14); // toe right
  vertex(-2, 14); // right side
  endShape(CLOSE);
  pop();

  pop();
}

// function drawDebug() {
//   rectMode(CORNER);
//   fill(255);
//   noStroke();
//   rect(0, 0, width / 2 - 35, height / 2);

//   //Debug text
//   fill(0);
//   textSize(15);

//   text("acceleration: ", 10, 10);
//   text(
//     accX.toFixed(2) + ", " + accY.toFixed(2) + ", " + accZ.toFixed(2),
//     10,
//     40
//   );

//   text("rotation rate: ", 10, 80);
//   text(
//     rrateX.toFixed(2) + ", " + rrateY.toFixed(2) + ", " + rrateZ.toFixed(2),
//     10,
//     110
//   );

//   text("device orientation: ", 10, 150);
//   text(
//     rotateDegrees.toFixed(2) +
//       ", " +
//       leftToRight.toFixed(2) +
//       ", " +
//       frontToBack.toFixed(2),
//     10,
//     180
//   );
// }

//Everything below here you could move to a three.js or other javascript sketch

function handlePermissionButtonPressed() {
  DeviceMotionEvent.requestPermission().then((response) => {
    // alert(response);//quick way to debug response result on mobile, you get a mini pop-up
    if (response === "granted") {
      window.addEventListener("devicemotion", deviceMotionHandler, true);
    }
  });

  DeviceOrientationEvent.requestPermission()
    .then((response) => {
      if (response === "granted") {
        // alert(response);//quick way to debug response result on mobile, you get a mini pop-up
        window.addEventListener("deviceorientation", deviceTurnedHandler, true);
      }
    })
    .catch(console.error);
}

//AVERAGE YOUR DATA!!!
//Microphone input from last term....

// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
function deviceMotionHandler(event) {
  accX = event.acceleration.x;
  accY = event.acceleration.y;
  accZ = event.acceleration.z;

  rrateZ = event.rotationRate.alpha; //alpha: rotation around z-axis
  rrateX = event.rotationRate.beta; //rotating about its X axis; that is, front to back
  rrateY = event.rotationRate.gamma; //rotating about its Y axis: left to right
}

//https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientation_event
function deviceTurnedHandler(event) {
  //degrees 0 - 365
  rotateDegrees = event.alpha; // alpha: rotation around z-axis
  frontToBack = event.beta; // beta: front back motion
  leftToRight = event.gamma; // gamma: left to right
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

