const themeId = new URLSearchParams(window.location.search).get('theme') === 'game-of-thrones' ? 'game-of-thrones' : 'harry-potter';
const teamsContainer = document.querySelector('#teams');
const startButton = document.querySelector('#start-game');
const message = document.querySelector('#setup-message');
const generateForm = document.querySelector('#generate-form');
const teamCount = document.querySelector('#team-count');
const playerCount = document.querySelector('#player-count');
const teamDialog = document.querySelector('#team-dialog');
const availableTeams = document.querySelector('#available-teams');
document.querySelector('#close-team-dialog').addEventListener('click', () => teamDialog.close());
let theme = null;
const teams = [];
let nextId = 0;

function createId() {
  nextId += 1;
  return `participant-${nextId}`;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

function updateControls() {
  startButton.disabled = teams.filter((team) => team.players.length > 0).length < 2;
}

function renderTeam(team, defaultPlayers, previousCard = null) {
  const card = document.createElement('article');
  card.className = 'team-column';

  const teamCard = document.createElement('button');
  teamCard.type = 'button';
  teamCard.className = 'setup-card team-select-button';
  teamCard.setAttribute('aria-label', `Выбрать другую команду вместо ${team.name}`);

  teamCard.addEventListener('click', () => {
    const available = theme.teams.filter((candidate) => !teams.some((selected) => selected.name === candidate.name));
    availableTeams.replaceChildren();
    available.forEach((candidate) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'available-team';
      const crest = document.createElement('img');
      crest.src = candidate.image;
      crest.alt = '';
      const name = document.createElement('span');
      name.textContent = candidate.name;
      option.append(crest, name);
      option.addEventListener('click', () => {
        const replacement = { id: createId(), name: candidate.name, image: candidate.image, score: 0, players: [], initialPlayers: shuffle(candidate.players).slice(0, team.players.length) };
        teams[teams.indexOf(team)] = replacement;
        teamDialog.close();
        renderTeam(replacement, candidate.players, card);
        updateTeamChoices();
        teamsContainer.querySelectorAll('.team-select-button')[teams.indexOf(replacement)].focus();
        updateControls();
      });
      availableTeams.append(option);
    });
    teamDialog.showModal();
  });

  const image = document.createElement('img');
  image.className = 'team-crest';
  if (team.image) image.src = team.image;
  image.alt = '';
  const title = document.createElement('h2');
  title.textContent = team.name;

  const list = document.createElement('ul');
  list.className = 'player-list';
  list.setAttribute('aria-label', `Игроки команды ${team.name}`);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'add-player-button';
  addButton.textContent = '+';
  addButton.setAttribute('aria-label', `Добавить игрока в команду ${team.name}`);

  const addCard = document.createElement('div');
  addCard.className = 'add-player-card';
  const addNumber = document.createElement('span');
  addNumber.className = 'player-number';
  addCard.append(addNumber, addButton);

  function updateNumbers() {
    list.querySelectorAll('.player-number').forEach((number, index) => {
      number.textContent = `№ ${index + 1}`;
    });
    addNumber.textContent = `№ ${team.players.length + 1}`;
    list.querySelectorAll('.remove-button').forEach((button) => {
      button.disabled = team.players.length <= 1;
      button.title = button.disabled ? 'В команде должен остаться хотя бы один игрок' : '';
    });
    const hasAvailablePlayers = defaultPlayers.some((name) => !team.players.some((player) => player.name === name));
    addButton.disabled = !hasAvailablePlayers;
    addButton.title = hasAvailablePlayers ? '' : 'Все персонажи уже добавлены';
  }

  addButton.addEventListener('click', () => {
    const availablePlayers = defaultPlayers.filter((name) => !team.players.some((player) => player.name === name));
    if (!availablePlayers.length) return;
    const name = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    addPlayer(name);
  });

  function addPlayer(name) {
    const player = { id: createId(), name };
    team.players.push(player);
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'player-number';
    const playerName = document.createElement('span');
    playerName.className = 'player-name';
    playerName.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Удалить игрока ${name} из команды ${team.name}`);
    remove.addEventListener('click', () => {
      if (team.players.length <= 1) return;
      team.players.splice(team.players.indexOf(player), 1);
      item.remove();
      updateNumbers();
      updateControls();
    });
    item.append(number, playerName, remove);
    list.append(item);
    updateNumbers();
    updateControls();
  }

  team.initialPlayers.forEach(addPlayer);
  delete team.initialPlayers;

  updateNumbers();
  if (team.image) teamCard.append(image);
  const teamHint = document.createElement('span');
  teamHint.className = 'team-select-hint';
  teamHint.textContent = 'Сменить команду';
  teamCard.append(title, teamHint);
  card.append(teamCard, list, addCard);
  if (previousCard) previousCard.replaceWith(card);
  else teamsContainer.append(card);
}

function updateTeamChoices() {
  const allSelected = teams.length >= theme.teams.length;
  teamsContainer.querySelectorAll('.team-select-button').forEach((button) => {
    button.disabled = allSelected;
    button.title = allSelected ? 'Все команды уже выбраны' : 'Выбрать другую команду';
  });
}

generateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!theme || !generateForm.reportValidity()) return;
  const previous = JSON.stringify(teams.map((team) => [team.name, team.players.map((player) => player.name)]));
  const candidates = shuffle(theme.teams).slice(0, Number(teamCount.value)).map((candidate) => ({
    candidate,
    players: shuffle(candidate.players).slice(0, Number(playerCount.value)),
  }));
  const generated = JSON.stringify(candidates.map(({ candidate, players }) => [candidate.name, players]));
  if (generated === previous) {
    const first = candidates[0];
    const replacement = first.candidate.players.find((name) => !first.players.includes(name));
    if (replacement) first.players[0] = replacement;
    else if (first.players.length > 1) first.players.push(first.players.shift());
  }
  teams.length = 0;
  teamsContainer.replaceChildren();
  candidates.forEach(({ candidate, players }) => {
    const team = { id: createId(), name: candidate.name, image: candidate.image, score: 0, players: [], initialPlayers: players };
    teams.push(team);
    renderTeam(team, candidate.players);
  });
  updateTeamChoices();
  startButton.hidden = false;
  message.textContent = '';
  updateControls();
});

startButton.addEventListener('click', () => {
  const participatingTeams = teams.filter((team) => team.players.length > 0);
  if (participatingTeams.length < 2) return;
  const game = {
    version: 1,
    theme: theme.theme,
    themeId,
    teams: participatingTeams,
    turn: { teamId: participatingTeams[0].id, playerId: participatingTeams[0].players[0].id, number: 1 },
  };
  try {
    localStorage.setItem('game', JSON.stringify(game));
    window.location.href = `game.html?theme=${themeId}`;
  } catch (error) {
    message.textContent = 'Не удалось сохранить игру в браузере. Проверьте настройки хранения данных и попробуйте снова.';
  }
});

fetch(`${themeId}/themes.json`)
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить тему');
    return response.json();
  })
  .then((data) => {
    if (!data || !Array.isArray(data.teams) || !data.teams.every((team) => team && typeof team.name === 'string' && typeof team.image === 'string' && Array.isArray(team.players) && team.players.length >= 2 && team.players.every((name) => typeof name === 'string' && name.trim())) || typeof data.theme !== 'string') throw new Error('Неверный формат темы');
    theme = data;
    document.querySelector('#theme-label').textContent = theme.theme;
    teamCount.max = data.teams.length;
    playerCount.max = Math.min(...data.teams.map((team) => team.players.length));
    generateForm.querySelector('button').disabled = false;
  })
  .catch((error) => {
    console.error('Не удалось загрузить команды:', error);
    message.textContent = window.location.protocol === 'file:'
      ? 'Откройте игру через локальный сервер: браузер не разрешает загрузку команд напрямую из файла.'
      : 'Не удалось загрузить команды. Проверьте, что файл themes.json доступен, и обновите страницу.';
  });
