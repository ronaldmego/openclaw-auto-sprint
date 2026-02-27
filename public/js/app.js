// Application logic: tab handlers, CRUD, loaders, initialization

// Tabs
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'tools') { loadTools(); }
    if (tab.dataset.tab === 'brain') { loadBrain(); }
    if (tab.dataset.tab === 'docs') { loadASC(); }
    if (tab.dataset.tab === 'ideas') { loadIdeas(); }
    if (tab.dataset.tab === 'runs') { loadRuns(); }
  });
});

// --- Tab loaders ---

async function loadTools() {
  if (toolsLoaded) return;
  try {
    var res = await fetch(API + '/tools');
    var data = await res.json();
    var el = document.getElementById('tools-content');
    el.innerHTML = renderToolsMd(data.content);
    toolsLoaded = true;
  } catch(e) { console.error('Failed to load tools', e); }
}

async function loadASC() {
  if (docsLoaded) return;
  try {
    var res = await fetch(API + '/docs');
    var docs = await res.json();
    renderDynamicDocs(docs);
    docsLoaded = true;
  } catch(e) {
    console.error('Failed to load docs', e);
    document.getElementById('dynamic-docs-container').innerHTML = '<p style="color:#f85149;">Failed to load documentation</p>';
  }
}

function renderDynamicDocs(docs) {
  var container = document.getElementById('dynamic-docs-container');
  var html = '';

  docs.forEach(function(doc, index) {
    var isFirstDoc = index === 0;
    var collapsedClass = isFirstDoc ? '' : 'collapsed';

    var icon = '📄';
    if (doc.slug === 'autonomous-sprint-cycle') icon = '📚';
    else if (doc.slug === 'golden-rules') icon = '⭐';
    else if (doc.slug === 'board-autonomy-architecture') icon = '🏗️';
    else if (doc.slug === 'ticket-anatomy') icon = '🎫';
    else if (doc.slug === 'golden-rules-changelog') icon = '📋';

    html += '<div class="doc-section ' + collapsedClass + '" style="background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:16px;">' +
        '<div class="doc-header" style="background:#1a1f27;border-bottom:1px solid #30363d;padding:12px 16px;border-radius:8px 8px 0 0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleDocSection(this)">' +
          '<h3 style="color:#f78166;font-size:16px;margin:0;">' + icon + ' ' + doc.title + '</h3>' +
          '<span class="collapse-indicator" style="color:#8b949e;font-size:14px;transition:transform 0.2s;">' + (isFirstDoc ? '▼' : '▶') + '</span>' +
        '</div>' +
        '<div class="doc-content" style="padding:16px;font-size:13px;line-height:1.7;color:#c9d1d9;">' +
          (typeof marked !== 'undefined' ? marked.parse(doc.content) : '<pre>' + doc.content + '</pre>') +
        '</div>' +
      '</div>';
  });

  container.innerHTML = html;
}

function toggleDocSection(headerElement) {
  var section = headerElement.parentElement;
  var indicator = headerElement.querySelector('.collapse-indicator');

  section.classList.toggle('collapsed');

  if (section.classList.contains('collapsed')) {
    indicator.textContent = '▶';
  } else {
    indicator.textContent = '▼';
  }
}

function renderToolsMd(md) {
  var start = md.indexOf('## 🧰 APIs & Skills');
  if (start > -1) md = md.substring(start);

  var html = '';
  var lines = md.split('\n');
  var inTable = false;
  var tableHtml = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (line.startsWith('### ')) {
      if (inTable) { html += tableHtml + '</table></div>'; inTable = false; tableHtml = ''; }
      html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px;">';
      html += '<h3 style="color:#f78166;font-size:15px;margin-bottom:10px;">' + line.replace('### ','') + '</h3>';
      continue;
    }
    if (line.startsWith('## ') && i > 0) {
      if (inTable) { html += tableHtml + '</table></div>'; inTable = false; tableHtml = ''; }
      html += '<h2 style="color:#d29922;font-size:16px;margin:20px 0 12px;">' + line.replace('## ','') + '</h2>';
      continue;
    }

    if (line.startsWith('|') && line.includes('|')) {
      var cells = line.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return c.trim(); });
      if (line.includes('---')) continue;
      if (!inTable) {
        inTable = true;
        tableHtml = '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
        tableHtml += '<tr>' + cells.map(function(c) { return '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #30363d;color:#8b949e;">' + c + '</th>'; }).join('') + '</tr>';
      } else {
        var rendered = cells.map(function(c) { return c.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0f6fc;">$1</strong>').replace(/⚠️/g,'⚠️'); });
        tableHtml += '<tr>' + rendered.map(function(c) { return '<td style="padding:6px 8px;border-bottom:1px solid #21262d;color:#c9d1d9;">' + c + '</td>'; }).join('') + '</tr>';
      }
      continue;
    }

    if (inTable && !line.startsWith('|')) {
      html += tableHtml + '</table></div>';
      inTable = false;
      tableHtml = '';
    }

    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      html += '<p style="color:#8b949e;font-size:11px;margin-top:12px;">' + line.replace(/\*/g,'') + '</p>';
    }
  }
  if (inTable) html += tableHtml + '</table></div>';
  return html;
}

async function loadBrain() {
  var el = document.getElementById('brain-content');
  if (brainLoaded) return;
  try {
    var res = await fetch(API + '/brain');
    var files = await res.json();

    var order = ['IDENTITY.md', 'SOUL.md', 'USER.md', 'AGENTS.md', 'HEARTBEAT.md', 'MEMORY.md'];
    var dailyKeys = Object.keys(files).filter(function(k) { return k.startsWith('memory/'); }).sort().reverse();
    var allKeys = order.filter(function(k) { return files[k]; }).concat(dailyKeys);

    var icons = { 'SOUL.md':'👻', 'IDENTITY.md':'🤖', 'USER.md':'👤', 'MEMORY.md':'🧠', 'AGENTS.md':'📋', 'HEARTBEAT.md':'💓' };

    var html = '';
    for (var idx = 0; idx < allKeys.length; idx++) {
      var key = allKeys[idx];
      var icon = icons[key] || '📝';
      var label = key.startsWith('memory/') ? '📝 ' + key.replace('memory/','') : icon + ' ' + key;
      var id = 'brain-' + key.replace(/[^a-zA-Z0-9]/g, '-');
      var expanded = (key === 'IDENTITY.md' || key === 'HEARTBEAT.md') ? 'open' : '';

      html += '<details ' + expanded + ' style="background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:8px;">';
      html += '<summary style="padding:12px 16px;cursor:pointer;color:#f0f6fc;font-weight:600;font-size:14px;user-select:none;">' + label + '</summary>';
      html += '<div style="padding:4px 16px 16px;border-top:1px solid #30363d;"><pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;color:#c9d1d9;font-family:ui-monospace,monospace;line-height:1.6;margin:0;">' + escapeHtml(files[key]) + '</pre></div>';
      html += '</details>';
    }

    el.innerHTML = html;
    brainLoaded = true;
  } catch(e) { el.innerHTML = '<p style="color:#f85149;">Error loading brain files</p>'; console.error(e); }
}

// --- Main load ---

async function load() {
  if (isUserTypingComment()) return;

  // Remember which comment sections are open before re-render
  document.querySelectorAll('.comments').forEach(function(el) {
    if (el.style.display !== 'none') {
      var input = el.querySelector('input[id^="comment-"]');
      if (input) window._openComments.add(input.id.replace('comment-',''));
    }
  });

  var tasks, stats, activity;
  try {
    var results = await Promise.all([
      fetch(API+'/tasks').then(function(r) { if (!r.ok) throw new Error('tasks: ' + r.status); return r.json(); }),
      fetch(API+'/stats').then(function(r) { if (!r.ok) throw new Error('stats: ' + r.status); return r.json(); }),
      fetch(API+'/activity?limit=50').then(function(r) { if (!r.ok) throw new Error('activity: ' + r.status); return r.json(); })
    ]);
    tasks = results[0];
    stats = results[1];
    activity = results[2];
  } catch (err) {
    console.error('Failed to load:', err);
    document.getElementById('last-pulse').textContent = '⚠ Connection error — ' + err.message;
    document.getElementById('last-pulse').style.color = '#f85149';
    return;
  }
  document.getElementById('last-pulse').style.color = '';

  // Stats
  document.getElementById('stats').innerHTML =
    '<div class="stat human"><div class="num">' + (stats.human_pending||0) + '</div><div class="label">👤 ' + CONFIG.humanName + '</div></div>' +
    '<div class="stat agent"><div class="num">' + (stats.agent_active||0) + '</div><div class="label">🤖 ' + CONFIG.agentName + '</div></div>' +
    '<div class="stat done"><div class="num">' + stats.done + '</div><div class="label">Done</div></div>' +
    '<div class="stat review"><div class="num">' + stats.pending_review + '</div><div class="label">⏳ Review</div></div>';

  // Store tasks globally for filtering
  window._allTasks = tasks;
  renderBoard(tasks);

  // Restore open comment sections after re-render
  window._openComments.forEach(function(taskId) {
    var commentsDiv = document.getElementById('comment-' + taskId);
    if (commentsDiv) {
      var section = commentsDiv.closest('.comments');
      if (section) section.style.display = 'block';
    }
  });

  // Activity log
  document.getElementById('activity-log').innerHTML = activity.length
    ? activity.map(function(a) {
        var t = new Date(a.timestamp).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        return '<div style="padding:3px 0;border-bottom:1px solid #21262d;color:#8b949e;">' + logIcon(a.type) + ' <span style="color:#484f58">' + t + '</span> ' + a.message + '</div>';
      }).join('')
    : '<div style="color:#484f58">No activity yet</div>';
}

// --- Task CRUD ---

async function addTask() {
  var title = document.getElementById('f-title').value.trim();
  if (!title) return;
  await fetch(API+'/tasks', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      title: title,
      description: document.getElementById('f-desc').value.trim(),
      assignee: document.getElementById('f-assignee').value,
      priority: document.getElementById('f-priority').value,
      drive_link: document.getElementById('f-drive').value.trim() || null,
      github_link: document.getElementById('f-github').value.trim() || null,
      project_ref: document.getElementById('f-project').value.trim() || null,
      due_date: document.getElementById('f-due').value || null,
      ticket_type: document.getElementById('f-ticket-type').value || 'auto',
    })
  });
  document.getElementById('f-title').value = '';
  document.getElementById('f-desc').value = '';
  document.getElementById('f-drive').value = '';
  document.getElementById('f-github').value = '';
  load();
}

async function updateTask(id, fields) {
  var scrollY = window.scrollY;
  await fetch(API+'/tasks/'+id, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fields) });
  await load();
  window.scrollTo(0, scrollY);
}

async function addComment(taskId) {
  var input = document.getElementById('comment-' + taskId);
  var author = document.getElementById('author-' + taskId);
  var text = input.value.trim();
  if (!text) return;
  var scrollY = window.scrollY;
  await fetch(API+'/tasks/'+taskId+'/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({author:author.value, text:text}) });
  input.value = '';
  await load();
  window.scrollTo(0, scrollY);
}

// --- Search ---

async function searchMemory() {
  var q = document.getElementById('search-input').value.trim();
  var div = document.getElementById('search-results');
  if (!q) { div.style.display = 'none'; return; }

  var allTasks = await fetch(API+'/tasks?include_all=true').then(function(r) { return r.json(); });

  var idMatch = q.match(/^#?(\d+)$/);
  if (idMatch) {
    var taskId = parseInt(idMatch[1]);
    var found = allTasks.filter(function(t) { return t.id === taskId; });
    div.style.display = 'block';
    if (found.length) {
      div.innerHTML = found.map(function(t) { return renderCard(t, t.status !== 'archived'); }).join('');
    } else {
      div.innerHTML = '<span style="color:#484f58">No task found with ID #' + taskId + '</span>';
    }
    return;
  }

  var lower = q.toLowerCase();
  var taskResults = allTasks.filter(function(t) {
    return (t.title && t.title.toLowerCase().includes(lower)) ||
      (t.description && t.description.toLowerCase().includes(lower)) ||
      (t.project_ref && t.project_ref.toLowerCase().includes(lower));
  });

  var memResults = await fetch(API+'/search?q='+encodeURIComponent(q)).then(function(r) { return r.json(); });

  div.style.display = 'block';
  var html = '';
  if (taskResults.length) {
    html += '<div style="color:#d29922;font-size:12px;font-weight:600;margin-bottom:8px;">🎯 Tasks (' + taskResults.length + ')</div>';
    html += taskResults.map(function(t) { return renderCard(t, false); }).join('');
  }
  if (memResults.length) {
    html += '<div style="color:#58a6ff;font-size:12px;font-weight:600;margin:12px 0 8px;">📝 Memory (' + memResults.length + ')</div>';
    html += memResults.map(function(r) { return '<div style="padding:4px 0;border-bottom:1px solid #21262d;"><span style="color:#58a6ff;font-size:11px;">' + r.file + ':' + r.line + '</span><div style="color:#c9d1d9;margin-top:2px;">' + r.text + '</div></div>'; }).join('');
  }
  if (!taskResults.length && !memResults.length) {
    html = '<span style="color:#484f58">No results</span>';
  }
  div.innerHTML = html;
}

async function updatePulse() {
  var activity = await fetch(API+'/activity?limit=1').then(function(r) { return r.json(); });
  if (activity.length) {
    var a = activity[0];
    var diff = Date.now() - new Date(a.timestamp).getTime();
    var mins = Math.floor(diff/60000);
    var ago = mins < 1 ? 'just now' : mins < 60 ? mins+'m ago' : Math.floor(mins/60)+'h ago';
    document.getElementById('last-pulse').textContent = '🫀 ' + ago + ' — ' + a.message.slice(0,50);
  }
}

// --- Ideas ---

async function loadIdeas() {
  try {
    var status = document.getElementById('filter-idea-status').value;
    var tag = document.getElementById('filter-idea-tag').value.trim();

    var url = API + '/ideas';
    var params = new URLSearchParams();
    if (status) params.append('status', status);
    if (tag) params.append('tag', tag);
    if (params.toString()) url += '?' + params.toString();

    var ideas = await fetch(url).then(function(r) { return r.json(); });
    window._allIdeas = ideas;

    var container = document.getElementById('ideas-container');
    var count = document.getElementById('ideas-count');

    count.textContent = '(' + ideas.length + ')';

    if (ideas.length === 0) {
      container.innerHTML = '<div style="color:#484f58;padding:12px;font-size:12px">No hay ideas aún. ¡Crea la primera! 💡</div>';
      return;
    }

    container.innerHTML = ideas.map(renderIdeaCard).join('');
  } catch (error) {
    console.error('Failed to load ideas:', error);
    document.getElementById('ideas-container').innerHTML = '<div style="color:#f85149;padding:12px;">Error loading ideas</div>';
  }
}

async function addIdea() {
  var title = document.getElementById('idea-title').value.trim();
  var source = document.getElementById('idea-source').value.trim();
  var context = document.getElementById('idea-context').value.trim();
  var tagsInput = document.getElementById('idea-tags').value.trim();

  if (!title) {
    alert('El título es requerido');
    return;
  }

  var tags = tagsInput ? tagsInput.split(',').map(function(t) { return t.trim().replace(/^#/, ''); }) : [];

  try {
    await fetch(API + '/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        source: source || null,
        context: context || null,
        tags: tags,
        status: 'idea'
      })
    });

    document.getElementById('idea-title').value = '';
    document.getElementById('idea-source').value = '';
    document.getElementById('idea-context').value = '';
    document.getElementById('idea-tags').value = '';

    await loadIdeas();
  } catch (error) {
    console.error('Failed to add idea:', error);
    alert('Error al crear la idea');
  }
}

async function updateIdeaStatus(id, newStatus) {
  try {
    await fetch(API + '/ideas/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    await loadIdeas();
  } catch (error) {
    console.error('Failed to update idea:', error);
    alert('Error al actualizar la idea');
  }
}

async function deleteIdea(id) {
  if (!confirm('¿Seguro que quieres eliminar esta idea?')) return;

  try {
    await fetch(API + '/ideas/' + id, { method: 'DELETE' });
    await loadIdeas();
  } catch (error) {
    console.error('Failed to delete idea:', error);
    alert('Error al eliminar la idea');
  }
}

function showPromoteDialog(id) {
  var idea = window._allIdeas ? window._allIdeas.find(function(i) { return i.id === id; }) : null;
  if (!idea) return;

  var assignee = prompt('¿A quién asignar el ticket?', CONFIG.defaultAssignee);
  if (!assignee) return;

  var priority = prompt('¿Qué prioridad? (normal/high)', 'normal');
  if (!priority) return;

  var dueDate = prompt('¿Fecha límite? (YYYY-MM-DD, opcional)', '');

  promoteIdea(id, assignee, priority, dueDate || null);
}

async function promoteIdea(id, assignee, priority, dueDate) {
  try {
    var response = await fetch(API + '/ideas/' + id + '/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignee: assignee,
        priority: priority,
        due_date: dueDate
      })
    });

    if (!response.ok) {
      var error = await response.json();
      throw new Error(error.error || 'Error promoting idea');
    }

    var result = await response.json();
    alert('¡Idea promovida! 💡➡️🎯 Nuevo ticket: #' + result.task.id);

    await loadIdeas();
    await load();
  } catch (error) {
    console.error('Failed to promote idea:', error);
    alert('Error al promover la idea: ' + error.message);
  }
}

function applyIdeaFilters() {
  loadIdeas();
}

function clearIdeaFilters() {
  document.getElementById('filter-idea-status').value = '';
  document.getElementById('filter-idea-tag').value = '';
  loadIdeas();
}

// --- Worker Runs ---

async function loadRuns() {
  if (runsLoaded) return;
  try {
    var runs = await fetch(API + '/worker-runs?limit=100').then(function(r) { return r.json(); });
    var tbody = document.getElementById('runs-tbody');
    var statsDiv = document.getElementById('runs-stats');
    var countEl = document.getElementById('runs-count');

    countEl.textContent = '(' + runs.length + ')';

    var now = new Date();
    var today = now.toISOString().slice(0, 10);
    var weekAgo = new Date(now - 7*24*60*60*1000).toISOString();

    var todayRuns = runs.filter(function(r) { return r.timestamp && r.timestamp.slice(0, 10) === today; });
    var weekRuns = runs.filter(function(r) { return r.timestamp && r.timestamp >= weekAgo; });

    var todayCost = todayRuns.reduce(function(s, r) { return s + (r.cost_usd || 0); }, 0);
    var weekCost = weekRuns.reduce(function(s, r) { return s + (r.cost_usd || 0); }, 0);
    var todayTokens = todayRuns.reduce(function(s, r) { return s + (r.tokens_in || 0) + (r.tokens_out || 0); }, 0);
    var weekTokens = weekRuns.reduce(function(s, r) { return s + (r.tokens_in || 0) + (r.tokens_out || 0); }, 0);
    var successRate = runs.length ? Math.round(runs.filter(function(r) { return r.status === 'ok'; }).length / runs.length * 100) : 0;

    statsDiv.innerHTML =
      '<div class="stat"><div class="num" style="color:#3fb950">' + todayRuns.length + '</div><div class="label">Today Runs</div></div>' +
      '<div class="stat"><div class="num" style="color:#d29922">$' + todayCost.toFixed(3) + '</div><div class="label">Today Cost</div></div>' +
      '<div class="stat"><div class="num" style="color:#58a6ff">' + weekRuns.length + '</div><div class="label">Week Runs</div></div>' +
      '<div class="stat"><div class="num" style="color:#d29922">$' + weekCost.toFixed(3) + '</div><div class="label">Week Cost</div></div>' +
      '<div class="stat"><div class="num" style="color:#bc8cff">' + (weekTokens/1000).toFixed(1) + 'K</div><div class="label">Week Tokens</div></div>' +
      '<div class="stat"><div class="num" style="color:' + (successRate>=80?'#3fb950':'#f85149') + '">' + successRate + '%</div><div class="label">Success Rate</div></div>';

    if (runs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="padding:20px;text-align:center;color:#484f58;">No worker runs yet. Crons will log here when they execute.</td></tr>';
      return;
    }

    tbody.innerHTML = runs.map(function(r) {
      var time = r.timestamp ? new Date(r.timestamp).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';
      var statusColor = r.status === 'ok' ? '#3fb950' : '#f85149';
      var modelShort = (r.model || '-').replace('google/', '').replace('anthropic/', '').replace('openai/', '');
      return '<tr style="border-bottom:1px solid #21262d;">' +
        '<td style="padding:6px 8px;color:#8b949e;font-size:11px;">' + time + '</td>' +
        '<td style="padding:6px 8px;color:#f0f6fc;">' + (r.worker || '-') + '</td>' +
        '<td style="padding:6px 8px;color:#58a6ff;">' + (r.ticket_id ? '#'+r.ticket_id : '-') + '</td>' +
        '<td style="padding:6px 8px;color:#bc8cff;font-size:11px;">' + modelShort + '</td>' +
        '<td style="padding:6px 8px;text-align:right;color:#8b949e;">' + (r.tokens_in||0).toLocaleString() + '</td>' +
        '<td style="padding:6px 8px;text-align:right;color:#8b949e;">' + (r.tokens_out||0).toLocaleString() + '</td>' +
        '<td style="padding:6px 8px;text-align:right;color:#d29922;">$' + (r.cost_usd||0).toFixed(4) + '</td>' +
        '<td style="padding:6px 8px;text-align:right;color:#8b949e;">' + (r.duration_s||0) + 's</td>' +
        '<td style="padding:6px 8px;text-align:center;color:' + statusColor + ';">' + (r.status === 'ok' ? '✅' : '❌') + ' ' + (r.status||'-') + '</td>' +
      '</tr>';
    }).join('');

    runsLoaded = true;
  } catch (error) {
    console.error('Failed to load runs:', error);
    document.getElementById('runs-tbody').innerHTML = '<tr><td colspan="9" style="padding:20px;text-align:center;color:#f85149;">Error loading worker runs</td></tr>';
  }
}

// --- Analytics ---

async function loadAnalytics() {
  try {
    var aging = await fetch(API+'/aging').then(function(r) { return r.json(); });
    var stats = aging.metrics;

    document.getElementById('aging-stats').innerHTML =
      '<div class="stat"><div class="num" style="color:#f85149">' + stats.stale_tasks + '</div><div class="label">Stale Tasks</div></div>' +
      '<div class="stat"><div class="num" style="color:#d29922">' + stats.ancient_tasks + '</div><div class="label">Ancient Tasks</div></div>' +
      '<div class="stat"><div class="num" style="color:#3fb950">' + stats.avg_completion_hours + 'h</div><div class="label">Avg Completion</div></div>' +
      '<div class="stat"><div class="num" style="color:#bc8cff">' + Math.floor(stats.oldest_active/24) + 'd</div><div class="label">Oldest Active</div></div>';

    var staleTasksHtml = aging.tasks
      .filter(function(t) { return (t.isStale || t.isAncient) && t.status !== 'done'; })
      .map(function(task) {
        return '<div class="card ' + (task.priority === 'high' ? 'high' : task.isAncient ? 'critical' : '') + '">' +
          '<div class="card-title">' +
            '<span class="task-id" onclick="copyText(\'#' + task.id + '\')">#' + task.id + '</span>' +
            task.title +
          '</div>' +
          '<div class="card-desc">' +
            (task.project_ref ? '<strong>' + task.project_ref + '</strong><br>' : '') +
            'Age: ' + Math.floor(task.ageHours/24) + 'd ' + task.ageHours%24 + 'h' +
            (task.staleDays > 0 ? ' | Stale: ' + task.staleDays + 'd' : '') +
          '</div>' +
          '<div class="card-meta">' +
            '<span class="badge badge-' + task.status + '">' + task.status + '</span>' +
            '<span class="badge badge-' + task.priority + '">' + task.priority + '</span>' +
            '<span class="badge ' + (task.assignee === 'human' ? 'badge-other' : 'badge-content') + '">' + task.assignee + '</span>' +
            (task.isAncient ? '<span class="badge badge-security">ANCIENT</span>' : '') +
            (task.isStale ? '<span class="badge badge-high">STALE</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');

    document.getElementById('stale-tasks').innerHTML = staleTasksHtml ||
      '<div style="color:#3fb950;padding:12px;font-size:12px">✅ No stale tasks - everything looks healthy!</div>';

  } catch (error) {
    console.error('Failed to load analytics:', error);
    document.getElementById('aging-stats').innerHTML = '<div style="color:#f85149;padding:12px;">Failed to load analytics</div>';
  }
}

// --- Initialization ---

applyCollapsedState();
loadConfig().then(function() { load(); });
setInterval(load, 30000);
updateClock();
setInterval(updateClock, 60000);
updatePulse();
setInterval(updatePulse, 60000);
