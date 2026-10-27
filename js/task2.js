'use strict';

// ===== Constants =====
const STATUSES = ['todo', 'doing', 'done'];
const STATUS_TITLES = { todo: 'To do', doing: 'In progress', done: 'Done' };
const WIP_LIMIT = 3; // max cards in "In progress"
const PRIORITY_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };

// ===== Data: the HTML has only empty containers =====
const cards = [
  { id: 1,  title: 'Sketch wireframes',        tag: 'design',      priority: 2, hours: 2, urgent: false, status: 'done' },
  { id: 2,  title: 'Choose color palette',     tag: 'design',      priority: 1, hours: 1, urgent: false, status: 'done' },
  { id: 3,  title: 'Write HTML structure',     tag: 'html',        priority: 3, hours: 3, urgent: true,  status: 'done' },
  { id: 4,  title: 'Style header and footer',  tag: 'css',         priority: 2, hours: 2, urgent: false, status: 'done' },
  { id: 5,  title: 'Build responsive grid',    tag: 'css',         priority: 3, hours: 4, urgent: true,  status: 'doing' },
  { id: 6,  title: 'Add contact form',         tag: 'html',        priority: 2, hours: 3, urgent: false, status: 'doing' },
  { id: 7,  title: 'Write form validation',    tag: 'js',          priority: 3, hours: 5, urgent: true,  status: 'todo' },
  { id: 8,  title: 'Optimize images',          tag: 'performance', priority: 1, hours: 2, urgent: false, status: 'todo' },
  { id: 9,  title: 'Add dark theme toggle',    tag: 'js',          priority: 1, hours: 2, urgent: false, status: 'todo' },
  { id: 10, title: 'Test at 375px and 1280px', tag: 'testing',     priority: 2, hours: 1, urgent: false, status: 'todo' },
  { id: 11, title: 'Fix accessibility issues', tag: 'a11y',        priority: 3, hours: 3, urgent: true,  status: 'todo' },
  { id: 12, title: 'Write README',             tag: 'docs',        priority: 1, hours: 1, urgent: false, status: 'todo' },
];

// ===== UI state (filters + message) =====
const state = { tag: 'all', query: '', sort: 'none', message: '', messageType: '' };

const els = {
  board: document.getElementById('board'),
  search: document.getElementById('search'),
  tag: document.getElementById('filter-tag'),
  sort: document.getElementById('sort'),
  reset: document.getElementById('reset-filters'),
  progress: document.getElementById('progress'),
  progressText: document.getElementById('progress-text'),
  message: document.getElementById('message'),
  emptyBoard: document.getElementById('empty-board'),
};

// ===== Calculations with my own loops =====
function countByStatus(status) {
  let count = 0;
  for (const card of cards) {
    if (card.status === status) count += 1;
  }
  return count;
}

function hoursLeft() {
  let sum = 0;
  for (const card of cards) {
    if (card.status !== 'done') sum += card.hours;
  }
  return sum;
}

function getTags() {
  const tags = [];
  for (const card of cards) {
    if (!tags.includes(card.tag)) tags.push(card.tag);
  }
  return tags.sort();
}

// ===== Filtering and sorting (returns a new array, data is not changed) =====
function getVisibleCards() {
  const query = state.query.trim().toLowerCase();
  const result = [];
  for (const card of cards) {
    const matchesTag = state.tag === 'all' || card.tag === state.tag;
    const matchesQuery = query === '' || card.title.toLowerCase().includes(query);
    if (matchesTag && matchesQuery) result.push(card);
  }
  if (state.sort === 'high') result.sort((a, b) => b.priority - a.priority || a.id - b.id);
  else if (state.sort === 'low') result.sort((a, b) => a.priority - b.priority || a.id - b.id);
  else result.sort((a, b) => a.id - b.id);
  return result;
}

// ===== Actions (change the array first, then render) =====
function setMessage(text, type) {
  state.message = text;
  state.messageType = type;
}

function moveCard(id, direction) {
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  const target = STATUSES[STATUSES.indexOf(card.status) + direction];
  if (!target) return;

  // Rule: "In progress" holds at most WIP_LIMIT cards
  if (target === 'doing' && countByStatus('doing') >= WIP_LIMIT) {
    setMessage(
      `Cannot move "${card.title}" to ${STATUS_TITLES.doing}: the column already has ${WIP_LIMIT} cards. Finish one first.`,
      'error'
    );
    render();
    return;
  }

  card.status = target;
  setMessage(`Moved "${card.title}" to ${STATUS_TITLES[target]}.`, 'ok');
  render();
}

// ===== Rendering =====
function createButton(text, action, card, label, disabled) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-secondary btn-small';
  btn.textContent = text;
  btn.dataset.action = action;
  btn.dataset.id = String(card.id);
  btn.setAttribute('aria-label', label);
  btn.disabled = disabled;
  return btn;
}

function createCard(card) {
  const li = document.createElement('li');
  li.className = `card priority-${card.priority}`;
  li.classList.toggle('is-done', card.status === 'done');

  const title = document.createElement('h3');
  title.textContent = card.title;

  const meta = document.createElement('p');
  meta.className = 'meta';
  const parts = [`#${card.tag}`, `${PRIORITY_LABELS[card.priority]} priority`, `${card.hours} h`];
  for (const text of parts) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = text;
    meta.append(chip);
  }
  if (card.urgent) {
    const chip = document.createElement('span');
    chip.className = 'chip urgent';
    chip.textContent = 'Urgent';
    meta.append(chip);
  }

  const index = STATUSES.indexOf(card.status);
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const prev = STATUSES[index - 1];
  const next = STATUSES[index + 1];
  actions.append(
    createButton('← Back', 'back', card, prev ? `Move "${card.title}" to ${STATUS_TITLES[prev]}` : 'Cannot go back', !prev),
    createButton('Next →', 'next', card, next ? `Move "${card.title}" to ${STATUS_TITLES[next]}` : 'Already done', !next)
  );

  li.append(title, meta, actions);
  return li;
}

function renderFilterOptions() {
  const tags = getTags();
  if (state.tag !== 'all' && !tags.includes(state.tag)) state.tag = 'all';
  els.tag.replaceChildren();
  for (const value of ['all', ...tags]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value === 'all' ? 'All tags' : value;
    els.tag.append(option);
  }
  els.tag.value = state.tag;
}

function renderProgress() {
  const done = countByStatus('done');
  const percent = cards.length === 0 ? 0 : Math.round((done / cards.length) * 100);
  els.progress.max = Math.max(cards.length, 1);
  els.progress.value = done;
  els.progressText.textContent = `${done} of ${cards.length} cards finished (${percent}%). Hours left: ${hoursLeft()}.`;
}

function renderBoard(visible) {
  els.board.replaceChildren();
  for (const status of STATUSES) {
    const column = document.createElement('section');
    column.className = 'column';
    const total = countByStatus(status);
    const isLimited = status === 'doing';
    column.classList.toggle('is-full', isLimited && total >= WIP_LIMIT);

    const heading = document.createElement('h2');
    const name = document.createElement('span');
    name.textContent = STATUS_TITLES[status];
    const count = document.createElement('span');
    count.textContent = isLimited ? `${total}/${WIP_LIMIT}` : String(total);
    heading.append(name, count);

    const list = document.createElement('ul');
    list.className = 'card-list';
    let shown = 0;
    for (const card of visible) {
      if (card.status !== status) continue;
      list.append(createCard(card));
      shown += 1;
    }
    if (shown === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = 'No cards here';
      list.append(empty);
    }
    column.append(heading, list);
    els.board.append(column);
  }
}

function render() {
  const visible = getVisibleCards();
  renderFilterOptions();
  renderProgress();
  renderBoard(visible);

  els.message.textContent = state.message;
  els.message.className = 'message' + (state.messageType ? ' ' + state.messageType : '');

  els.emptyBoard.hidden = visible.length > 0;
  if (visible.length === 0) {
    els.emptyBoard.textContent = 'Nothing found. Try another word or reset the filters.';
  }
}

// ===== Events =====
// One listener on the container for all card buttons (event delegation)
els.board.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  moveCard(id, btn.dataset.action === 'next' ? 1 : -1);
});

els.search.addEventListener('input', () => { state.query = els.search.value; setMessage('', ''); render(); });
els.tag.addEventListener('change', () => { state.tag = els.tag.value; setMessage('', ''); render(); });
els.sort.addEventListener('change', () => { state.sort = els.sort.value; setMessage('', ''); render(); });
els.reset.addEventListener('click', () => {
  state.tag = 'all';
  state.query = '';
  state.sort = 'none';
  els.search.value = '';
  els.sort.value = 'none';
  setMessage('', '');
  render();
});

render();
