import './styles.css';

import { Game } from './core/game.js';

const canvas = document.querySelector('#game-canvas');
const uiRoot = document.querySelector('#ui-root');
const errorRoot = document.querySelector('#error-root');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game-canvas element.');
}

if (!(uiRoot instanceof HTMLDivElement) || !(errorRoot instanceof HTMLDivElement)) {
  throw new Error('Missing UI root elements.');
}

let game;

const showError = (message) => {
  errorRoot.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'error-card';
  card.textContent = message;
  errorRoot.append(card);
};

const boot = async () => {
  try {
    game = new Game({ canvas, uiRoot });
    await game.start();
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unexpected startup error.';
    showError(`Startup failed: ${message}`);
  }
};

window.addEventListener('error', (event) => {
  console.error(event.error ?? event.message);
  showError(`Runtime error: ${event.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error(event.reason);
  const message = event.reason instanceof Error ? event.reason.message : 'Unhandled promise rejection.';
  showError(`Runtime error: ${message}`);
});

window.addEventListener('beforeunload', () => {
  game?.dispose();
});

void boot();