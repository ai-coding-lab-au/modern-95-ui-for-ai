import { workbenchIcon } from './workbench-icons.mjs';
import { groups, initialDetails, validateDetails, initialReadiness, progress, exportText } from './workbench-model.mjs';

const root = document.querySelector('.m95-study');
for (const svg of root.querySelectorAll('[data-workbench-icon]')) svg.outerHTML = workbenchIcon(svg.dataset.workbenchIcon);
const byId = id => document.getElementById(id);
let details = { ...initialDetails };
const ready = initialReadiness();
const announce = message => { byId('feedback').textContent = message; };
const rowStatuses = new Map();

function updateProgress() {
  const count = progress(ready);
  byId('progress-count').textContent = `${count.ready} of ${count.total} ready`;
  byId('reset-progress').disabled = count.ready === 0;
  for (const [id, { checkbox, status }] of rowStatuses) {
    const isReady = ready.has(id);
    checkbox.checked = isReady;
    status.textContent = isReady ? 'Ready' : 'Not ready';
    status.classList.toggle('ready', isReady);
  }
}
function updateDetails() {
  byId('project-title').textContent = details.project;
  const date = details.date ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${details.date}T00:00:00Z`)) : 'Date not set';
  byId('project-meta').textContent = `${details.owner || 'Prepared by not set'} · ${date}`;
  byId('project-note').textContent = details.notes;
  byId('project-note').hidden = !details.notes;
}
for (const group of groups) {
  const section = document.createElement('details');
  section.className = 'document-group'; section.open = true;
  const summary = document.createElement('summary');
  const name = document.createElement('span'); name.textContent = group.title;
  const count = document.createElement('small'); count.textContent = `${group.items.length} documents`;
  summary.append(name, count); section.append(summary);
  for (const item of group.items) {
    const label = document.createElement('label'); label.className = 'document-row';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = item.id;
    checkbox.setAttribute('aria-label', `${item.name} ready`);
    const title = document.createElement('span'); title.className = 'document-name'; title.textContent = item.name;
    const detail = document.createElement('small'); detail.textContent = item.detail; title.append(detail);
    const status = document.createElement('span'); status.className = 'document-status'; status.setAttribute('aria-hidden', 'true');
    label.append(checkbox, title, status); section.append(label);
    rowStatuses.set(item.id, { checkbox, status });
    checkbox.addEventListener('change', () => { if (checkbox.checked) ready.add(item.id); else ready.delete(item.id); updateProgress(); announce('Checklist progress updated.'); });
  }
  byId('document-groups').append(section);
}
updateProgress(); updateDetails();
const fields = { project: byId('project-name'), owner: byId('project-owner'), date: byId('handover-date'), notes: byId('handover-notes') };
byId('setup-form').addEventListener('submit', event => {
  event.preventDefault();
  for (const [name, field] of Object.entries(fields)) { byId(`${name}-error`).hidden = true; field.removeAttribute('aria-invalid'); }
  try {
    if (fields.date.validity.badInput) throw Object.assign(new Error('Choose a complete, valid handover date.'), { field: 'date' });
    const next = validateDetails(Object.fromEntries(new FormData(event.currentTarget)));
    details = next; updateDetails();
    announce('Details applied. Document selections kept.');
  } catch (error) {
    const name = error.field || 'project';
    byId(`${name}-error`).textContent = error.message; byId(`${name}-error`).hidden = false;
    fields[name].setAttribute('aria-invalid', 'true'); fields[name].focus();
  }
});
byId('export-checklist').addEventListener('click', () => {
  const blob = new Blob([exportText(details, ready)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'modern-95-ui-handover.txt'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Checklist download requested. Only applied details are included.');
});
const resetDialog = byId('reset-dialog');
byId('reset-progress').addEventListener('click', () => { resetDialog.returnValue = ''; resetDialog.showModal(); });
resetDialog.addEventListener('close', () => {
  if (resetDialog.returnValue === 'reset') { ready.clear(); updateProgress(); announce('Progress reset. Project details kept.'); byId('export-checklist').focus(); }
  else byId('reset-progress').focus();
});
byId('minimize-preview').addEventListener('click', event => {
  const minimized = !byId('window-content').hidden;
  byId('window-content').hidden = minimized;
  event.currentTarget.setAttribute('aria-expanded', String(!minimized));
  event.currentTarget.setAttribute('aria-label', minimized ? 'Restore preview' : 'Minimize preview');
  event.currentTarget.title = minimized ? 'Restore preview' : 'Minimize preview';
});
byId('expand-preview').addEventListener('click', event => {
  const expanded = root.classList.toggle('is-expanded');
  event.currentTarget.setAttribute('aria-pressed', String(expanded));
  event.currentTarget.setAttribute('aria-label', expanded ? 'Restore preview size' : 'Expand preview');
  event.currentTarget.title = expanded ? 'Restore preview size' : 'Expand preview';
  event.currentTarget.querySelector('svg').outerHTML = workbenchIcon(expanded ? 'restore' : 'expand');
});
byId('close-preview').addEventListener('click', () => { document.querySelector('.m95-window').hidden = true; byId('closed-preview').hidden = false; byId('reopen-preview').focus(); });
byId('reopen-preview').addEventListener('click', () => { document.querySelector('.m95-window').hidden = false; byId('closed-preview').hidden = true; byId('minimize-preview').focus(); });
