// ── UI / HUD ──
// Stamina bar, height counter, grab indicator, intro screen, reset message

import { clamp, lerp } from './utils.js';

let uiRoot = null;
let staminaBar = null;
let staminaFill = null;
let staminaGlow = null;
let heightCounter = null;
let grabIndicator = null;
let introScreen = null;
let resetMessage = null;
let introResolve = null;
let resetTimeout = null;

export function initUI() {
  uiRoot = document.getElementById('ui-root');

  // ── Intro Screen ──
  introScreen = document.createElement('div');
  introScreen.id = 'intro-screen';
  introScreen.innerHTML = `
    <div class="intro-content">
      <h1 class="intro-title">SISYPHUS</h1>
      <p class="intro-quote">"One must imagine Sisyphus happy."</p>
      <p class="intro-author">— Albert Camus</p>
      <p class="intro-prompt">Click to begin</p>
    </div>
  `;
  document.body.appendChild(introScreen);

  // ── HUD Container ──
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.display = 'none';
  uiRoot.appendChild(hud);

  // ── Stamina Bar ──
  const staminaContainer = document.createElement('div');
  staminaContainer.className = 'stamina-container';

  const staminaLabel = document.createElement('div');
  staminaLabel.className = 'stamina-label';
  staminaLabel.textContent = 'STAMINA';

  const staminaTrack = document.createElement('div');
  staminaTrack.className = 'stamina-track';

  staminaFill = document.createElement('div');
  staminaFill.className = 'stamina-fill';

  staminaGlow = document.createElement('div');
  staminaGlow.className = 'stamina-glow';

  staminaTrack.appendChild(staminaGlow);
  staminaTrack.appendChild(staminaFill);
  staminaContainer.appendChild(staminaLabel);
  staminaContainer.appendChild(staminaTrack);
  hud.appendChild(staminaContainer);

  staminaBar = staminaContainer;

  // ── Height Counter ──
  heightCounter = document.createElement('div');
  heightCounter.className = 'height-counter';
  heightCounter.innerHTML = `
    <span class="height-value">0</span>
    <span class="height-unit">m</span>
  `;
  hud.appendChild(heightCounter);

  // ── Grab Indicator ──
  grabIndicator = document.createElement('div');
  grabIndicator.className = 'grab-indicator';
  grabIndicator.style.display = 'none';
  hud.appendChild(grabIndicator);

  // ── Reset Message ──
  resetMessage = document.createElement('div');
  resetMessage.className = 'reset-message';
  resetMessage.textContent = 'The boulder falls. Again.';
  resetMessage.style.display = 'none';
  hud.appendChild(resetMessage);

  // ── Controls Hint ──
  const controlsHint = document.createElement('div');
  controlsHint.className = 'controls-hint';
  controlsHint.innerHTML = `
    <span>WASD</span> Move
    <span>SHIFT</span> Sprint
    <span>E</span> Grab/Release
    <span>SPACE</span> Jump
  `;
  hud.appendChild(controlsHint);

  // Fade controls hint after 8 seconds
  setTimeout(() => {
    controlsHint.style.opacity = '0';
    setTimeout(() => controlsHint.remove(), 2000);
  }, 8000);
}

export function showIntro() {
  return new Promise(resolve => {
    introResolve = resolve;
    introScreen.style.display = 'flex';

    const handleClick = () => {
      introScreen.classList.add('fade-out');
      setTimeout(() => {
        introScreen.style.display = 'none';
        introScreen.remove();
        document.getElementById('hud').style.display = 'block';
        if (introResolve) introResolve();
      }, 800);
      document.removeEventListener('click', handleClick);
    };

    document.addEventListener('click', handleClick);
  });
}

export function updateStaminaBar(current, max, exhausted) {
  if (!staminaFill) return;
  const fraction = clamp(current / max, 0, 1);
  staminaFill.style.width = `${fraction * 100}%`;

  // Color transition green → yellow → red
  let r, g, b;
  if (fraction > 0.5) {
    const t = (fraction - 0.5) * 2;
    r = lerp(220, 80, t);
    g = lerp(180, 200, t);
    b = lerp(30, 60, t);
  } else {
    const t = fraction * 2;
    r = lerp(200, 220, t);
    g = lerp(50, 180, t);
    b = lerp(30, 30, t);
  }

  staminaFill.style.backgroundColor = `rgb(${r|0},${g|0},${b|0})`;

  // Exhaustion state
  if (exhausted) {
    staminaBar.classList.add('exhausted');
  } else {
    staminaBar.classList.remove('exhausted');
  }
}

export function updateHeightCounter(height) {
  if (!heightCounter) return;
  const value = heightCounter.querySelector('.height-value');
  if (value) {
    value.textContent = Math.floor(Math.max(0, height)).toString();
  }
}

export function showGrabIndicator(canGrab, isGrabbing) {
  if (!grabIndicator) return;
  if (canGrab || isGrabbing) {
    grabIndicator.style.display = 'block';
    if (isGrabbing) {
      grabIndicator.innerHTML = '<span class="key">E</span> Release';
    } else {
      grabIndicator.innerHTML = '<span class="key">E</span> Grab';
    }
  } else {
    grabIndicator.style.display = 'none';
  }
}

export function showResetMessage() {
  if (!resetMessage) return;
  if (resetTimeout) clearTimeout(resetTimeout);

  resetMessage.style.display = 'block';
  resetMessage.classList.add('visible');

  resetTimeout = setTimeout(() => {
    resetMessage.classList.remove('visible');
    setTimeout(() => {
      resetMessage.style.display = 'none';
    }, 600);
  }, 2000);
}

export function disposeUI() {
  if (uiRoot) uiRoot.innerHTML = '';
  if (introScreen && introScreen.parentNode) introScreen.remove();
}
