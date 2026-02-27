// API base URL
var API = '/api';

// Load config from server and update UI labels
async function loadConfig() {
  try {
    CONFIG = await fetch(API + '/config').then(function(r) { return r.json(); });
  } catch(e) { console.error('Failed to load config', e); }

  // Update dynamic labels
  document.querySelectorAll('.human-name-label').forEach(function(el) { el.textContent = CONFIG.humanName; });
  document.querySelectorAll('.agent-name-label').forEach(function(el) { el.textContent = CONFIG.agentName; });

  // Populate assignee select in new-task form
  var sel = document.getElementById('f-assignee');
  sel.innerHTML = '<option value="agent">🤖 ' + CONFIG.agentName + '</option><option value="human">👤 ' + CONFIG.humanName + '</option>';
}
