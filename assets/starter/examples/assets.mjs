import { openDialog, closeDialog } from '../m95.mjs';

const STORAGE_KEY = 'm95-starter-assets-v1';
const CATEGORIES = ['Laptop', 'Desktop', 'Monitor', 'Peripheral', 'Networking'];
const STATUSES = ['Available', 'In use', 'Under repair', 'Retired'];
const FIELD_NAMES = ['tag', 'name', 'category', 'status', 'assignedTo', 'location', 'serialNumber', 'notes'];
const LIMITS = { tag: 16, name: 160, assignedTo: 80, location: 80, serialNumber: 100, notes: 2000 };
const SEED = [
  { id: 'sample-101', tag: 'EQ-101', name: 'Northstar 14-inch mobile workstation with extended battery and travel charger', category: 'Laptop', status: 'In use', assignedTo: 'Alex Morgan', location: 'Studio · Desk 04', serialNumber: 'DEMO-NS14-001', notes: 'Synthetic record. Includes USB-C charger and protective sleeve.' },
  { id: 'sample-102', tag: 'EQ-102', name: 'Harbor 27-inch height-adjustable monitor for shared design and review sessions', category: 'Monitor', status: 'Available', assignedTo: '', location: 'Equipment cupboard', serialNumber: 'DEMO-H27-002', notes: 'Synthetic record. HDMI and DisplayPort cables stored with the monitor.' },
  { id: 'sample-103', tag: 'EQ-103', name: 'Cedar compact desktop workstation', category: 'Desktop', status: 'In use', assignedTo: 'Priya Shah', location: 'Studio · Desk 08', serialNumber: 'DEMO-CD-003', notes: 'Synthetic record. Shared project files are stored separately.' },
  { id: 'sample-104', tag: 'EQ-104', name: 'Fieldwork portable video-conferencing speaker and microphone kit', category: 'Peripheral', status: 'Under repair', assignedTo: '', location: 'Service shelf', serialNumber: 'DEMO-FW-004', notes: 'Synthetic record. USB connection needs inspection before reassignment.' },
  { id: 'sample-105', tag: 'EQ-105', name: 'Ridge eight-port desktop network switch', category: 'Networking', status: 'Available', assignedTo: '', location: 'Equipment cupboard', serialNumber: 'DEMO-R8-005', notes: 'Synthetic record. Power adapter included.' },
  { id: 'sample-106', tag: 'EQ-106', name: 'Archive 13-inch notebook for legacy presentation compatibility testing', category: 'Laptop', status: 'Retired', assignedTo: '', location: 'Archive shelf', serialNumber: 'DEMO-A13-006', notes: 'Synthetic record. Kept for parts; not available for assignment.' },
];

const $ = id => document.getElementById(id);
const form = $('device-form');
const details = $('detail-dialog');
const editor = $('editor-dialog');
const discard = $('discard-dialog');
const fields = Object.fromEntries(FIELD_NAMES.map(name => [name, form.elements.namedItem(name)]));
let items = [];
let loadedRaw = null;
let storageBlocked = false;
let selectedId = null;
let editingId = null;
let initialDraft = '';
let dirty = false;
let saving = false;

function validationErrors(value, existing, ownId) {
  const errors = {};
  for (const [name, limit] of Object.entries(LIMITS)) {
    if (typeof value[name] !== 'string') errors[name] = 'Enter a text value.';
    else if (value[name].length > limit) errors[name] = `Use ${limit} characters or fewer.`;
  }
  if (!/^[a-z0-9-]{1,16}$/i.test(value.tag ?? '')) errors.tag = 'Use 1–16 letters, numbers or hyphens.';
  else if (existing.some(item => item.id !== ownId && item.tag.toLowerCase() === value.tag.toLowerCase())) errors.tag = 'This asset ID is already in use. Choose a unique ID.';
  if (typeof value.name === 'string' && !value.name.trim()) errors.name = 'Enter an equipment name.';
  if (typeof value.location === 'string' && !value.location.trim()) errors.location = 'Enter a location.';
  if (!CATEGORIES.includes(value.category)) errors.category = 'Choose a category.';
  if (!STATUSES.includes(value.status)) errors.status = 'Choose a status.';
  if (value.status === 'In use' && !value.assignedTo?.trim()) errors.assignedTo = 'Enter the person using this device.';
  return errors;
}

function decodeSaved(raw) {
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.items)) throw new Error('Unsupported register format');
  const ids = new Set();
  const tags = new Set();
  for (const item of data.items) {
    if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id)) throw new Error('Invalid device identity');
    if (FIELD_NAMES.some(name => typeof item[name] !== 'string')) throw new Error('Invalid device fields');
    if (Object.keys(validationErrors(item, [], item.id)).length || tags.has(item.tag.toLowerCase())) throw new Error('Invalid device values');
    ids.add(item.id);
    tags.add(item.tag.toLowerCase());
  }
  return data.items.map(item => ({ id: item.id, ...Object.fromEntries(FIELD_NAMES.map(name => [name, item[name]])) }));
}

function showStorageIssue(message, block = false) {
  storageBlocked ||= block;
  $('storage-notice').hidden = false;
  $('storage-message').textContent = message;
  $('add-device').disabled = storageBlocked;
  $('edit-device').disabled = storageBlocked;
  updateSaveState();
}

function loadRegister() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    items = [];
    showStorageIssue('Browser storage is unavailable. The saved register could not be read. Allow site storage, then reload the register.', true);
    $('register-source').textContent = 'Storage unavailable · Editing disabled';
    render();
    return;
  }
  try {
    items = raw === null ? structuredClone(SEED) : decodeSaved(raw);
  } catch {
    items = [];
    showStorageIssue('The saved register is unreadable or uses an unsupported format. Its stored value has been left untouched. Restore a valid copy before reloading.', true);
    $('register-source').textContent = 'Saved data could not be loaded · Editing disabled';
    render();
    return;
  }
  loadedRaw = raw;
  storageBlocked = false;
  $('storage-notice').hidden = true;
  $('storage-message').textContent = '';
  $('add-device').disabled = false;
  $('edit-device').disabled = false;
  $('register-source').textContent = raw === null
    ? 'Synthetic starting records · Saved in this browser after your first save.'
    : 'Saved register loaded from this browser.';
  render();
}

function render() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const status = $('status-filter').value;
  const visible = items.filter(item => (!status || item.status === status)
    && (!query || FIELD_NAMES.some(name => item[name].toLocaleLowerCase().includes(query))));
  $('equipment-rows').replaceChildren();
  for (const item of visible) {
    const row = document.createElement('tr');
    const id = document.createElement('th');
    id.scope = 'row';
    id.className = 'm95-row-id';
    id.textContent = item.tag;
    row.append(id);
    for (const value of [item.name, item.category, item.assignedTo || 'Unassigned']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'm95-badge';
    badge.dataset.tone = item.status === 'Available' ? 'positive' : item.status === 'Under repair' ? 'warning' : 'neutral';
    badge.textContent = item.status;
    statusCell.append(badge);
    row.append(statusCell);
    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'm95-button m95-button--quiet';
    button.textContent = 'View details';
    button.setAttribute('aria-label', `View details for ${item.tag}`);
    button.dataset.assetId = item.id;
    button.addEventListener('click', () => showDetails(item.id, button));
    actionCell.append(button);
    row.append(actionCell);
    $('equipment-rows').append(row);
  }
  $('result-count').textContent = `${visible.length} of ${items.length} ${items.length === 1 ? 'device' : 'devices'}`;
  $('empty-results').hidden = visible.length > 0;
  $('equipment-scroll').hidden = visible.length === 0;
  $('empty-results').textContent = storageBlocked && items.length === 0
    ? 'The equipment register could not be loaded. See the storage message above.'
    : items.length === 0 ? 'No equipment yet. Add a device to start the register.'
      : 'No matching equipment. Change the search or clear the filters.';
  $('clear-filters').disabled = !$('search').value && !status;
}

function renderDetails() {
  const item = items.find(value => value.id === selectedId);
  if (!item) return;
  $('detail-title').textContent = `Device details · ${item.tag}`;
  const entries = [
    ['Asset ID', item.tag], ['Equipment', item.name], ['Category', item.category], ['Status', item.status],
    ['Assigned to', item.assignedTo || 'Unassigned'], ['Location', item.location],
    ['Serial number', item.serialNumber || 'Not recorded'], ['Notes', item.notes || 'No notes'],
  ];
  $('detail-values').replaceChildren();
  for (const [label, value] of entries) {
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = value;
    $('detail-values').append(term, definition);
  }
}

function showDetails(id, opener) {
  selectedId = id;
  renderDetails();
  openDialog(details, { initialFocus: $('detail-title'), returnFocus: opener });
}

function draftValue(trim = false) {
  return Object.fromEntries(FIELD_NAMES.map(name => [name, trim ? fields[name].value.trim() : fields[name].value]));
}

function updateSaveState() {
  $('save-device').disabled = saving || storageBlocked || (editingId !== null && !dirty);
}

function clearErrors() {
  for (const name of FIELD_NAMES) {
    fields[name].removeAttribute('aria-invalid');
    $(`${name}-error`).textContent = '';
  }
  $('save-error').textContent = '';
}

function openEditor(id, opener) {
  if (storageBlocked) return;
  editingId = id;
  const item = id === null ? { tag: '', name: '', category: 'Laptop', status: 'Available', assignedTo: '', location: '', serialNumber: '', notes: '' }
    : items.find(value => value.id === id);
  if (!item) return;
  for (const name of FIELD_NAMES) fields[name].value = item[name];
  clearErrors();
  initialDraft = JSON.stringify(draftValue());
  dirty = false;
  $('editor-title').textContent = id === null ? 'Add device' : `Edit device · ${item.tag}`;
  updateSaveState();
  openDialog(editor, { initialFocus: fields[id === null ? 'tag' : 'name'], returnFocus: opener });
}

function requestEditorClose() {
  if (saving) return;
  if (!dirty) {
    closeDialog(editor, 'cancelled');
    return;
  }
  openDialog(discard, { initialFocus: $('keep-editing'), returnFocus: document.activeElement });
}

function saveDevice(event) {
  event.preventDefault();
  if (saving || storageBlocked || (editingId !== null && !dirty)) return;
  clearErrors();
  const value = draftValue(true);
  const errors = validationErrors(value, items, editingId);
  for (const [name, message] of Object.entries(errors)) {
    fields[name].setAttribute('aria-invalid', 'true');
    $(`${name}-error`).textContent = message;
  }
  const firstError = FIELD_NAMES.find(name => errors[name]);
  if (firstError) {
    fields[firstError].focus();
    return;
  }
  saving = true;
  updateSaveState();
  try {
    const currentRaw = window.localStorage.getItem(STORAGE_KEY);
    if (currentRaw !== loadedRaw) {
      showStorageIssue('The saved register changed since it was loaded. Cancel any draft and reload the register before editing again. The newer stored value has been left untouched.', true);
      $('save-error').textContent = 'Not saved: the stored register has changed. Copy any draft text you need, then cancel and reload the register.';
      return;
    }
    const record = { id: editingId ?? crypto.randomUUID(), ...value };
    const nextItems = editingId === null ? [...items, record] : items.map(item => item.id === editingId ? record : item);
    const nextRaw = JSON.stringify({ version: 1, items: nextItems });
    window.localStorage.setItem(STORAGE_KEY, nextRaw);
    items = nextItems;
    loadedRaw = nextRaw;
    dirty = false;
    $('storage-notice').hidden = true;
    $('storage-message').textContent = '';
    $('register-source').textContent = 'Saved in this browser · Available after reload and normal browser reopen.';
    $('action-status').textContent = `Saved ${record.tag} · ${record.name}`;
    render();
    if (details.open) renderDetails();
    closeDialog(editor, 'saved');
  } catch {
    $('save-error').textContent = 'Not saved: browser storage is unavailable or full. Your draft is still open. Allow site storage or free space, then try Save device again.';
    showStorageIssue('The last save failed. Existing saved records were not replaced. Browser storage may be unavailable or full.');
    $('action-status').textContent = 'Save failed · Draft retained';
  } finally {
    saving = false;
    updateSaveState();
  }
}

$('search').addEventListener('input', render);
$('status-filter').addEventListener('change', render);
$('clear-filters').addEventListener('click', () => {
  $('search').value = '';
  $('status-filter').value = '';
  render();
  $('search').focus();
});
$('reload-register').addEventListener('click', () => {
  loadRegister();
  $('action-status').textContent = storageBlocked ? 'Register could not be loaded' : 'Register reloaded';
  if (!storageBlocked) $('search').focus();
});
$('add-device').addEventListener('click', event => openEditor(null, event.currentTarget));
$('edit-device').addEventListener('click', event => openEditor(selectedId, event.currentTarget));
$('close-detail').addEventListener('click', () => closeDialog(details, 'closed'));
details.addEventListener('close', () => {
  if (details.open || editor.open || discard.open) return;
  // Rendering after save replaces table buttons; provide a connected return target.
  const opener = [...$('equipment-rows').querySelectorAll('button')].find(button => button.dataset.assetId === selectedId);
  (opener ?? $('search')).focus({ preventScroll: true });
});
form.addEventListener('input', event => {
  dirty = JSON.stringify(draftValue()) !== initialDraft;
  const name = event.target.name;
  if (FIELD_NAMES.includes(name)) {
    fields[name].removeAttribute('aria-invalid');
    $(`${name}-error`).textContent = '';
  }
  updateSaveState();
});
form.addEventListener('change', () => {
  dirty = JSON.stringify(draftValue()) !== initialDraft;
  updateSaveState();
});
form.addEventListener('submit', saveDevice);
$('cancel-editor').addEventListener('click', requestEditorClose);
editor.addEventListener('cancel', event => {
  event.preventDefault();
  requestEditorClose();
});
$('keep-editing').addEventListener('click', () => closeDialog(discard, 'keep'));
$('discard-changes').addEventListener('click', () => {
  dirty = false;
  closeDialog(discard, 'discard');
  closeDialog(editor, 'discarded');
  $('action-status').textContent = 'Changes discarded · Saved records unchanged';
});
window.addEventListener('beforeunload', event => {
  if (editor.open && dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('storage', event => {
  if ((event.key === STORAGE_KEY || event.key === null) && event.newValue !== loadedRaw) {
    showStorageIssue('The saved register changed in another tab. Cancel any draft and reload the register to use the latest saved data.', true);
    if (editor.open) $('save-error').textContent = 'Not saved: the register changed in another tab. Copy any draft text you need, then cancel and reload the register.';
  }
});

loadRegister();
