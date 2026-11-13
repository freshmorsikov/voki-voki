const themeId = new URLSearchParams(window.location.search).get('theme') === 'game-of-thrones' ? 'game-of-thrones' : 'harry-potter';
const rollButton = document.querySelector('#roll-button');
const hardButton = document.querySelector('#hard-button');
const newGameButton = document.querySelector('#new-game-button');
const dice = document.querySelector('#dice');
const diceScreen = document.querySelector('#dice-screen');
const taskScreen = document.querySelector('#task-screen');
const resultDie = document.querySelector('#result-die');
const taskTitle = document.querySelector('#task-title');
const taskDescription = document.querySelector('#task-description');
const wordsList = document.querySelector('#words-list');
const wrongButton = document.querySelector('#wrong-button');
const correctButton = document.querySelector('#correct-button');
const correctPoints = document.querySelector('#correct-points');
const fifthTaskButtons = document.querySelectorAll('.answer-five');
const sixthTaskButtons = document.querySelector('#answer-six-buttons');
const rerollButton = document.querySelector('#reroll-button');
const announcer = document.querySelector('#announcer');
const scoreboard = document.querySelector('#scoreboard');

const turnCards = [document.querySelector('#dice-turn'), document.querySelector('#task-turn')];
let game = null;
try {
  const saved = JSON.parse(localStorage.getItem('game'));
  if (saved && Array.isArray(saved.teams) && saved.teams.length >= 2 &&
      saved.teams.every((team) => team && typeof team.name === 'string' && Array.isArray(team.players) &&
        team.players.length > 0 && team.players.every((player) => player && typeof player.name === 'string')) &&
      (saved.themeId || 'harry-potter') === themeId &&
      saved.turn && Number.isSafeInteger(saved.turn.number) && saved.turn.number > 0) game = saved;
} catch (error) {
  // The dice can still be used without a saved game.
}

function participantAt(number) {
  const index = number - 1;
  const team = game.teams[index % game.teams.length];
  const player = team.players[Math.floor(index / game.teams.length) % team.players.length];
  return { team, player };
}

function renderTurn() {
  if (!game) return;
  const current = participantAt(game.turn.number);
  game.turn.teamId = current.team.id;
  game.turn.playerId = current.player.id;
  turnCards.forEach((card) => {
    const label = document.createElement('span');
    label.className = 'turn-label';
    label.textContent = 'Ходит игрок';
    const player = document.createElement('strong');
    player.className = 'turn-player';
    player.textContent = current.player.name;
    const playerGroup = document.createElement('div');
    playerGroup.className = 'turn-player-group';
    const team = document.createElement('span');
    team.className = 'turn-team';
    team.textContent = current.team.name;
    const teamGroup = document.createElement('div');
    teamGroup.className = 'turn-team-group';
    if (typeof current.team.image === 'string' && current.team.image) {
      const crest = document.createElement('img');
      crest.className = 'turn-crest';
      crest.src = themeId === 'harry-potter' && /^images\/(gryffindor|hufflepuff|ravenclaw|slytherin)\.png$/.test(current.team.image)
        ? `harry-potter/${current.team.image}`
        : current.team.image;
      crest.alt = '';
      teamGroup.append(crest);
    }
    playerGroup.append(label, player, team);
    card.replaceChildren(playerGroup, teamGroup);
    card.hidden = false;
  });
}

function renderScoreboard() {
  if (!game) return;
  const rows = game.teams.map((team) => {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = team.name;
    const score = document.createElement('td');
    score.textContent = Number.isFinite(team.score) ? team.score : 0;
    row.append(name, score);
    return row;
  });
  scoreboard.querySelector('tbody').replaceChildren(...rows);
  scoreboard.hidden = false;
}

function advanceTurn() {
  if (!game) return;
  game.turn.number += 1;
  renderTurn();
  try { localStorage.setItem('game', JSON.stringify(game)); } catch (error) {
    announcer.textContent = 'Не удалось сохранить следующий ход в браузере.';
  }
}

const cardCache = new Map();
const usedCardIndexes = new Map();
const ROLL_DURATION = 1200;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const diceLift = document.querySelector('.dice-lift');
const diceShadow = document.querySelector('.dice-shadow');
const faceRotations = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
let currentRotation = [0, 0];
let rolling = false;

function cubeTransform(x, y, z = 0) {
  return `rotateX(-18deg) rotateY(-28deg) rotateZ(-8deg) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
}

async function animateRoll(number) {
  const [x, y] = faceRotations[number];
  if (reducedMotion.matches) {
    dice.style.transform = cubeTransform(x, y);
    currentRotation = [x, y];
    return;
  }
  const timing = { duration: ROLL_DURATION, easing: 'linear' };
  const animations = [
    dice.animate([
      { transform: cubeTransform(...currentRotation), offset: 0, easing: 'cubic-bezier(.2,.65,.3,1)' },
      { transform: cubeTransform(x + 720, y + 720, 360), offset: .78, easing: 'ease-out' },
      { transform: cubeTransform(x + 720, y + 720, 360), offset: 1 }
    ], timing),
    diceLift.animate([
      { transform: 'translateY(0)', offset: 0, easing: 'ease-out' },
      { transform: 'translateY(-85px)', offset: .3, easing: 'ease-in' },
      { transform: 'translateY(4px)', offset: .7, easing: 'ease-out' },
      { transform: 'translateY(-17px)', offset: .82, easing: 'ease-in' },
      { transform: 'translateY(0)', offset: 1 }
    ], timing),
    diceShadow.animate([
      { transform: 'scale(1)', opacity: 1, offset: 0 },
      { transform: 'scale(.65)', opacity: .35, offset: .3 },
      { transform: 'scale(1.08)', opacity: 1, offset: .7 },
      { transform: 'scale(.9)', opacity: .75, offset: .82 },
      { transform: 'scale(1)', opacity: 1, offset: 1 }
    ], timing)
  ];
  // Commit the equivalent final pose underneath the animation, avoiding a snap at completion.
  dice.style.transform = cubeTransform(x, y);
  currentRotation = [x, y];
  await Promise.all(animations.map((animation) => animation.finished));
}
const RESULT_DURATION = 1000;

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function setDiceValue(number) {
  dice.dataset.value = number;
  rollButton.setAttribute('aria-label', `Бросить кубик. Сейчас выпало ${number}`);
}

function randomNumber(max) {
  const numbers = new Uint32Array(1);
  crypto.getRandomValues(numbers);
  return numbers[0] % max;
}

async function getCards(number) {
  if (!cardCache.has(number)) {
    const response = await fetch(`${themeId}/${number}.json`);
    if (!response.ok) throw new Error('Не удалось загрузить задания');
    const cards = await response.json();
    cardCache.set(number, cards);
  }
  return cardCache.get(number);
}

function getAvailableCardIndexes(number, cards) {
  const usedIndexes = usedCardIndexes.get(number) ?? new Set();
  return cards.flatMap((_, index) => (usedIndexes.has(index) ? [] : [index]));
}

async function getNextCard(onlyNumber = null) {
  const availableTasks = [];

  for (let number = 1; number <= 6; number += 1) {
    if (onlyNumber && number !== onlyNumber) continue;
    const cards = await getCards(number);
    const indexes = getAvailableCardIndexes(number, cards);
    if (indexes.length) availableTasks.push({ number, cards, indexes });
  }

  if (!availableTasks.length) return null;

  const task = availableTasks[randomNumber(availableTasks.length)];
  const index = task.indexes[randomNumber(task.indexes.length)];
  return { number: task.number, card: task.cards[index], index };
}

function showCard(number, card, index) {
  correctPoints.textContent = `+${number} ${number === 1 ? 'очко' : number < 5 ? 'очка' : 'очков'}`;
  correctButton.hidden = number === 5 || number === 6;
  fifthTaskButtons.forEach((button) => { button.hidden = number !== 5; });
  sixthTaskButtons.hidden = number !== 6;
  if (number === 6) {
    sixthTaskButtons.replaceChildren(...card.words.map((_, index) => {
      const points = 6 * (card.words.length - index) / card.words.length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button answer-correct';
      if (card.words.length % 2 === 0 && index === card.words.length - 1) button.classList.add('answer-centered');
      button.append('Ответили верно');
      const label = document.createElement('span');
      label.textContent = `+${points} ${points === 1 ? 'очко' : points >= 2 && points <= 4 ? 'очка' : 'очков'}`;
      button.append(label);
      button.addEventListener('click', () => finishTurn(points));
      return button;
    }));
  }
  resultDie.dataset.value = number;
  resultDie.setAttribute('aria-label', `Результат броска: ${number}`);
  taskTitle.textContent = card.task;
  taskDescription.textContent = card.description;
  wordsList.replaceChildren(...card.words.map((word) => {
    const item = document.createElement('li');
    item.textContent = word;
    return item;
  }));
  diceScreen.classList.remove('active');
  taskScreen.classList.add('active');
  announcer.textContent = `Выпало ${number}. Задание: ${card.task}.`;
  taskTitle.focus({ preventScroll: true });
}

async function rollDice() {
  if (rolling) return;
  rolling = true;
  rollButton.disabled = true;
  hardButton.disabled = true;
  newGameButton.disabled = true;
  rollButton.setAttribute('aria-busy', 'true');
  rollButton.classList.add('is-rolling');
  announcer.textContent = 'Бросаем кубик…';
  try {
    const nextCard = await getNextCard();
    if (!nextCard) {
      announcer.textContent = 'Все уникальные слова закончились. Обновите страницу, чтобы начать заново.';
      rollButton.classList.remove('is-rolling');
      return;
    }

    await animateRoll(nextCard.number);

    if (!usedCardIndexes.has(nextCard.number)) {
      usedCardIndexes.set(nextCard.number, new Set());
    }
    usedCardIndexes.get(nextCard.number).add(nextCard.index);

    setDiceValue(nextCard.number);
    rollButton.classList.replace('is-rolling', 'is-showing-result');
    announcer.textContent = `Выпало ${nextCard.number}.`;
    await wait(RESULT_DURATION);
    showCard(nextCard.number, nextCard.card, nextCard.index);
  } catch (error) {
    announcer.textContent = 'Не удалось загрузить задания. Попробуйте ещё раз.';
    rollButton.classList.remove('is-rolling');
    rollButton.classList.remove('is-showing-result');
  } finally {
    rolling = false;
    rollButton.disabled = false;
    hardButton.disabled = false;
    newGameButton.disabled = false;
    rollButton.removeAttribute('aria-busy');
  }
}

hardButton.addEventListener('click', async () => {
  if (rolling) return;
  rolling = true;
  hardButton.disabled = true;
  rollButton.disabled = true;
  newGameButton.disabled = true;
  hardButton.setAttribute('aria-busy', 'true');
  try {
    const nextCard = await getNextCard(6);
    if (!nextCard) {
      announcer.textContent = 'Сложные задания закончились. Обновите страницу, чтобы начать заново.';
      return;
    }
    if (!usedCardIndexes.has(6)) usedCardIndexes.set(6, new Set());
    usedCardIndexes.get(6).add(nextCard.index);
    showCard(6, nextCard.card, nextCard.index);
  } catch (error) {
    announcer.textContent = 'Не удалось загрузить задание. Попробуйте ещё раз.';
  } finally {
    rolling = false;
    hardButton.disabled = false;
    rollButton.disabled = false;
    newGameButton.disabled = false;
    hardButton.removeAttribute('aria-busy');
  }
});

newGameButton.addEventListener('click', () => {
  window.location.href = `new-game.html?theme=${themeId}`;
});

rollButton.addEventListener('click', rollDice);
rerollButton.addEventListener('click', () => {
  if (rolling) return;
  taskScreen.classList.remove('active');
  diceScreen.classList.add('active');
  rollButton.classList.remove('is-showing-result');
  rollDice();
});
function finishTurn(points) {
  if (game && points > 0) {
    const team = participantAt(game.turn.number).team;
    team.score = (Number.isFinite(team.score) ? team.score : 0) + points;
    renderScoreboard();
  }
  advanceTurn();
  taskScreen.classList.remove('active');
  diceScreen.classList.add('active');
  rollButton.classList.remove('is-rolling');
  rollButton.classList.remove('is-showing-result');
  rollButton.focus();
}
wrongButton.addEventListener('click', () => finishTurn(0));
correctButton.addEventListener('click', () => finishTurn(Number(resultDie.dataset.value)));
fifthTaskButtons.forEach((button) => {
  button.addEventListener('click', () => finishTurn(Number(button.dataset.points)));
});

renderTurn();
renderScoreboard();
setDiceValue(1);
