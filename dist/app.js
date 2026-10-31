const rollButton = document.querySelector('#roll-button');
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
  rollButton.classList.add('is-rolling');
  try {
    const nextCard = await getNextCard();
    if (!nextCard) {
      announcer.textContent = 'Все уникальные слова закончились. Обновите страницу, чтобы начать заново.';
      rollButton.classList.remove('is-rolling');
      return;
    }

    if (!usedCardIndexes.has(nextCard.number)) {
      usedCardIndexes.set(nextCard.number, new Set());
    }
    usedCardIndexes.get(nextCard.number).add(nextCard.index);
    window.setTimeout(
      () => showCard(nextCard.number, nextCard.card, nextCard.index),
      1050,
    );
  } catch (error) {
    announcer.textContent = 'Не удалось загрузить задания. Попробуйте ещё раз.';
    rollButton.classList.remove('is-rolling');
  }
}

rollButton.addEventListener('click', rollDice);
againButton.addEventListener('click', () => {
  taskScreen.classList.remove('active');
  diceScreen.classList.add('active');
  rollButton.classList.remove('is-rolling');
  rollButton.focus();
});
