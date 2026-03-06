export const createInput = ({ domElement, onToggleInventory, onHotbar }) => {
  const state = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jumpPressed: false,
    attackPressed: false,
    defendHeld: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    inventoryOpen: false,
    pointerLocked: false,
  };

  const keys = new Set();
  let enabled = true;

  const syncMovement = () => {
    state.moveX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    state.moveZ = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    state.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
  };

  const onPointerLockChange = () => {
    state.pointerLocked = document.pointerLockElement === domElement;
  };

  const onKeyDown = (event) => {
    if (event.code === 'Tab') {
      event.preventDefault();
      state.inventoryOpen = !state.inventoryOpen;
      if (state.inventoryOpen) {
        document.exitPointerLock();
      }
      onToggleInventory?.(state.inventoryOpen);
      return;
    }

    if (!enabled) {
      return;
    }

    if (/Digit[1-5]/.test(event.code)) {
      onHotbar?.(Number(event.code.replace('Digit', '')) - 1);
    }

    if (!keys.has(event.code) && event.code === 'Space') {
      state.jumpPressed = true;
    }

    keys.add(event.code);
    syncMovement();
  };

  const onKeyUp = (event) => {
    keys.delete(event.code);
    syncMovement();
  };

  const onMouseMove = (event) => {
    if (!enabled || !state.pointerLocked || state.inventoryOpen) {
      return;
    }

    state.mouseDeltaX += event.movementX;
    state.mouseDeltaY += event.movementY;
  };

  const onMouseDown = (event) => {
    if (!state.pointerLocked && !state.inventoryOpen) {
      void domElement.requestPointerLock();
    }

    if (!enabled || state.inventoryOpen) {
      return;
    }

    if (event.button === 0) {
      state.attackPressed = true;
    }
    if (event.button === 2) {
      state.defendHeld = true;
    }
  };

  const onMouseUp = (event) => {
    if (event.button === 2) {
      state.defendHeld = false;
    }
  };

  const onContextMenu = (event) => {
    event.preventDefault();
  };

  document.addEventListener('pointerlockchange', onPointerLockChange);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('contextmenu', onContextMenu);

  return {
    state,
    setEnabled(value) {
      enabled = value;
      if (!enabled) {
        keys.clear();
        state.moveX = 0;
        state.moveZ = 0;
        state.sprint = false;
        state.attackPressed = false;
        state.defendHeld = false;
      }
    },
    endFrame() {
      state.mouseDeltaX = 0;
      state.mouseDeltaY = 0;
      state.attackPressed = false;
      state.jumpPressed = false;
    },
    dispose() {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
    },
  };
};