// Added stamina system
let stamina = 100;
const maxStamina = 100;

function updateStamina() {
  if (stamina < maxStamina) {
    stamina = Math.min(stamina + 0.5, maxStamina);
  }
  document.getElementById('stamina-bar').style.width = `${stamina}%`;
}

// Trigger on attack
function attack() {
  if (stamina >= 20) {
    stamina -= 20;
    // Proceed with combat logic...
  }
}

setInterval(updateStamina, 100);
