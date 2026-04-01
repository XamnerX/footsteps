let socket;
let permissionButton;

// Device orientation values
let frontToBack = 0; // beta
let leftToRight = 0; // gamma

// Current target position and current footprint position
let targetX;
let targetY;
let currentX;
let currentY;

// Footstep settings
let stepDistance = 15;
let rightFoot = true;
let footprints = [];

// Timing and performance settings
let lastStepTime = 0;
let stepCooldown = 100;
const maxFootprints = 100;

// Visual / movement settings
const edgeMargin = 20;
const fadeSpeed = 3;

function setup() {
  socket = io();

  createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
  angleMode(DEGREES);

  targetX = width / 2;
  targetY = height / 2;
  currentX = targetX;
  currentY = targetY;

  setupMotionPermission();
  setupSocketEvents();

  background(255);
}

function draw() {
  background(255);

  updateTargetPositionFromTilt();
  updateFootsteps();
  drawAndFadeFootprints();
  trimFootprints();
}

/* --------------------------------------------------
   Setup
-------------------------------------------------- */

function setupMotionPermission() {
  const needsPermission =
    typeof DeviceMotionEvent.requestPermission === "function" &&
    typeof DeviceOrientationEvent.requestPermission === "function";

  if (needsPermission) {
    permissionButton = createButton("Permission");
    permissionButton.mousePressed(handlePermissionButtonPressed);
  } else {
    enableMotionListeners();
  }
}

function setupSocketEvents() {
  socket.on("step", (data) => {
    footprints.push({
      nx: data.nx,
      ny: data.ny,
      angle: data.angle,
      rightFoot: data.rightFoot,
      rotOffset: data.rotOffset || 0,
      alpha: 255,
      ownerId: data.ownerId || "unknown"
    });
  });
}

function enableMotionListeners() {
  window.addEventListener("deviceorientation", deviceTurnedHandler, true);
}

/* --------------------------------------------------
   Main update logic
-------------------------------------------------- */

function updateTargetPositionFromTilt() {
  const tilt = getTiltInput();
  const moveX = tilt.x;
  const moveY = tilt.y;

  if (moveY > 40) {
    targetY += 1;
  } else if (moveY < 0) {
    targetY -= 1;
  }

  if (moveX > 20) {
    targetX += 1;
  } else if (moveX < -20) {
    targetX -= 1;
  }

  targetX = constrain(targetX, edgeMargin, width - edgeMargin);
  targetY = constrain(targetY, edgeMargin, height - edgeMargin);
}

function updateFootsteps() {
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const magnitude = dist(currentX, currentY, targetX, targetY);

  if (magnitude > stepDistance && millis() - lastStepTime > stepCooldown) {
    makeStep(dx, dy);
    lastStepTime = millis();
  }
}

function drawAndFadeFootprints() {
  const lastTwoIndexSet = getLastTwoFootprintsPerOwner();

  for (let i = 0; i < footprints.length; i++) {
    const footprint = footprints[i];
    drawFootprint(footprint);

    // Keep the most recent two footprints for each user visible.
    // Older footprints gradually fade out.
    if (!lastTwoIndexSet.has(i)) {
      footprint.alpha -= fadeSpeed;
    }
  }
}

function trimFootprints() {
  footprints = footprints.filter((footprint) => footprint.alpha > 0);

  if (footprints.length > maxFootprints) {
    footprints.splice(0, footprints.length - maxFootprints);
  }
}

/* --------------------------------------------------
   Footstep logic
-------------------------------------------------- */

function makeStep(dx, dy) {
  currentX += dx;
  currentY += dy;

  currentX = constrain(currentX, edgeMargin, width - edgeMargin);
  currentY = constrain(currentY, edgeMargin, height - edgeMargin);

  const angle = degrees(Math.atan2(dy, dx));
  const rotOffset = random(-10, 10);

  const stepData = {
    nx: currentX / width,
    ny: currentY / height,
    angle: angle,
    rightFoot: rightFoot,
    rotOffset: rotOffset,
    alpha: 255,
    ownerId: socket.id
  };

  footprints.push(stepData);
  socket.emit("step", stepData);

  rightFoot = !rightFoot;
}

function getLastTwoFootprintsPerOwner() {
  const ownerToIndices = {};
  const lastTwoIndexSet = new Set();

  for (let i = 0; i < footprints.length; i++) {
    const ownerId = footprints[i].ownerId || "unknown";

    if (!ownerToIndices[ownerId]) {
      ownerToIndices[ownerId] = [];
    }

    ownerToIndices[ownerId].push(i);

    if (ownerToIndices[ownerId].length > 2) {
      ownerToIndices[ownerId].shift();
    }
  }

  for (const ownerId in ownerToIndices) {
    for (const index of ownerToIndices[ownerId]) {
      lastTwoIndexSet.add(index);
    }
  }

  return lastTwoIndexSet;
}

/* --------------------------------------------------
   Drawing
-------------------------------------------------- */

function drawFootprint(footprint) {
  const offset = footprint.rightFoot ? -3 : 3;

  // Convert normalized coordinates back into local screen space.
  // This keeps positions consistent across different screen sizes.
  const px = footprint.nx * width;
  const py = footprint.ny * height;

  push();
  translate(px, py);
  rotate(footprint.angle + (footprint.rotOffset || 0));
  rotate(90);
  translate(offset, 0);

  if (!footprint.rightFoot) {
    scale(-1, 1);
  }

  // Footprint size stays fixed.
  // Only position is normalized across devices.
  scale(0.4);
  noStroke();
  fill(170, 187, 237, footprint.alpha);

  beginShape();
  vertex(-6, 0);
  vertex(-2, -8);
  vertex(2, -8);
  vertex(6, -1);
  vertex(4, 14);
  vertex(-2, 14);
  endShape(CLOSE);

  pop();
}

/* --------------------------------------------------
   Motion input
-------------------------------------------------- */

function handlePermissionButtonPressed() {
  DeviceMotionEvent.requestPermission()
    .then((response) => {
      if (response === "granted") {
        return DeviceOrientationEvent.requestPermission();
      }
    })
    .then((response) => {
      if (response === "granted") {
        enableMotionListeners();
      }
    })
    .catch(console.error);
}

function deviceTurnedHandler(event) {
  frontToBack = event.beta;
  leftToRight = event.gamma;
}

function isIOSLike() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getTiltInput() {
  const x = leftToRight;
  const y = frontToBack;

  let screenAngle = 0;

  if (screen.orientation && typeof screen.orientation.angle === "number") {
    screenAngle = screen.orientation.angle;
  } else if (typeof window.orientation === "number") {
    screenAngle = window.orientation;
  }

  let result;

  // Correct the input according to the current screen orientation.
  if (screenAngle === 90) {
    result = { x: -y, y: x };
  } else if (screenAngle === -90 || screenAngle === 270) {
    result = { x: y, y: -x };
  } else if (screenAngle === 180) {
    result = { x: -x, y: -y };
  } else {
    result = { x, y };
  }

  // Additional correction for iOS / iPadOS devices.
  if (isIOSLike()) {
    result = {
      x: result.y,
      y: -result.x
    };
  }

  return result;
}

/* --------------------------------------------------
   Responsive canvas
-------------------------------------------------- */

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  targetX = constrain(targetX, edgeMargin, width - edgeMargin);
  targetY = constrain(targetY, edgeMargin, height - edgeMargin);
  currentX = constrain(currentX, edgeMargin, width - edgeMargin);
  currentY = constrain(currentY, edgeMargin, height - edgeMargin);
}