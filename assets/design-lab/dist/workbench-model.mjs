// Synthetic reference data and local-only checklist operations.
export const groups = Object.freeze([
  { title: 'Design assets', items: [
    { id: 'source', name: 'Editable design files', detail: 'Source files · Design team', ready: true },
    { id: 'brand', name: 'Brand and type guidelines', detail: 'PDF · Design team', ready: true },
    { id: 'media', name: 'Approved images and media', detail: 'Asset folder · Design team', ready: false },
  ] },
  { title: 'Build & access', items: [
    { id: 'build', name: 'Release package and setup notes', detail: 'Archive + README · Development', ready: true },
    { id: 'access', name: 'Account ownership checklist', detail: 'Checklist only · Project lead', ready: false },
    { id: 'review', name: 'Browser and accessibility review', detail: 'Review report · Development', ready: false },
  ] },
  { title: 'Sign-off & support', items: [
    { id: 'approval', name: 'Client approval record', detail: 'PDF · Project lead', ready: false },
    { id: 'support', name: 'Support contacts and next steps', detail: 'Document · Project lead', ready: false },
  ] },
].map(group => Object.freeze({ ...group, items: Object.freeze(group.items.map(Object.freeze)) })));
export const initialDetails = Object.freeze({ project: 'Studio website refresh', owner: 'Alex Morgan', date: '2026-10-23', notes: 'Final review with the client before access is transferred.' });
function invalid(field, message) { throw Object.assign(new Error(message), { field }); }
export function validateDetails(input) {
  const value = Object.fromEntries(['project', 'owner', 'date', 'notes'].map(key => [key, String(input[key] ?? '').trim()]));
  if (!value.project) invalid('project', 'Enter a project name before applying details.');
  for (const [field, limit] of [['project', 100], ['owner', 80], ['notes', 500]]) {
    if (value[field].length > limit) invalid(field, `Use shorter text (${limit} characters or fewer).`);
  }
  if (value.date && (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || Number.isNaN(Date.parse(value.date)) || new Date(value.date).toISOString().slice(0, 10) !== value.date)) invalid('date', 'Choose a valid handover date.');
  return value;
}
export function initialReadiness() { return new Set(groups.flatMap(group => group.items.filter(item => item.ready).map(item => item.id))); }
export function progress(ready) { const ids = groups.flatMap(group => group.items.map(item => item.id)); return { ready: ids.filter(id => ready.has(id)).length, total: ids.length }; }
export function exportText(details, ready) {
  const value = validateDetails(details), count = progress(ready);
  return ['PROJECT HANDOVER', value.project, `Prepared by: ${value.owner || 'Not set'}`, `Handover date: ${value.date || 'Not set'}`, `Ready: ${count.ready} / ${count.total}`, '', value.notes,
    ...groups.flatMap(group => ['', group.title, ...group.items.map(item => `${ready.has(item.id) ? '[x]' : '[ ]'} ${item.name} — ${item.detail}`)]), '', 'Modern 95 UI synthetic browser study. No account credentials are included.', ''].join('\n');
}
