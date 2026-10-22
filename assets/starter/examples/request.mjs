import { openDialog, closeDialog } from '../m95.mjs';

const STORAGE_KEY = 'm95-starter-requests-v1';
const WINDOW_LABELS = Object.freeze({ any: 'Any time, 09:00–17:00', morning: 'Morning, 09:00–12:00', afternoon: 'Afternoon, 13:00–17:00' });
const PRIORITY_LABELS = Object.freeze({ routine: 'Routine', priority: 'Priority' });
const STEPS = ['Request details', 'Scheduling and priority', 'Review and save'];
const FIELD_STEPS = { title: 1, location: 1, requester: 1, description: 1, priority: 2, date: 2, window: 2, access: 2 };
const $ = (id) => document.getElementById(id);
const form = $('request-form');
const editor = $('request-editor');
const discardDialog = $('discard-dialog');
const detailsDialog = $('request-details');
const newButton = $('new-request');
let records = [];
let currentStep = 1;
let draftId = '';
let draftSavedAt = '';
let initialValues = '';
let dirty = false;
let saving = false;
let storageProblem = null;
let unreadableRaw = null;

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function values() {
  const data = new FormData(form);
  return Object.fromEntries(Object.keys(FIELD_STEPS).map((name) => [name, String(data.get(name) ?? '')]));
}

function storedRecordIsValid(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  const within = (field, min, max) => typeof record[field] === 'string' && record[field].trim().length >= min && record[field].length <= max;
  return within('id', 1, 100) && within('title', 1, 100) && within('location', 1, 80)
    && within('requester', 1, 80) && within('description', 10, 2000) && within('access', 0, 1000)
    && Object.hasOwn(PRIORITY_LABELS, record.priority) && Object.hasOwn(WINDOW_LABELS, record.window)
    && typeof record.date === 'string' && validDate(record.date)
    && typeof record.savedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(record.savedAt) && Number.isFinite(Date.parse(record.savedAt));
}

function readStorage() {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { return { error: 'blocked', message: 'Browser storage is unavailable. Allow storage for this local address, then choose Retry storage. Your open draft remains available in this tab.' }; }
  if (raw === null) return { records: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records) || !parsed.records.every(storedRecordIsValid)
      || new Set(parsed.records.map((record) => record.id)).size !== parsed.records.length) throw new Error('Unsupported data');
    return { records: parsed.records };
  } catch {
    return { error: 'corrupt', raw, message: 'Stored requests could not be read. Download the unreadable data for recovery, restore a valid version of this app’s storage, then retry. The stored value has not been replaced.' };
  }
}

function setStorageProblem(problem) {
  storageProblem = problem;
  unreadableRaw = problem?.raw ?? null;
  $('storage-warning').hidden = !problem;
  $('storage-message').textContent = problem?.message ?? '';
  $('download-storage').hidden = unreadableRaw === null;
  $('form-storage-actions').hidden = !problem;
  $('form-download-storage').hidden = unreadableRaw === null;
  $('storage-status').textContent = problem ? 'Local storage needs attention' : 'Local demo · Saved in this browser';
}

function loadRecords({ announce = false } = {}) {
  const result = readStorage();
  if (result.error) setStorageProblem(result);
  else {
    records = result.records;
    setStorageProblem(null);
    if (announce) $('request-notice').textContent = 'Local records loaded. Your open draft has not changed.';
  }
  renderRecords();
  return !result.error;
}

function renderRecords() {
  const body = $('request-rows');
  body.replaceChildren();
  const sorted = [...records].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  for (const record of sorted) {
    const row = document.createElement('tr');
    const title = document.createElement('th');
    title.scope = 'row';
    title.className = 'm95-row-id';
    title.textContent = record.title;
    row.append(title);
    for (const value of [record.location, formatDate(record.date)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    const priority = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'm95-badge';
    badge.dataset.tone = record.priority === 'priority' ? 'warning' : 'neutral';
    badge.textContent = PRIORITY_LABELS[record.priority];
    priority.append(badge);
    row.append(priority);
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'm95-button m95-button--quiet';
    button.textContent = 'View';
    button.setAttribute('aria-label', `View request: ${record.title}`);
    button.addEventListener('click', () => showDetails(record, button));
    action.append(button);
    row.append(action);
    body.append(row);
  }
  $('saved-list').hidden = records.length === 0;
  $('empty-requests').hidden = records.length !== 0;
  $('empty-requests').textContent = storageProblem
    ? 'Saved requests are unavailable until storage is readable. You can prepare a new draft.'
    : 'No saved requests. Choose New request to begin.';
  $('request-count').textContent = `${records.length} saved ${records.length === 1 ? 'request' : 'requests'}${storageProblem ? ' · last successfully loaded in this tab' : ''}`;
}

function summary(container, data) {
  const pairs = [
    ['Request', data.title], ['Location', data.location], ['Requested by', data.requester],
    ['Description', data.description], ['Priority', PRIORITY_LABELS[data.priority]],
    ['Preferred date', formatDate(data.date)], ['Time window', WINDOW_LABELS[data.window]],
    ['Access instructions', data.access || 'None provided'],
  ];
  container.replaceChildren();
  for (const [label, value] of pairs) {
    const term = document.createElement('dt');
    term.className = 'm95-muted';
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    container.append(term, description);
  }
}

function showDetails(record, opener) {
  $('detail-title').textContent = record.title;
  $('detail-saved').textContent = `Saved ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.savedAt))} · Read-only record`;
  summary($('detail-summary'), record);
  openDialog(detailsDialog, { initialFocus: '#detail-title', returnFocus: opener });
}

function clearErrors() {
  for (const name of Object.keys(FIELD_STEPS)) setFieldError(name, '');
  $('form-error').textContent = '';
}

function setFieldError(name, message) {
  $(`${name}-error`).textContent = message;
  for (const input of form.querySelectorAll(`[name="${name}"]`)) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function errorsFor(data, step) {
  const errors = {};
  if (step === 1) {
    for (const [name, label, max] of [['title', 'a request title', 100], ['location', 'the location', 80], ['requester', 'the requester’s name', 80]]) {
      if (!data[name].trim()) errors[name] = `Enter ${label}.`;
      else if (data[name].length > max) errors[name] = `Use ${max} characters or fewer.`;
    }
    if (data.description.trim().length < 10) errors.description = 'Describe the issue in at least 10 characters.';
    else if (data.description.length > 2000) errors.description = 'Use 2,000 characters or fewer.';
  }
  if (step === 2) {
    if (!Object.hasOwn(PRIORITY_LABELS, data.priority)) errors.priority = 'Choose Routine or Priority.';
    if (!validDate(data.date)) errors.date = 'Choose a valid preferred date.';
    else if (data.date < today()) errors.date = 'Choose today or a later date.';
    if (!Object.hasOwn(WINDOW_LABELS, data.window)) errors.window = 'Choose a time window.';
    if (data.access.length > 1000) errors.access = 'Use 1,000 characters or fewer.';
  }
  return errors;
}

function validateStep(step) {
  const errors = errorsFor(values(), step);
  for (const [name, fieldStep] of Object.entries(FIELD_STEPS)) if (fieldStep === step) setFieldError(name, errors[name] ?? '');
  const names = Object.keys(errors);
  if (!names.length) return true;
  showStep(step, false);
  $('form-error').textContent = `Check ${names.length === 1 ? 'the highlighted field' : `the ${names.length} highlighted fields`} to continue.`;
  form.querySelector(`[name="${names[0]}"]`).focus();
  return false;
}

function showStep(step, focus = true) {
  currentStep = step;
  $('form-error').textContent = '';
  for (let index = 1; index <= 3; index++) {
    $(`step-${index}`).hidden = index !== step;
    const label = $(`step-label-${index}`);
    label.textContent = STEPS[index - 1] + (index === step ? ' — current' : '');
    label.className = index === step ? 'm95-badge' : 'm95-muted';
    if (index === step) label.parentElement.setAttribute('aria-current', 'step');
    else label.parentElement.removeAttribute('aria-current');
  }
  $('step-progress').textContent = `Step ${step} of 3`;
  $('back-step').hidden = step === 1;
  $('advance-step').textContent = step === 1 ? 'Next: scheduling' : step === 2 ? 'Next: review' : 'Save request';
  if (step === 3) summary($('review-summary'), values());
  if (focus) $(`step-heading-${step}`).focus();
}

function startRequest() {
  form.reset();
  draftId = globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  draftSavedAt = '';
  initialValues = JSON.stringify(values());
  dirty = false;
  clearErrors();
  $('request-date').min = today();
  showStep(1, false);
  if (storageProblem) $('form-error').textContent = storageProblem.message;
  openDialog(editor, { initialFocus: '#request-title', returnFocus: newButton });
}

function cancelRequest() {
  if (saving) return;
  if (dirty) openDialog(discardDialog, { initialFocus: '#keep-draft', returnFocus: document.activeElement });
  else closeDialog(editor, 'cancelled');
}

function finishSave(record, nextRecords) {
  records = nextRecords;
  setStorageProblem(null);
  dirty = false;
  renderRecords();
  closeDialog(editor, 'saved');
  $('request-notice').textContent = `Saved “${record.title}”. Choose View to reopen its details.`;
}

function saveRequest() {
  if (saving || !validateStep(1) || !validateStep(2)) return;
  saving = true;
  $('advance-step').disabled = true;
  try {
    const loaded = readStorage();
    if (loaded.error) {
      setStorageProblem(loaded);
      $('form-error').textContent = `Request not saved. ${loaded.message}`;
      return;
    }
    const data = values();
    draftSavedAt ||= new Date().toISOString();
    const candidate = { id: draftId, savedAt: draftSavedAt, ...data };
    const existing = loaded.records.find((record) => record.id === draftId);
    if (existing) {
      const same = Object.keys(candidate).every((key) => candidate[key] === existing[key]);
      if (same) finishSave(existing, loaded.records);
      else $('form-error').textContent = 'An earlier version of this draft is already stored. Cancel this draft to review the saved request; its stored details have not been overwritten.';
      return;
    }
    const nextRecords = [...loaded.records, candidate];
    const payload = JSON.stringify({ version: 1, records: nextRecords });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      if (localStorage.getItem(STORAGE_KEY) !== payload) throw new Error('Save not verified');
    } catch {
      const message = 'The save could not be verified. Keep this draft open, check browser storage permissions or available space, then choose Save request to retry.';
      setStorageProblem({ error: 'write', message });
      $('form-error').textContent = message;
      return;
    }
    finishSave(candidate, nextRecords);
  } finally {
    saving = false;
    $('advance-step').disabled = false;
  }
}

newButton.addEventListener('click', startRequest);
$('cancel-request').addEventListener('click', cancelRequest);
editor.addEventListener('cancel', (event) => { event.preventDefault(); cancelRequest(); });
$('keep-draft').addEventListener('click', () => closeDialog(discardDialog, 'keep'));
$('discard-draft').addEventListener('click', () => {
  dirty = false;
  closeDialog(discardDialog, 'discard');
  closeDialog(editor, 'discarded');
  loadRecords();
  $('request-notice').textContent = 'Draft discarded.';
});
$('close-details').addEventListener('click', () => closeDialog(detailsDialog));
detailsDialog.addEventListener('close', () => {
  if (!detailsDialog.open && !document.activeElement?.closest('button, a, input, select, textarea')) newButton.focus();
});
$('back-step').addEventListener('click', () => showStep(currentStep - 1));
form.addEventListener('input', (event) => {
  dirty = JSON.stringify(values()) !== initialValues;
  const name = event.target.name;
  if (Object.hasOwn(FIELD_STEPS, name)) {
    const existingError = $(`${name}-error`).textContent;
    if (existingError) setFieldError(name, errorsFor(values(), FIELD_STEPS[name])[name] ?? '');
  }
});
form.addEventListener('change', () => { dirty = JSON.stringify(values()) !== initialValues; });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (saving) return;
  if (currentStep < 3) {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  } else saveRequest();
});
$('retry-storage').addEventListener('click', () => loadRecords({ announce: true }));
$('form-retry-storage').addEventListener('click', () => {
  if (loadRecords()) {
    $('form-error').textContent = '';
    $('advance-step').focus();
  } else $('form-error').textContent = storageProblem.message;
});
function downloadUnreadableStorage() {
  if (unreadableRaw === null) return;
  const url = URL.createObjectURL(new Blob([unreadableRaw], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'm95-requests-unreadable-backup.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('download-storage').addEventListener('click', downloadUnreadableStorage);
$('form-download-storage').addEventListener('click', downloadUnreadableStorage);
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) loadRecords();
});
window.addEventListener('beforeunload', (event) => {
  if (editor.open && dirty) { event.preventDefault(); event.returnValue = ''; }
});
loadRecords();
