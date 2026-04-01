/*
Sketch 02 – Footsteps
Author: Haiyi Xiao
Date: Feb 2026

A mobile-based interactive sketch where participants tilt their devices
to generate shared footprints on a snowy ground.
*/

let socket;
let permissionButton;

// Device orientation values from the browser sensor API
let frontToBack = 0; // beta
let leftToRight = 0; // gamma

// Target position follows the tilt input;
// current position is the latest footprint location
let targetX;
let targetY;
let currentX;
let currentY;

// Footstep state
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

// Some devices (especially iOS) require the user to explicitly
// grant permission before motion/orientation data can be accessed.
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

// Listen for incoming footsteps from other connected users.
// Positions are stored as normalized coordinates so that the same
// relative location can be displayed on different screen sizes.
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

// Enable the orientation sensor listener once permission is granted.
function enableMotionListeners() {
  window.addEventListener("deviceorientation", deviceTurnedHandler, true);
}

/* --------------------------------------------------
   Main update logic
-------------------------------------------------- */

// Convert tilt input into a moving target position.
// The target can move around the screen, but is kept inside a margin
// so footprints do not get clipped by the canvas edges.
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

// Compare the target position with the latest footprint position.
// A new footprint is only created when the distance is large enough
// and enough time has passed since the previous step.
function updateFootsteps() {
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const magnitude = dist(currentX, currentY, targetX, targetY);

  if (magnitude > stepDistance && millis() - lastStepTime > stepCooldown) {
    makeStep(dx, dy);
    lastStepTime = millis();
  }
}

// Draw every footprint, but only keep the latest two footprints
// from each participant fully visible. Older ones gradually fade out.
function drawAndFadeFootprints() {
  const lastTwoIndexSet = getLastTwoFootprintsPerOwner();

  for (let i = 0; i < footprints.length; i++) {
    const footprint = footprints[i];
    drawFootprint(footprint);

    if (!lastTwoIndexSet.has(i)) {
      footprint.alpha -= fadeSpeed;
    }
  }
}

// Remove invisible footprints and prevent the array from growing forever.
function trimFootprints() {
  footprints = footprints.filter((footprint) => footprint.alpha > 0);

  if (footprints.length > maxFootprints) {
    footprints.splice(0, footprints.length - maxFootprints);
  }
}

/* --------------------------------------------------
   Footstep logic
-------------------------------------------------- */

// Create one new footprint.
// The footprint stores normalized coordinates (0–1 range) instead of
// raw pixel coordinates, so the shared position can adapt to different
// screen sizes across devices.
function makeStep(dx, dy) {
  currentX += dx;
  currentY += dy;

  currentX = constrain(currentX, edgeMargin, width - edgeMargin);
  currentY = constrain(currentY, edgeMargin, height - edgeMargin);

  // Calculate the direction of travel so the footprint rotates
  // to match the current movement direction.
  const angle = degrees(Math.atan2(dy, dx));

  // Add a small random rotation to make the footprints feel less rigid.
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

  // Alternate between left and right footprints.
  rightFoot = !rightFoot;
}

// Find the indices of the most recent two footprints for each user.
// This is used so each participant always keeps their latest pair visible,
// while older traces fade away.
function getLastTwoFootprintsPerOwner() {
  const ownerToIndices = {};
  const lastTwoIndexSet = new Set();

  for (let i = 0; i < footprints.length; i++) {
    const ownerId = footprints[i].ownerId || "unknown";

    if (!ownerToIndices[ownerId]) {
      ownerToIndices[ownerId] = [];
    }

    ownerToIndices[ownerId].push(i);

    // Only keep the latest two indices for each owner.
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

// Draw a single footprint shape.
// The footprint position is converted from normalized coordinates
// back into local pixel coordinates for the current device.
function drawFootprint(footprint) {
  const offset = footprint.rightFoot ? -3 : 3;

  const px = footprint.nx * width;
  const py = footprint.ny * height;

  push();
  translate(px, py);

  // Apply the movement direction plus a small random variation.
  rotate(footprint.angle + (footprint.rotOffset || 0));
  rotate(90);

  // Shift left/right so alternating footprints do not overlap exactly.
  translate(offset, 0);

  if (!footprint.rightFoot) {
    scale(-1, 1);
  }

  // Footprint size stays fixed; only position is normalized.
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

// On iOS, permission requests for motion/orientation data
// must be triggered by a user interaction such as a button press.
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

// Update the latest sensor values from the browser orientation event.
function deviceTurnedHandler(event) {
  frontToBack = event.beta;
  leftToRight = event.gamma;
}

// Detect iOS / iPadOS devices because their orientation behaviour
// can differ from Android devices and often needs extra correction.
function isIOSLike() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Convert raw sensor input into a corrected movement direction.
// This function handles:
// 1. screen rotation (portrait / landscape)
// 2. iOS-specific orientation differences
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

  // Remap the sensor axes depending on the current screen orientation.
  if (screenAngle === 90) {
    result = { x: -y, y: x };
  } else if (screenAngle === -90 || screenAngle === 270) {
    result = { x: y, y: -x };
  } else if (screenAngle === 180) {
    result = { x: -x, y: -y };
  } else {
    result = { x, y };
  }

  // Apply an additional correction for iOS / iPadOS devices.
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

// Keep positions valid when the browser window or device orientation changes.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  targetX = constrain(targetX, edgeMargin, width - edgeMargin);
  targetY = constrain(targetY, edgeMargin, height - edgeMargin);
  currentX = constrain(currentX, edgeMargin, width - edgeMargin);
  currentY = constrain(currentY, edgeMargin, height - edgeMargin);
}