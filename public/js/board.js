// Board rendering and filtering

function renderCard(task, showActions) {
  var prioClass = task.priority === 'high' ? 'high' : (task.priority === 'critical' ? 'critical' : '');
  var prioMap = {
    low: {label:'LOW', bg:'#1c1c1c', color:'#484f58'},
    normal: {label:'NORMAL', bg:'#1a2332', color:'#58a6ff'},
    high: {label:'HIGH', bg:'#3d1f1f', color:'#f85149'},
    critical: {label:'CRITICAL', bg:'#5c1a1a', color:'#ff6b6b'}
  };
  var prio = prioMap[task.priority] || prioMap.normal;
  var prioLabel = '<span class="badge" style="background:' + prio.bg + ';color:' + prio.color + ';cursor:pointer;" onclick="cyclePriority(' + task.id + ',\'' + task.priority + '\')" title="Tap to change priority">' + prio.label + '</span>';
  var statusBadge = '<span class="badge badge-' + task.status + '">' + task.status.toUpperCase() + '</span>';
  var assigneeIcon = task.assignee === 'human' ? '👤' : '🤖';

  var reviewBadge = '';
  if (task.status === 'done') {
    reviewBadge = task.reviewed_by_owner
      ? '<span class="badge badge-reviewed">✅ Reviewed</span>'
      : '<span class="badge badge-review">⏳ Pending Review</span>';
  }

  // Deliverable type badge (PR #N, Issue #N, Research, etc.)
  var deliverableBadge = '';
  if (task.deliverable_type && task.deliverable_type !== 'other') {
    var dtLabel = task.deliverable_type.toUpperCase();
    var dtExtra = '';
    if (task.deliverable_type === 'pr' && task.deliverable_url) {
      var prMatch = task.deliverable_url.match(/\/pull\/(\d+)/);
      if (prMatch) dtExtra = ' #' + prMatch[1];
    }
    var dtColor = task.deliverable_type === 'pr' ? '#f78166' : '#58a6ff';
    var dtBg = task.deliverable_type === 'pr' ? '#3d1a0f' : '#0d1d30';
    var dtTooltip = task.deliverable_type === 'pr' ? 'Este ticket entrega un Pull Request. Approve = merge automático.' : 'Tipo de entregable: ' + dtLabel;
    deliverableBadge = '<span class="badge" style="background:' + dtBg + ';color:' + dtColor + '" title="' + dtTooltip + '">📦 ' + dtLabel + dtExtra + '</span>';
  }

  // Smart links with tooltips and extracted issue/PR numbers
  var links = '';
  if (task.drive_link || task.github_link || task.deliverable_url) {
    links = '<div class="card-links">';
    if (task.github_link) {
      var issueMatch = task.github_link.match(/\/issues\/(\d+)/);
      var issueLabel = issueMatch ? 'Issue #' + issueMatch[1] : 'GitHub';
      links += '<a class="card-link link-github" href="' + task.github_link + '" target="_blank" title="GitHub Issue — click para ver detalles del issue">🔗 ' + issueLabel + '</a>';
    }
    if (task.deliverable_url) {
      var prMatch2 = task.deliverable_url.match(/\/pull\/(\d+)/);
      var delLabel = prMatch2 ? 'PR #' + prMatch2[1] : 'Deliverable';
      var delTooltip = prMatch2 ? 'Pull Request — Approve mergeará este PR automáticamente' : 'URL del entregable';
      links += '<a class="card-link link-drive" href="' + task.deliverable_url + '" target="_blank" title="' + delTooltip + '">📎 ' + delLabel + '</a>';
    }
    if (task.drive_link) links += '<a class="card-link link-drive" href="' + task.drive_link + '" target="_blank" title="Archivo en Google Drive — accesible desde el teléfono">📄 Drive</a>';
    links += '</div>';
  }

  var actions = '';
  if (showActions) {
    var cancelBtn = '<button style="border-color:#f85149;color:#f85149;" onclick="if(confirm(\'Cancel #' + task.id + '?\'))updateTask(' + task.id + ',{status:\'archived\'})">✕</button>';
    if (task.status === 'todo') actions = '<button onclick="updateTask(' + task.id + ',{status:\'doing\'})">▶ Start</button> ' + cancelBtn;
    else if (task.status === 'doing') actions = '<button onclick="updateTask(' + task.id + ',{status:\'todo\'})">◀ To Do</button><button onclick="markDone(' + task.id + ',' + !task.drive_link + ')">✅ Done</button> ' + cancelBtn;
    else if (task.status === 'done' && !task.reviewed_by_owner) {
      if (task.assignee === 'human') {
        actions = '<div class="review-actions">' +
          '<div class="review-label">📋 Send for review:</div>' +
          '<div class="review-row">' +
            '<button class="btn-back" onclick="updateTask(' + task.id + ',{status:\'doing\'})">◀ Back</button>' +
            '<button style="border-color:#bc8cff;color:#bc8cff;" onclick="updateTask(' + task.id + ',{assignee:\'agent\'})">🤖 ' + CONFIG.agentName + ' Review</button>' +
          '</div>' +
        '</div>';
      } else {
        var approveTooltip = task.deliverable_type === 'pr' ? 'Cierra el ticket y MERGEA el PR automáticamente' : 'Cierra el ticket como completado';
        actions = '<div class="review-actions">' +
          '<div class="review-label">👀 Your review:</div>' +
          '<div class="review-row">' +
            '<button class="btn-close" onclick="updateTask(' + task.id + ',{reviewed_by_owner:1,review_action:\'close\'})" title="' + approveTooltip + '">✅ Approve</button>' +
            '<button class="btn-expand" onclick="updateTask(' + task.id + ',{reviewed_by_owner:1,review_action:\'expand\'})" title="Crea sub-tickets a partir de este ticket">🔀 Expand</button>' +
          '</div>' +
          '<div class="review-row">' +
            '<button class="btn-info" onclick="updateTask(' + task.id + ',{reviewed_by_owner:1,review_action:\'need_info\'})" title="Devuelve el ticket pidiendo más información">❓ Need Info</button>' +
            '<button class="btn-back" onclick="updateTask(' + task.id + ',{status:\'doing\'})" title="Regresa el ticket a Doing para más trabajo">◀ Back</button>' +
          '</div>' +
        '</div>';
      }
    }
  }

  var comments = task.comments || [];
  var commentsHtml = comments.map(function(c) {
    return '<div class="comment"><span class="comment-author">' + c.author + '</span><span class="comment-time">' + formatDate(c.timestamp) + '</span><div class="comment-text">' + c.text + '</div></div>';
  }).join('');

  // Smart assignee badge: show "👀 Your Review" when ticket is in review state for human
  var isInReview = task.status === 'done' && !task.reviewed_by_owner && task.assignee !== 'human';
  var assigneeLabel = isInReview ? '👀 Your Review' : (task.assignee === 'human' ? '👤 ' + CONFIG.humanName : '🤖 ' + CONFIG.agentName);
  var toggleAssignee = task.assignee === 'human' ? 'agent' : 'human';
  var assigneeBadge = '<span class="badge" style="background:' + (isInReview?'#3d2a0f':task.assignee==='human'?'#3d2a0f':'#2a1a2e') + ';color:' + (isInReview?'#d29922':task.assignee==='human'?'#f78166':'#bc8cff') + ';cursor:pointer" onclick="updateTask(' + task.id + ',{assignee:\'' + toggleAssignee + '\'})" title="' + (isInReview ? 'This ticket is waiting for your review. Click to reassign.' : 'Click to reassign') + '">' + assigneeLabel + '</span>';

  var taskId = '#' + task.id;
  var projectRef = task.project_ref || '';

  return '<div class="card ' + prioClass + '" data-assignee="' + task.assignee + '">' +
    '<div class="card-title"><span class="task-id" onclick="copyId(\'' + taskId + '\',this)" title="Tap to copy ' + taskId + '">' + taskId + '</span> ' + task.title + '</div>' +
    (task.parent_id ? '<div style="font-size:11px;margin-bottom:4px;padding:3px 8px;background:rgba(88,166,255,0.1);border-left:2px solid #58a6ff;border-radius:0 4px 4px 0;">↳ subtask of <span class="task-id" onclick="copyId(\'#' + task.parent_id + '\',this)" style="font-size:10px">#' + task.parent_id + '</span></div>' : '') +
    (projectRef ? '<div style="font-size:11px;color:#58a6ff;margin-bottom:4px;">📂 ' + projectRef + '</div>' : '') +
    (task.description ? '<div class="card-desc">' + task.description + '</div>' : '') +
    '<div class="card-meta">' + assigneeBadge + ' ' + ticketTypeBadge(task) + ' ' + deliverableBadge + ' ' + prioLabel + ' ' + reviewBadge + ' ' + (!task.drive_link && task.status !== 'routine' && task.status !== 'archived' ? '<span class="badge" style="background:#3d2a0f;color:#d29922;" title="Sin archivo en Drive — Ronald no puede verlo desde el teléfono (Golden Rule #7)">⚠️ No Drive</span>' : '') + ' ' + (function() {
      if (!task.due_date) return '';
      var due = new Date(task.due_date + 'T23:59:59');
      var now = new Date();
      var days = Math.ceil((due - now) / 86400000);
      var color = days < 0 ? '#f85149' : days <= 2 ? '#d29922' : '#58a6ff';
      var label = days < 0 ? '⚠️ OVERDUE' : days === 0 ? '📅 TODAY' : days <= 2 ? '📅 ' + days + 'd' : '📅 ' + task.due_date;
      return '<span class="badge" style="background:' + (days < 0 ? '#3d1214' : days <= 2 ? '#3d2a0f' : '#0d1d30') + ';color:' + color + ';cursor:pointer" onclick="promptDueDate(' + task.id + ')" title="Click to change due date">' + label + '</span>';
    })() + '</div>' +
    links +
    (actions ? '<div class="card-actions">' + actions + '</div>' : '') +
    '<div class="comment-toggle" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">' +
      '💬 ' + comments.length + ' comment' + (comments.length!==1?'s':'') + ' ' + (comments.length?'':'— add one') +
    '</div>' +
    '<div class="comments" style="display:none">' +
      commentsHtml +
      '<div class="comment-form">' +
        '<select id="author-' + task.id + '"><option value="' + CONFIG.humanName + '">' + CONFIG.humanName + '</option><option value="' + CONFIG.agentName + '">' + CONFIG.agentName + '</option></select>' +
        '<input type="text" id="comment-' + task.id + '" placeholder="Write feedback..." onkeyup="if(event.key===\'Enter\')addComment(' + task.id + ')">' +
        '<button onclick="addComment(' + task.id + ')">Send</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderBoard(tasks) {
  var f = currentFilter;
  var filtered = f === 'all' ? tasks : tasks.filter(function(t) { return t.assignee === f; });

  var routineTasks = filtered.filter(function(t) { return t.status === 'routine'; });
  var nonRoutine = filtered.filter(function(t) { return t.status !== 'routine'; });

  // "done" tasks split: unreviewed → Review column, reviewed → Closed
  var reviewTasks = nonRoutine.filter(function(t) { return t.status === 'done' && !t.reviewed_by_owner; });
  var closedTasks = nonRoutine.filter(function(t) { return t.status === 'done' && t.reviewed_by_owner; });

  var todoTasks = nonRoutine.filter(function(t) { return t.status === 'todo'; });
  var doingTasks = nonRoutine.filter(function(t) { return t.status === 'doing'; });
  var empty = '<div style="color:#484f58;padding:12px;font-size:12px">—</div>';
  document.getElementById('cards-todo').innerHTML = todoTasks.map(function(t) { return renderCard(t,true); }).join('') || empty;
  document.getElementById('cards-doing').innerHTML = doingTasks.map(function(t) { return renderCard(t,true); }).join('') || empty;
  document.getElementById('cards-review').innerHTML = reviewTasks.map(function(t) { return renderCard(t,true); }).join('') || empty;
  document.getElementById('cards-routine').innerHTML = routineTasks.map(function(t) { return renderCard(t,false); }).join('') || empty;
  document.getElementById('count-todo').textContent = '(' + todoTasks.length + ')';
  document.getElementById('count-doing').textContent = '(' + doingTasks.length + ')';
  document.getElementById('count-review').textContent = '(' + reviewTasks.length + ')';
  document.getElementById('routine-count').textContent = '(' + routineTasks.length + ')';
  document.getElementById('cards-closed').innerHTML = closedTasks.map(function(t) { return renderCard(t,false); }).join('') || '<div style="color:#484f58;padding:12px;font-size:12px">Nothing closed yet</div>';
  document.getElementById('closed-count').textContent = '(' + closedTasks.length + ')';
  applyCollapsedState();
}

function renderIdeaCard(idea) {
  var statusEmojis = {
    'idea': '💡',
    'explorando': '🔬',
    'descartada': '❌',
    'promovida': '🎯'
  };

  var statusColors = {
    'idea': 'color: #d29922',
    'explorando': 'color: #58a6ff',
    'descartada': 'color: #f85149',
    'promovida': 'color: #3fb950'
  };

  var tagsHtml = (idea.tags || []).map(function(tag) {
    return '<span style="background:#1a2332;color:#79c0ff;font-size:10px;padding:2px 6px;border-radius:12px;margin-right:4px;">' + tag + '</span>';
  }).join('');

  var sourceHtml = idea.source ?
    '<div style="font-size:11px;color:#8b949e;margin-top:4px;">' +
      '📎 <a href="' + idea.source + '" target="_blank" style="color:#58a6ff;text-decoration:none;">' + idea.source + '</a>' +
    '</div>' : '';

  var promoteButton = idea.status !== 'promovida' && idea.status !== 'descartada' ?
    '<button onclick="showPromoteDialog(' + idea.id + ')" style="font-size:11px;padding:3px 10px;border-radius:4px;border:1px solid #3fb950;background:#1f3d2a;color:#3fb950;cursor:pointer;margin-left:8px;">🎯 Promover</button>' : '';

  return '<div class="card" style="margin-bottom:8px;">' +
      '<div class="card-title">' +
        '<span class="task-id" onclick="copyText(\'#' + idea.id + '\')">#' + idea.id + '</span>' +
        (idea.title || 'Sin título') +
        '<div style="margin-left:auto;display:flex;align-items:center;">' +
          '<span style="' + (statusColors[idea.status] || 'color: #8b949e') + '">' + (statusEmojis[idea.status] || '❓') + ' ' + idea.status + '</span>' +
        '</div>' +
      '</div>' +
      (idea.context ? '<div class="card-desc">' + idea.context + '</div>' : '') +
      sourceHtml +
      (tagsHtml ? '<div style="margin-top:8px;">' + tagsHtml + '</div>' : '') +
      (idea.promoted_to ? '<div style="margin-top:8px;color:#3fb950;font-size:11px;">✅ Promovida a ticket #' + idea.promoted_to + '</div>' : '') +
      '<div class="card-actions" style="margin-top:8px;">' +
        '<select onchange="updateIdeaStatus(' + idea.id + ', this.value)" style="font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #30363d;background:#21262d;color:#c9d1d9;">' +
          '<option value="idea"' + (idea.status === 'idea' ? ' selected' : '') + '>💡 Idea</option>' +
          '<option value="explorando"' + (idea.status === 'explorando' ? ' selected' : '') + '>🔬 Explorando</option>' +
          '<option value="descartada"' + (idea.status === 'descartada' ? ' selected' : '') + '>❌ Descartada</option>' +
        '</select>' +
        promoteButton +
        '<button onclick="deleteIdea(' + idea.id + ')" style="font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #f85149;background:transparent;color:#f85149;cursor:pointer;margin-left:8px;">🗑️</button>' +
      '</div>' +
    '</div>';
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('filter-' + f).classList.add('active');
  applyFilters();
}

// Unified filter — composes assignee quick-filter with advanced dropdowns
function applyFilters() {
  if (!window._allTasks) return;

  var priority = document.getElementById('filter-priority').value;
  var type = document.getElementById('filter-type').value;
  var status = document.getElementById('filter-status').value;
  var ticketType = document.getElementById('filter-ticket-type').value;

  var filtered = window._allTasks.filter(function(task) {
    if (currentFilter !== 'all' && task.assignee !== currentFilter) return false;
    if (priority && task.priority !== priority) return false;
    if (type && task.deliverable_type !== type) return false;
    if (status && task.status !== status) return false;
    if (ticketType && task.ticket_type !== ticketType) return false;
    return true;
  });

  renderBoard(filtered);
}

// Keep backward compat for inline onchange calls
function applyAdvancedFilters() { applyFilters(); }

function clearAdvancedFilters() {
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-ticket-type').value = '';
  applyFilters();
}
