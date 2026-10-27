'use strict';

// ===== Constants and data =====
const CURRENCY = '₸';
const BOOKING_PREFIX = 'AITU';
const BOOKING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOOKING_LENGTH = 6;
const BLOCKED_EMAIL_DOMAINS = ['mailinator.com', 'tempmail.com', '10minutemail.com'];

const events = [
  { id: 'jazz', name: 'Astana Jazz Night', dates: [
    { date: '2026-11-14', soldOut: false },
    { date: '2026-11-15', soldOut: true },
    { date: '2026-11-21', soldOut: false } ] },
  { id: 'tech', name: 'Tech Talk: AI Today', dates: [
    { date: '2026-11-18', soldOut: false },
    { date: '2026-11-25', soldOut: true },
    { date: '2026-12-02', soldOut: false } ] },
  { id: 'opera', name: 'Opera Gala', dates: [
    { date: '2026-12-05', soldOut: false },
    { date: '2026-12-06', soldOut: false },
    { date: '2026-12-12', soldOut: true } ] },
];

// seatsLeft changes after every successful booking
const ticketTypes = [
  { id: 'standard', label: 'Standard', price: 5000,  seatsLeft: 12 },
  { id: 'vip',      label: 'VIP',      price: 15000, seatsLeft: 4 },
  { id: 'student',  label: 'Student',  price: 3000,  seatsLeft: 8 },
];

const promoCodes = [
  { code: 'AITU10', discount: 10 },
  { code: 'STUDENT20', discount: 20 },
  { code: 'HACK2026', discount: 30 },
];

// ===== DOM =====
const form = document.getElementById('ticket-form');
form.noValidate = true; // turns off only the browser messages, checkValidity() still works

const FIELD_NAMES = ['event', 'date', 'type', 'quantity', 'fullName', 'email', 'promo'];
const LABELS = {
  event: 'Event', date: 'Date', type: 'Ticket type', quantity: 'Quantity',
  fullName: 'Full name', email: 'Email', promo: 'Promo code',
};
const fields = {};
const errorEls = {};
for (const name of FIELD_NAMES) {
  fields[name] = document.getElementById('f-' + name);
  errorEls[name] = document.getElementById('err-' + name);
}
const summary = document.getElementById('summary');
const preview = document.getElementById('preview');
const result = document.getElementById('result');
const dateHint = document.getElementById('hint-date');
const DATE_HINT_DEFAULT = dateHint.textContent;

// When one field changes, these fields depend on it and must be re-checked
const DEPENDENTS = { event: ['date'], type: ['quantity'] };

// ===== Helpers =====
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getEvent() { return events.find((e) => e.id === fields.event.value); }
function getType() { return ticketTypes.find((t) => t.id === fields.type.value); }
function findPromo(value) {
  return promoCodes.find((p) => p.code === value.trim().toUpperCase());
}
function formatMoney(value) {
  return `${value.toLocaleString('en-US')} ${CURRENCY}`;
}

// ===== Options built from arrays =====
function buildEventOptions() {
  fields.event.replaceChildren(new Option('Choose an event...', ''));
  for (const ev of events) fields.event.append(new Option(ev.name, ev.id));
}
function buildTypeOptions() {
  fields.type.replaceChildren(new Option('Choose a ticket type...', ''));
  for (const t of ticketTypes) {
    const text = t.seatsLeft === 0
      ? `${t.label} - sold out`
      : `${t.label} - ${formatMoney(t.price)} (${t.seatsLeft} left)`;
    const option = new Option(text, t.id);
    option.disabled = t.seatsLeft === 0;
    fields.type.append(option);
  }
}
function updateDateHint() {
  const ev = getEvent();
  if (!ev) { dateHint.textContent = DATE_HINT_DEFAULT; return; }
  const parts = [];
  for (const slot of ev.dates) parts.push(slot.soldOut ? `${slot.date} (sold out)` : slot.date);
  dateHint.textContent = `Dates: ${parts.join(', ')}`;
}

// ===== Custom rules (what HTML attributes cannot express) =====
// Each rule returns an error text, or '' when the value is correct
const rules = {
  date(value) {
    const ev = getEvent();
    if (!ev) return 'Choose an event first.';
    const slot = ev.dates.find((d) => d.date === value);
    if (!slot) return `"${ev.name}" is not held on this date. Check the dates under the field.`;
    if (slot.soldOut) return 'This date is sold out. Choose another date.';
    return '';
  },
  quantity(value) {
    const type = getType();
    if (!type) return 'Choose a ticket type first.';
    if (type.seatsLeft === 0) return `${type.label} tickets are sold out.`;
    if (Number(value) > type.seatsLeft) return `Only ${type.seatsLeft} ${type.label} seats left.`;
    return '';
  },
  fullName(value) {
    // at least two words, letters only (hyphen and apostrophe allowed)
    if (!/^\p{L}[\p{L}'-]*(\s+\p{L}[\p{L}'-]*)+$/u.test(value)) {
      return 'Enter first and last name using letters only, e.g. "Ravil Maratov".';
    }
    return '';
  },
  email(value) {
    const domain = value.split('@')[1] || '';
    if (BLOCKED_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
      return 'Temporary email addresses are not accepted. Use your real email.';
    }
    return '';
  },
  promo(value) {
    if (value !== '' && !findPromo(value)) return 'Unknown promo code.';
    return '';
  },
};

// Own messages instead of the browser ones
function nativeMessage(field, label) {
  const v = field.validity;
  if (v.valueMissing) return `${label} is required.`;
  if (v.typeMismatch) return 'Enter a valid email address, e.g. name@example.com.';
  if (v.tooShort) return `${label} must have at least ${field.minLength} characters.`;
  if (v.tooLong) return `${label} must have at most ${field.maxLength} characters.`;
  if (v.rangeUnderflow) return `Minimum value is ${field.min}.`;
  if (v.rangeOverflow) return `You can buy at most ${field.max} tickets per order.`;
  if (v.stepMismatch || v.badInput) return 'Enter a whole number.';
  if (v.patternMismatch) return `${label} may contain only letters and digits.`;
  return 'Invalid value.';
}

// ===== Validation =====
function validateField(name, show = true) {
  const field = fields[name];
  const value = field.value.trim();
  field.setCustomValidity('');          // clear the old custom message first
  let message = '';
  if (!field.validity.valid) {
    message = nativeMessage(field, LABELS[name]);
  } else if (rules[name]) {
    message = rules[name](value);
  }
  if (message) field.setCustomValidity(message); // checkValidity() now agrees with us
  if (show) showFieldState(name, message);
  return message;
}

function showFieldState(name, message) {
  const field = fields[name];
  errorEls[name].textContent = message;
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  field.classList.toggle('is-invalid', message !== '');
  field.classList.toggle('is-valid', message === '' && field.value.trim() !== '');
}

function clearFieldState(name) {
  const field = fields[name];
  delete field.dataset.touched;
  field.removeAttribute('aria-invalid');
  field.classList.remove('is-invalid', 'is-valid');
  field.setCustomValidity('');
  errorEls[name].textContent = '';
}

// ===== Live preview =====
function addRow(list, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}

function getTotals() {
  const type = getType();
  const quantity = Number(fields.quantity.value);
  const promo = findPromo(fields.promo.value);
  if (!type || !(quantity > 0)) return null;
  const subtotal = type.price * quantity;
  const discount = promo ? promo.discount : 0;
  return { subtotal, discount, total: Math.round(subtotal * (100 - discount) / 100) };
}

function renderPreview() {
  const ev = getEvent();
  const type = getType();
  const totals = getTotals();
  const list = document.createElement('dl');
  addRow(list, 'Event', ev ? ev.name : '—');
  addRow(list, 'Date', fields.date.value || '—');
  addRow(list, 'Type', type ? type.label : '—');
  addRow(list, 'Quantity', fields.quantity.value || '—');
  addRow(list, 'Name', fields.fullName.value.trim() || '—');
  addRow(list, 'Email', fields.email.value.trim() || '—');
  addRow(list, 'Discount', totals && totals.discount > 0 ? `-${totals.discount}%` : '—');
  addRow(list, 'Total', totals ? formatMoney(totals.total) : '—');
  preview.replaceChildren(list);
}

// ===== Events =====
for (const name of FIELD_NAMES) {
  const field = fields[name];

  // blur: the field becomes "touched" and is checked for the first time
  field.addEventListener('blur', () => {
    field.dataset.touched = 'true';
    validateField(name);
  });

  // input: preview always updates; the check runs only after the first blur
  field.addEventListener('input', () => {
    if (name === 'event') updateDateHint();
    if (field.dataset.touched === 'true') validateField(name);
    for (const dep of DEPENDENTS[name] || []) {
      if (fields[dep].dataset.touched === 'true') validateField(dep);
    }
    renderPreview();
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const invalid = [];
  for (const name of FIELD_NAMES) {
    fields[name].dataset.touched = 'true';
    if (validateField(name)) invalid.push(name);
  }

  if (invalid.length > 0) {
    summary.textContent = `The form has ${invalid.length} error${invalid.length === 1 ? '' : 's'}. Please fix the marked fields.`;
    summary.hidden = false;
    fields[invalid[0]].focus();
    return;
  }

  summary.hidden = true;
  createTicket();
});

form.addEventListener('reset', () => {
  // wait until the browser has cleared the values
  setTimeout(() => {
    for (const name of FIELD_NAMES) clearFieldState(name);
    summary.hidden = true;
    updateDateHint();
    renderPreview();
  }, 0);
});

// ===== Final result =====
function createBookingCode() {
  let code = '';
  for (let i = 0; i < BOOKING_LENGTH; i += 1) {
    code += BOOKING_ALPHABET[randomInt(0, BOOKING_ALPHABET.length - 1)];
  }
  return `${BOOKING_PREFIX}-${code}`;
}

function createTicket() {
  const ev = getEvent();
  const type = getType();
  const quantity = Number(fields.quantity.value);
  const totals = getTotals();
  const data = {
    event: ev.name, date: fields.date.value, type: type.label, quantity,
    name: fields.fullName.value.trim(), email: fields.email.value.trim(),
    discount: totals.discount, total: totals.total,
  };

  type.seatsLeft -= quantity; // the seats are really taken

  const ticket = document.createElement('article');
  ticket.className = 'ticket final';
  ticket.tabIndex = -1;
  const title = document.createElement('h2');
  title.textContent = 'Booking confirmed';
  const list = document.createElement('dl');
  addRow(list, 'Event', data.event);
  addRow(list, 'Date', data.date);
  addRow(list, 'Tickets', `${data.quantity} × ${data.type}`);
  addRow(list, 'Name', data.name);
  addRow(list, 'Email', data.email);
  addRow(list, 'Paid', formatMoney(data.total) + (data.discount > 0 ? ` (-${data.discount}%)` : ''));
  const code = document.createElement('p');
  code.className = 'code';
  code.textContent = createBookingCode();
  ticket.append(title, list, code);
  result.replaceChildren(ticket);

  form.reset();           // the reset listener clears states and the preview
  buildTypeOptions();     // show the new seats left
  ticket.focus();
}

// ===== Start =====
buildEventOptions();
buildTypeOptions();
updateDateHint();
renderPreview();
