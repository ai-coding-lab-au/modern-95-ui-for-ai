import { openDialog, closeDialog } from './m95.mjs';

const byId = (id) => document.getElementById(id);
const status = byId('gallery-status');
const editor = byId('sample-editor');
const discard = byId('discard-dialog');
const titleInput = byId('card-title');
const descriptionInput = byId('card-description');
const card = { title: 'Release checklist', description: 'Check the final content, keyboard flow and saved records.' };
let dirty = false;
let presses = 0;

for (const id of ['edit-sample', 'edit-card']) {
  byId(id).addEventListener('click', (event) => {
    titleInput.value = card.title;
    descriptionInput.value = card.description;
    dirty = false;
    openDialog(editor, { initialFocus: titleInput, returnFocus: event.currentTarget });
  });
}
for (const input of [titleInput, descriptionInput]) {
  input.addEventListener('input', () => { dirty = true; });
}

function requestCancel() {
  if (dirty) openDialog(discard, { initialFocus: '#keep-editing', returnFocus: titleInput });
  else closeDialog(editor, 'cancelled');
}
editor.addEventListener('cancel', (event) => {
  event.preventDefault();
  requestCancel();
});
byId('cancel-editor').addEventListener('click', requestCancel);
byId('keep-editing').addEventListener('click', () => closeDialog(discard, 'keep'));
byId('discard-changes').addEventListener('click', () => {
  dirty = false;
  closeDialog(discard, 'discard');
  closeDialog(editor, 'discard');
  status.textContent = 'Draft discarded · saved sample unchanged';
});
byId('editor-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  card.title = titleInput.value;
  card.description = descriptionInput.value;
  byId('sample-title').textContent = card.title;
  byId('sample-description').textContent = card.description;
  dirty = false;
  closeDialog(editor, 'saved');
  status.textContent = 'Sample saved for this session';
});

byId('press-sample').addEventListener('click', () => {
  presses += 1;
  byId('press-count').textContent = `Activated ${presses} ${presses === 1 ? 'time' : 'times'}`;
});
byId('pin-sample').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const pinned = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(pinned));
  button.textContent = pinned ? 'Unpin sample' : 'Pin sample';
  byId('pin-status').textContent = pinned ? 'Pinned' : 'Not pinned';
});
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    document.querySelectorAll('[data-sample-status]').forEach((sample) => {
      sample.hidden = button.dataset.filter !== 'all' && sample.dataset.sampleStatus !== button.dataset.filter;
    });
  });
});

const reference = byId('reference');
byId('field-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const invalid = !reference.value.trim();
  reference.setAttribute('aria-invalid', String(invalid));
  byId('reference-error').textContent = invalid ? 'Enter a reference before continuing.' : '';
  byId('validation-status').textContent = invalid ? '' : 'Reference accepted for this session.';
  if (invalid) reference.focus();
});
reference.addEventListener('input', () => {
  byId('validation-status').textContent = '';
  if (reference.value.trim()) {
    reference.setAttribute('aria-invalid', 'false');
    byId('reference-error').textContent = '';
  }
});
