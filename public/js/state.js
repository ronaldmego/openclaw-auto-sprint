// Global state and configuration
var CONFIG = { humanName: 'Human', agentName: 'Agent', defaultAssignee: 'agent', defaultAuthor: 'Human' };
var currentFilter = 'all';
var toolsLoaded = false;
var docsLoaded = false;
var brainLoaded = false;
var runsLoaded = false;

// Track which comment sections are open
window._openComments = new Set();

// Collapsible sections with localStorage persistence
var COLLAPSE_KEY = 'occ-collapsed-sections';

function getCollapsedSections() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; } catch(e) { return {}; }
}

function saveCollapsedSections(state) {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
}

function toggleSection(name) {
  var state = getCollapsedSections();
  state[name] = !state[name];
  saveCollapsedSections(state);
  applyCollapsedState();
}

function applyCollapsedState() {
  var state = getCollapsedSections();
  var defaults = { todo: false, doing: false, review: true, routine: true, closed: true };
  ['todo','doing','review','routine'].forEach(function(name) {
    var collapsed = state[name] !== undefined ? state[name] : (defaults[name] || false);
    var section = document.getElementById('section-' + name);
    var icon = document.getElementById('icon-' + name);
    if (section) {
      if (collapsed) { section.classList.add('collapsed'); }
      else { section.classList.remove('collapsed'); }
    }
    if (icon) {
      if (collapsed) { icon.classList.add('collapsed'); }
      else { icon.classList.remove('collapsed'); }
    }
  });
}
