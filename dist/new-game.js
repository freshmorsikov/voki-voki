const teamsContainer = document.querySelector('#teams');
const startButton = document.querySelector('#start-game');
const message = document.querySelector('#setup-message');
let theme = null;
const teams = [];
let nextId = 0;

function createId() {
  nextId += 1;
  return `participant-${nextId}`;
}

function updateControls() {
  startButton.disabled = teams.filter((team) => team.players.length > 0).length < 2;
}

function renderTeam(team) {
  const card = document.createElement('article');
  card.className = 'setup-card';

  const image = document.createElement('img');
  image.className = 'team-crest';
  image.src = team.image;
  image.alt = '';
  const title = document.createElement('h2');
  title.textContent = team.name;

  const list = document.createElement('ul');
  list.className = 'player-list';
  list.setAttribute('aria-label', `Игроки команды ${team.name}`);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'add-player-button';
  addButton.textContent = 'Добавить игрока +';
  addButton.setAttribute('aria-label', `Добавить игрока в команду ${team.name}`);

  const form = document.createElement('form');
  form.className = 'player-form';
  form.hidden = true;
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Имя игрока';
  input.setAttribute('aria-label', `Имя игрока для команды ${team.name}`);
  input.maxLength = 60;
  input.required = true;
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Добавить';
  submit.disabled = true;
  form.append(input, submit);

  input.addEventListener('input', () => {
    submit.disabled = !input.value.trim();
  });

  addButton.addEventListener('click', () => {
    form.hidden = false;
    addButton.hidden = true;
    input.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const player = { id: createId(), name };
    team.players.push(player);
    const item = document.createElement('li');
    const playerName = document.createElement('span');
    playerName.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Удалить игрока ${name} из команды ${team.name}`);
    remove.addEventListener('click', () => {
      team.players.splice(team.players.indexOf(player), 1);
      item.remove();
      updateControls();
    });
    item.append(playerName, remove);
    list.append(item);
    input.value = '';
    submit.disabled = true;
    form.hidden = true;
    addButton.hidden = false;
    addButton.focus();
    updateControls();
  });

  card.append(image, title, addButton, form, list);
  teamsContainer.append(card);
}

startButton.addEventListener('click', () => {
  const participatingTeams = teams.filter((team) => team.players.length > 0);
  if (participatingTeams.length < 2) return;
  const game = {
    version: 1,
    theme: theme.theme,
    teams: participatingTeams,
    turn: { teamId: participatingTeams[0].id, playerId: participatingTeams[0].players[0].id, number: 1 },
  };
  try {
    localStorage.setItem('game', JSON.stringify(game));
    window.location.href = './';
  } catch (error) {
    message.textContent = 'Не удалось сохранить игру в браузере. Проверьте настройки хранения данных и попробуйте снова.';
  }
});

fetch('themes.json')
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить тему');
    return response.json();
  })
  .then((data) => {
    if (!data || !Array.isArray(data.teams) || !data.teams.every((team) => team && typeof team.name === 'string' && typeof team.image === 'string') || typeof data.theme !== 'string') throw new Error('Неверный формат темы');
    theme = data;
    document.querySelector('#theme-label').textContent = theme.theme;
    data.teams.forEach((candidate) => {
      const team = { id: createId(), name: candidate.name, image: candidate.image, score: 0, players: [] };
      teams.push(team);
      renderTeam(team);
    });
    updateControls();
  })
  .catch((error) => {
    console.error('Не удалось загрузить команды:', error);
    message.textContent = window.location.protocol === 'file:'
      ? 'Откройте игру через локальный сервер: браузер не разрешает загрузку команд напрямую из файла.'
      : 'Не удалось загрузить команды. Проверьте, что файл themes.json доступен, и обновите страницу.';
  });
