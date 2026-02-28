// Utility functions

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDate(d) {
  if (!d) return '';
  var dt = new Date(d.includes('Z') || d.includes('+') || d.includes('-',10) ? d : d + 'Z');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function catBadge(cat) {
  var map = {
    research: 'badge-research',
    code: 'badge-dev',
    pr: 'badge-dev',
    feature: 'badge-dev',
    config: 'badge-ops',
    ops: 'badge-ops',
    report: 'badge-other',
    content: 'badge-content',
    draft: 'badge-content',
    strategy: 'badge-content',
    routine: 'badge-routine',
    other: 'badge-other'
  };

  var labels = {
    research: '🔍 Research',
    code: '💻 Code',
    pr: '🔀 Pull Request',
    feature: '✨ Feature',
    config: '⚙️ Config',
    ops: '🔧 Ops',
    report: '📊 Report',
    content: '⚠️ 📝 Content',
    draft: '⚠️ ✏️ Draft',
    strategy: '⚠️ 🗺️ Strategy',
    routine: '🔄 Routine',
    other: '📌 Other'
  };

  var cls = map[cat] || 'badge-other';
  var label = labels[cat] || cat;
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

function ticketTypeBadge(task) {
  var isAuto = task.ticket_type === 'auto';
  var icon = isAuto ? '⚡' : '🔧';
  var label = isAuto ? 'AUTO' : 'MANUAL';
  var toggle = isAuto ? 'manual' : 'auto';
  var badgeClass = isAuto ? 'badge-type-auto' : 'badge-type-manual';
  return '<span class="badge ' + badgeClass + ' badge-clickable" onclick="updateTask(' + task.id + ',{ticket_type:\'' + toggle + '\'})" title="Click to toggle AUTO/MANUAL">' + icon + ' ' + label + '</span>';
}

function copyId(text, el) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  el.style.color = '#3fb950';
  el.textContent = '✓ copied';
  setTimeout(function() { el.style.color = ''; el.textContent = text; }, 1000);
}

function cyclePriority(id, current) {
  var cycle = ['low','normal','high','critical'];
  var next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
  updateTask(id, {priority: next});
}

function promptDueDate(id) {
  var val = prompt('Due date (YYYY-MM-DD) or empty to remove:');
  if (val === null) return;
  updateTask(id, { due_date: val || null });
}

function logIcon(type) {
  var map = { task_created: '📋', task_updated: '✏️', cron_checkin: '🤖', comment_added: '💬' };
  return map[type] || '📌';
}

function isUserTypingComment() {
  var active = document.activeElement;
  return active && active.id && active.id.startsWith('comment-');
}

function markDone(id, missingDrive) {
  if (missingDrive) {
    if (!confirm('⚠️ No Drive link.\n\nGolden Rule #7: dual delivery (workspace + Drive).\n\nMark as done anyway?')) return;
  }
  updateTask(id, {status:'done'});
}

function updateClock() {
  var now = new Date();
  document.getElementById('clock').textContent = now.toLocaleString('en-US', { weekday:'short', hour:'2-digit', minute:'2-digit' });
}
