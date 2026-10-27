'use strict';

// ===== Game constants (change them here, the whole game follows) =====
const MAX_HP = 100;
const HERO_MIN_DAMAGE = 8;
const HERO_MAX_DAMAGE = 15;
const ENEMY_MIN_DAMAGE = 5;
const ENEMY_MAX_DAMAGE = 14;
const HEAL_AMOUNT = 20;
const MAX_HEALS = 3;
const CRIT_CHANCE = 0.1;      // 10%
const CRIT_MULTIPLIER = 2;
const LOG_SIZE = 5;
const LOW_HP_PERCENT = 30;    // progress bar turns red at or below this value

// ===== DOM references =====
const els = {
  heroBar: document.getElementById('hero-bar'),
  heroHp: document.getElementById('hero-hp'),
  heroCard: document.getElementById('hero-card'),
  heroDefending: document.getElementById('hero-defending'),
  enemyBar: document.getElementById('enemy-bar'),
  enemyHp: document.getElementById('enemy-hp'),
  enemyCard: document.getElementById('enemy-card'),
  message: document.getElementById('message'),
  result: document.getElementById('result'),
  actions: document.getElementById('actions'),
  healBtn: document.getElementById('heal-btn'),
  restart: document.getElementById('restart'),
  log: document.getElementById('log'),
};

// ===== Game state =====
const state = {
  heroHp: MAX_HP,
  enemyHp: MAX_HP,
  healsLeft: MAX_HEALS,
  defending: false,
  over: false,
  outcome: 'continue',
  message: '',
  messageType: '',
  log: [],
};

// Whole number from min to max, both included
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollCrit() {
  return Math.random() < CRIT_CHANCE;
}

function addLog(text) {
  state.log.unshift(text);              // newest first
  if (state.log.length > LOG_SIZE) {
    state.log.length = LOG_SIZE;        // keep only the last N actions
  }
}

function setMessage(text, type) {
  state.message = text;
  state.messageType = type;
}

// A rejected move changes nothing except the message
function reject(text) {
  setMessage(text, 'error');
  render();
}

function getOutcome() {
  if (state.enemyHp === 0) return 'win';
  if (state.heroHp === 0) return 'lose';
  return 'continue';
}

function heroAttack() {
  let damage = randomInt(HERO_MIN_DAMAGE, HERO_MAX_DAMAGE);
  const crit = rollCrit();
  if (crit) damage *= CRIT_MULTIPLIER;
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  addLog(`You hit the enemy for ${damage}${crit ? ' (CRITICAL HIT!)' : ''}.`);
}

function heroDefend() {
  state.defending = true;
  addLog('You raise your shield: the next hit will be halved.');
}

function heroHeal() {
  const before = state.heroHp;
  state.heroHp = Math.min(MAX_HP, state.heroHp + HEAL_AMOUNT);
  state.healsLeft -= 1;
  addLog(`You heal ${state.heroHp - before} HP (${state.healsLeft} heals left).`);
}

function enemyAttack() {
  let damage = randomInt(ENEMY_MIN_DAMAGE, ENEMY_MAX_DAMAGE);
  const crit = rollCrit();
  if (crit) damage *= CRIT_MULTIPLIER;
  let note = crit ? ' (CRITICAL HIT!)' : '';
  if (state.defending) {
    damage = Math.floor(damage / 2);
    state.defending = false;            // defence is used up by one hit
    note += ' (blocked by shield)';
  }
  state.heroHp = Math.max(0, state.heroHp - damage);
  addLog(`The enemy hits you for ${damage}${note}.`);
}

function takeTurn(action) {
  // --- validation: nothing changes if the move is not allowed ---
  if (state.over) {
    reject('The battle is over. Press "New battle" to play again.');
    return;
  }
  if (action !== 'attack' && action !== 'defend' && action !== 'heal') {
    reject('Unknown move.');
    return;
  }
  if (action === 'defend' && state.defending) {
    reject('You are already defending. Choose another move.');
    return;
  }
  if (action === 'heal' && state.healsLeft === 0) {
    reject('No heals left.');
    return;
  }
  if (action === 'heal' && state.heroHp === MAX_HP) {
    reject('Your HP is already full.');
    return;
  }

  // --- hero move ---
  if (action === 'attack') heroAttack();
  else if (action === 'defend') heroDefend();
  else heroHeal();

  // --- enemy answers only if still alive ---
  state.outcome = getOutcome();
  if (state.outcome === 'continue') {
    enemyAttack();
    state.outcome = getOutcome();
  }

  state.over = state.outcome === 'win' || state.outcome === 'lose';
  if (state.over) {
    setMessage('', '');
    addLog(state.outcome === 'win' ? 'The enemy is defeated!' : 'You were defeated...');
  } else {
    setMessage('', '');
  }
  render();
}

function newGame() {
  state.heroHp = MAX_HP;
  state.enemyHp = MAX_HP;
  state.healsLeft = MAX_HEALS;
  state.defending = false;
  state.over = false;
  state.outcome = 'continue';
  state.log = [];
  setMessage('A new battle begins. Choose your move.', 'ok');
  addLog('The battle begins!');
  render();
}

function renderBar(bar, textEl, hp) {
  bar.max = MAX_HP;
  bar.value = hp;
  bar.classList.toggle('low', (hp / MAX_HP) * 100 <= LOW_HP_PERCENT);
  textEl.textContent = `${hp} / ${MAX_HP} HP`;
}

function render() {
  renderBar(els.heroBar, els.heroHp, state.heroHp);
  renderBar(els.enemyBar, els.enemyHp, state.enemyHp);

  els.heroDefending.hidden = !state.defending;
  els.heroCard.classList.toggle('is-defending', state.defending);
  els.heroCard.classList.toggle('is-dead', state.outcome === 'lose');
  els.enemyCard.classList.toggle('is-dead', state.outcome === 'win');

  els.message.textContent = state.message;
  els.message.className = 'message' + (state.messageType ? ' ' + state.messageType : '');

  els.healBtn.textContent = `Heal +${HEAL_AMOUNT} (${state.healsLeft} left)`;
  for (const btn of els.actions.querySelectorAll('button[data-action]')) {
    btn.disabled = state.over;
  }

  els.result.hidden = !state.over;
  els.result.classList.toggle('win', state.outcome === 'win');
  els.result.classList.toggle('loss', state.outcome === 'lose');
  els.result.textContent = state.outcome === 'win'
    ? 'Victory! You defeated the enemy.'
    : 'Defeat. The enemy was stronger this time.';

  els.log.replaceChildren();
  if (state.log.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No actions yet.';
    els.log.append(li);
  }
  for (const entry of state.log) {
    const li = document.createElement('li');
    li.textContent = entry;
    els.log.append(li);
  }
}

els.actions.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  takeTurn(btn.dataset.action);
});
els.restart.addEventListener('click', newGame);

newGame();
