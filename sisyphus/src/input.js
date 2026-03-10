// ── Centralized Input Manager ──

const keys = {};
const prevKeys = {};
let mouseDX = 0;
let mouseDY = 0;
let pointerLocked = false;
let canvas = null;

export const input = {
  get forward()  { return !!(keys['KeyW'] || keys['ArrowUp']); },
  get back()     { return !!(keys['KeyS'] || keys['ArrowDown']); },
  get left()     { return !!(keys['KeyA'] || keys['ArrowLeft']); },
  get right()    { return !!(keys['KeyD'] || keys['ArrowRight']); },
  get sprint()   { return !!(keys['ShiftLeft'] || keys['ShiftRight']); },
  get jump()     { return !!(keys['Space']); },
  get interact() { return wasJustPressed('KeyE'); },
  get mouseDX()  { return mouseDX; },
  get mouseDY()  { return mouseDY; },
  get pointerLocked() { return pointerLocked; },
  get anyMovement() {
    return this.forward || this.back || this.left || this.right;
  },

  init(canvasElement) {
    canvas = canvasElement;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);

    canvas.addEventListener('click', () => {
      if (!pointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
      document.body.style.cursor = pointerLocked ? 'none' : '';
    });
  },

  update() {
    Object.assign(prevKeys, keys);
    mouseDX = 0;
    mouseDY = 0;
  },

  dispose() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
  }
};

function wasJustPressed(code) {
  return !!keys[code] && !prevKeys[code];
}

function onKeyDown(e) {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
}

function onKeyUp(e) {
  keys[e.code] = false;
}

function onMouseMove(e) {
  if (!pointerLocked) return;
  mouseDX += e.movementX;
  mouseDY += e.movementY;
}
