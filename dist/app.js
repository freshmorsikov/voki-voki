const rollButton = document.querySelector('#roll-button');
const dice = document.querySelector('#dice');
const diceScreen = document.querySelector('#dice-screen');
const taskScreen = document.querySelector('#task-screen');
const resultDie = document.querySelector('#result-die');
const taskTitle = document.querySelector('#task-title');
const taskDescription = document.querySelector('#task-description');
const wordsList = document.querySelector('#words-list');
const againButton = document.querySelector('#again-button');
const announcer = document.querySelector('#announcer');

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
    const response = await fetch(`${number}.json`);
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

async function getNextCard() {
  const availableTasks = [];

  for (let number = 1; number <= 6; number += 1) {
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
    rollButton.removeAttribute('aria-busy');
  }
}

rollButton.addEventListener('click', rollDice);
againButton.addEventListener('click', () => {
  taskScreen.classList.remove('active');
  diceScreen.classList.add('active');
  rollButton.classList.remove('is-rolling');
  rollButton.classList.remove('is-showing-result');
  rollButton.focus();
});

setDiceValue(1);
