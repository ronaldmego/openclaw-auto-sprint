const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

try { require('dotenv').config(); } catch {}

const app = express();
const PORT = process.env.OCC_PORT || 3401;
const HOST = process.env.OCC_HOST || '127.0.0.1';
const WORKSPACE = process.env.OCC_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
const HUMAN_NAME = process.env.OCC_HUMAN_NAME || 'Human';
const AGENT_NAME = process.env.OCC_AGENT_NAME || 'Agent';
const DEFAULT_ASSIGNEE = process.env.OCC_DEFAULT_ASSIGNEE || 'agent';
const DEFAULT_AUTHOR = process.env.OCC_DEFAULT_AUTHOR || 'Human';
const DB_FILE = path.join(__dirname, 'data', 'tasks.json');
const LOG_FILE = path.join(__dirname, 'data', 'activity.json');
const WORKER_RUNS_FILE = path.join(__dirname, 'data', 'worker-runs.jsonl');
const USAGE_API_URL = process.env.OAS_USAGE_API_URL || 'http://127.0.0.1:3400/api/global-usage';

// Model pricing (USD per 1M tokens) — keep in sync with issue #39
const MODEL_PRICING = {
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':  { input:  3.00, output: 15.00 },
  'claude-haiku-3-5':   { input:  0.80, output:  4.00 },
  'gpt-5.2':            { input:  2.00, output:  8.00 },
  'gemini-2.5-flash':   { input:  0.15, output:  0.60 },
  'gemini-2.5-pro':     { input:  1.25, output: 10.00 },
};

function calculateCost(model, tokensIn, tokensOut) {
  if (!model || (!tokensIn && !tokensOut)) return 0;
  // Strip provider prefix (e.g. "google/gemini-2.5-flash" -> "gemini-2.5-flash")
  const shortModel = model.includes('/') ? model.split('/').pop() : model;
  // Try exact match, then partial match (e.g. "claude-haiku-3-5-20241022" matches "claude-haiku-3-5")
  const pricing = MODEL_PRICING[shortModel]
    || Object.entries(MODEL_PRICING).find(([k]) => shortModel.startsWith(k))?.[1];
  if (!pricing) return 0;
  return Number(((tokensIn || 0) * pricing.input / 1e6 + (tokensOut || 0) * pricing.output / 1e6).toFixed(6));
}

// Usage API snapshot helper — never throws
async function fetchUsageSnapshot() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(USAGE_API_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return { success: false };
    const data = await resp.json();
    return { success: true, session_pct: data?.session?.percent ?? null };
  } catch {
    return { success: false };
  }
}

// In-memory tracked runs (lost on restart — acceptable for MVP)
const pendingRuns = new Map();

// Write mutex — prevents race conditions on concurrent writes
let writeQueue = Promise.resolve();
function withWriteLock(fn) {
  const next = writeQueue.then(fn);
  writeQueue = next.catch(() => {});
  return next;
}

// Simple JSON "database"
function loadDB() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.ideas) data.ideas = [];
    const maxTaskId = data.tasks.reduce((m, t) => Math.max(m, t.id || 0), 0);
    const maxIdeaId = data.ideas.reduce((m, i) => Math.max(m, i.id || 0), 0);
    const maxId = Math.max(maxTaskId, maxIdeaId);
    if (data.nextId <= maxId) data.nextId = maxId + 1;
    return data;
  }
  catch { return { tasks: [], ideas: [], nextId: 1 }; }
}

function loadLogs() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
  catch { return []; }
}
function addLog(type, message) {
  const logs = loadLogs();
  logs.unshift({ type, message, timestamp: new Date().toISOString() });
  // Keep last 200 entries
  if (logs.length > 200) logs.length = 200;
  // Ensure directory exists before writing
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}
function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Config (display names for the UI)
app.get('/api/config', (req, res) => {
  res.json({
    humanName: HUMAN_NAME,
    agentName: AGENT_NAME,
    defaultAssignee: DEFAULT_ASSIGNEE,
    defaultAuthor: DEFAULT_AUTHOR,
  });
});

// API: Get TOOLS.md content (APIs/Skills inventory)
app.get('/api/tools', (req, res) => {
  const toolsPath = path.join(WORKSPACE, 'TOOLS.md');
  try {
    const content = fs.readFileSync(toolsPath, 'utf8');
    res.json({ content });
  } catch (e) {
    res.status(404).json({ error: 'TOOLS.md not found' });
  }
});

app.get('/api/reglas', (req, res) => {
  const reglasPath = path.join(WORKSPACE, 'OCC-GOLDEN-RULES.md');
  try {
    const content = fs.readFileSync(reglasPath, 'utf8');
    res.json({ content });
  } catch (e) {
    res.status(404).json({ error: 'OCC-GOLDEN-RULES.md not found' });
  }
});

// API: Get ASC documentation
app.get('/api/asc', (req, res) => {
  const ascPath = path.join(__dirname, 'docs', 'autonomous-sprint-cycle.md');
  try {
    const content = fs.readFileSync(ascPath, 'utf8');
    res.json({ content });
  } catch (e) {
    res.status(404).json({ error: 'autonomous-sprint-cycle.md not found' });
  }
});

// Helper function to extract title from markdown content
function extractTitleFromMd(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

// API: Get all docs from docs/ folder + Golden Rules
app.get('/api/docs', (req, res) => {
  const docs = [];
  
  // Define the order of sections as specified
  const orderedFiles = [
    'autonomous-sprint-cycle.md',
    'board-autonomy-architecture.md', 
    'ticket-anatomy.md',
    'golden-rules-changelog.md'
  ];
  
  try {
    // Read all docs/ files in specified order
    for (const filename of orderedFiles) {
      const filePath = path.join(__dirname, 'docs', filename);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const title = extractTitleFromMd(content) || filename.replace('.md', '').replace(/-/g, ' ');
        const slug = filename.replace('.md', '');
        docs.push({ slug, title, content });
      } catch (e) {
        console.warn(`Could not read ${filename}:`, e.message);
      }
    }
    
    // Add Golden Rules from workspace
    const goldenRulesPath = path.join(WORKSPACE, 'OAS-GOLDEN-RULES.md');
    try {
      const content = fs.readFileSync(goldenRulesPath, 'utf8');
      const title = extractTitleFromMd(content) || 'Golden Rules';
      docs.splice(1, 0, { slug: 'golden-rules', title, content }); // Insert as second item
    } catch (e) {
      // Try alternative filename
      const altPath = path.join(WORKSPACE, 'OCC-GOLDEN-RULES.md');
      try {
        const content = fs.readFileSync(altPath, 'utf8');
        const title = extractTitleFromMd(content) || 'Golden Rules';
        docs.splice(1, 0, { slug: 'golden-rules', title, content }); // Insert as second item
      } catch (e2) {
        console.warn('Could not find Golden Rules file:', e.message, e2.message);
      }
    }
    
    res.json(docs);
  } catch (e) {
    console.error('Error loading docs:', e);
    res.status(500).json({ error: 'Failed to load documentation' });
  }
});

// API: Get brain files (workspace .md files for visibility)
app.get('/api/brain', (req, res) => {
  const ALLOWED_ROOT = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'MEMORY.md', 'AGENTS.md', 'HEARTBEAT.md'];
  const result = {};

  // Root files
  for (const f of ALLOWED_ROOT) {
    try { result[f] = fs.readFileSync(path.join(WORKSPACE, f), 'utf8'); } catch {}
  }

  // Daily memory files (last 7 days)
  const memDir = path.join(WORKSPACE, 'memory');
  try {
    const files = fs.readdirSync(memDir)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .slice(-7);
    for (const f of files) {
      try { result['memory/' + f] = fs.readFileSync(path.join(memDir, f), 'utf8'); } catch {}
    }
  } catch {}

  res.json(result);
});

// API: Get all tasks
app.get('/api/tasks', (req, res) => {
  const db = loadDB();
  let tasks = req.query.include_all === 'true' ? db.tasks : db.tasks.filter(t => t.status !== 'archived');
  if (req.query.status) tasks = tasks.filter(t => t.status === req.query.status);
  // Sort: doing first, then todo, then done
  const order = { doing: 1, todo: 2, done: 3 };
  tasks.sort((a, b) => (order[a.status]||4) - (order[b.status]||4) || new Date(b.created_at) - new Date(a.created_at));
  res.json(tasks);
});

// API: Create task
app.post('/api/tasks', (req, res) => {
  const db = loadDB();
  const { title, description, deliverable_type, deliverable_url, priority, assignee, drive_link, github_link, project_ref, parent_id, due_date, status, ticket_type } = req.body;
  const validStatuses = ['todo', 'doing', 'done', 'completed', 'routine'];
  const task = {
    id: db.nextId++,
    title,
    description: description || null,
    deliverable_type: deliverable_type || 'other',
    deliverable_url: deliverable_url || null,
    status: validStatuses.includes(status) ? status : 'todo',
    priority: priority || 'normal',
    assignee: assignee || DEFAULT_ASSIGNEE,
    drive_link: drive_link || null,
    github_link: github_link || null,
    project_ref: project_ref || null,
    parent_id: parent_id || null,
    due_date: due_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    reviewed_by_owner: false,
    review_action: null,
    ticket_type: ['auto', 'manual'].includes(ticket_type) ? ticket_type : (['agent', 'pepa'].includes(assignee || DEFAULT_ASSIGNEE) ? 'auto' : 'manual')
  };
  db.tasks.push(task);
  saveDB(db);
  addLog('task_created', `#${task.id} ${task.title}`);
  res.json(task);
});

// API: Update task
app.patch('/api/tasks/:id', (req, res) => {
  const db = loadDB();
  const id = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'not found' });

  const allowed = ['title', 'description', 'deliverable_type', 'deliverable_url', 'status', 'priority', 'reviewed_by_owner', 'assignee', 'drive_link', 'github_link', 'project_ref', 'parent_id', 'due_date', 'blocked_by', 'ticket_type', 'review_action'];
  const validStatuses = ['todo', 'doing', 'done', 'completed', 'routine', 'archived'];
  const validPriorities = ['low', 'normal', 'high', 'critical'];
  const validTicketTypes = ['auto', 'manual'];
  for (const [key, val] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    if (key === 'status' && !validStatuses.includes(val)) continue;
    if (key === 'priority' && !validPriorities.includes(val)) continue;
    if (key === 'ticket_type' && !validTicketTypes.includes(val)) continue;
    task[key] = val;
  }
  if (!task.comments) task.comments = [];
  if (req.body.status === 'done' && !task.completed_at) {
    task.completed_at = new Date().toISOString();
  }
  task.updated_at = new Date().toISOString();
  saveDB(db);
  const changes = Object.keys(req.body).join(',');
  addLog('task_updated', `#${task.id} ${task.title} [${changes}→${req.body.status||'edit'}]`);
  res.json(task);
});

// API: Add comment to task
app.post('/api/tasks/:id/comments', (req, res) => {
  const db = loadDB();
  const id = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'not found' });
  if (!task.comments) task.comments = [];
  const { author, text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const comment = {
    id: Date.now(),
    author: author || DEFAULT_AUTHOR,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };
  task.comments.push(comment);
  task.updated_at = new Date().toISOString();
  saveDB(db);
  addLog('comment_added', `#${task.id} ${task.title} — ${comment.author}: "${text.trim().slice(0,60)}"`);
  res.json(comment);
});

// API: Delete comment from task
app.delete('/api/tasks/:id/comments/:commentId', (req, res) => {
  const db = loadDB();
  const task = db.tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'not found' });
  if (!task.comments) return res.json({ ok: true });
  task.comments = task.comments.filter(c => c.id !== parseInt(req.params.commentId));
  saveDB(db);
  res.json({ ok: true });
});

// API: Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const db = loadDB();
  const id = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'not found' });
  db.tasks = db.tasks.filter(t => t.id !== id);
  saveDB(db);
  addLog('task_deleted', `#${id} ${task.title}`);
  res.json({ ok: true });
});

// API: Get all ideas
app.get('/api/ideas', (req, res) => {
  const db = loadDB();
  let ideas = db.ideas || [];
  if (req.query.status) ideas = ideas.filter(i => i.status === req.query.status);
  if (req.query.tag) ideas = ideas.filter(i => i.tags && i.tags.includes(req.query.tag));
  // Sort by status priority: 💡 idea > 🔬 explorando > ❌ descartada, then by created date desc
  const statusOrder = { 'idea': 1, 'explorando': 2, 'descartada': 3 };
  ideas.sort((a, b) => (statusOrder[a.status]||4) - (statusOrder[b.status]||4) || new Date(b.created_at) - new Date(a.created_at));
  res.json(ideas);
});

// API: Create idea
app.post('/api/ideas', (req, res) => {
  const db = loadDB();
  if (!db.ideas) db.ideas = [];
  const { title, source, context, tags, status } = req.body;
  const validStatuses = ['idea', 'explorando', 'descartada'];
  const idea = {
    id: db.nextId++,
    title: title || null,
    source: source || null,
    context: context || null,
    tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []),
    status: validStatuses.includes(status) ? status : 'idea',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    promoted_to: null // Will store task ID when promoted
  };
  db.ideas.push(idea);
  saveDB(db);
  addLog('idea_created', `💡 #${idea.id} ${idea.title}`);
  res.json(idea);
});

// API: Update idea
app.patch('/api/ideas/:id', (req, res) => {
  const db = loadDB();
  const id = parseInt(req.params.id);
  const idea = (db.ideas || []).find(i => i.id === id);
  if (!idea) return res.status(404).json({ error: 'not found' });

  const allowed = ['title', 'source', 'context', 'tags', 'status'];
  for (const [key, val] of Object.entries(req.body)) {
    if (allowed.includes(key)) {
      if (key === 'tags' && Array.isArray(val)) {
        idea[key] = val;
      } else if (key === 'tags' && typeof val === 'string') {
        idea[key] = val.split(',').map(t => t.trim());
      } else {
        idea[key] = val;
      }
    }
  }
  idea.updated_at = new Date().toISOString();
  saveDB(db);
  addLog('idea_updated', `💡 #${idea.id} ${idea.title} [${Object.keys(req.body).join(',')}]`);
  res.json(idea);
});

// API: Promote idea to task
app.post('/api/ideas/:id/promote', (req, res) => {
  const db = loadDB();
  const id = parseInt(req.params.id);
  const idea = (db.ideas || []).find(i => i.id === id);
  if (!idea) return res.status(404).json({ error: 'idea not found' });
  if (idea.promoted_to) return res.status(400).json({ error: 'already promoted' });

  // Create task from idea
  const { assignee, priority, deliverable_type, due_date } = req.body;
  const task = {
    id: db.nextId++,
    title: idea.title,
    description: `**Idea promoted:** ${idea.context}\n\n**Source:** ${idea.source}\n**Tags:** ${(idea.tags || []).join(', ')}`,
    deliverable_type: deliverable_type || 'other',
    deliverable_url: null,
    status: 'todo',
    priority: priority || 'normal',
    assignee: assignee || DEFAULT_ASSIGNEE,
    drive_link: null,
    github_link: null,
    project_ref: null,
    parent_id: null,
    due_date: due_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    reviewed_by_owner: false,
    review_action: null,
    ticket_type: ['agent', 'pepa'].includes(assignee || DEFAULT_ASSIGNEE) ? 'auto' : 'manual'
  };

  db.tasks.push(task);

  // Mark idea as promoted
  idea.promoted_to = task.id;
  idea.status = 'promovida';
  idea.updated_at = new Date().toISOString();
  
  saveDB(db);
  addLog('idea_promoted', `💡➡️🎯 #${idea.id} → #${task.id} ${task.title}`);
  res.json({ idea, task });
});

// API: Delete idea
app.delete('/api/ideas/:id', (req, res) => {
  const db = loadDB();
  if (!db.ideas) return res.json({ ok: true });
  db.ideas = db.ideas.filter(i => i.id !== parseInt(req.params.id));
  saveDB(db);
  res.json({ ok: true });
});

// API: Stats
app.get('/api/stats', (req, res) => {
  const db = loadDB();
  const active = db.tasks.filter(t => t.status !== 'archived');
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  res.json({
    todo: active.filter(t => t.status === 'todo').length,
    doing: active.filter(t => t.status === 'doing').length,
    done: active.filter(t => t.status === 'done').length,
    done_this_week: active.filter(t => t.status === 'done' && t.completed_at >= weekAgo).length,
    pending_review: active.filter(t => t.status === 'done' && !t.reviewed_by_owner).length,
    human_pending: active.filter(t => t.assignee === 'human' && t.status !== 'done').length,
    agent_active: active.filter(t => t.assignee === 'agent' && ['doing','todo'].includes(t.status)).length,
  });
});

// API: Task aging analytics
app.get('/api/aging', (req, res) => {
  const db = loadDB();
  const now = new Date();
  const active = db.tasks.filter(t => t.status !== 'archived');

  const aging = active.map(task => {
    const created = new Date(task.created_at);
    const lastUpdate = new Date(task.updated_at);
    const ageHours = Math.floor((now - created) / (1000 * 60 * 60));
    const staleDays = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      assignee: task.assignee,
      priority: task.priority,
      ageHours,
      staleDays,
      project_ref: task.project_ref,
      isStale: staleDays >= 2, // 2+ days without update
      isAncient: ageHours >= 168 // 1+ week old
    };
  });

  // Sort by stale days desc, then by age desc
  aging.sort((a, b) => b.staleDays - a.staleDays || b.ageHours - a.ageHours);

  const metrics = {
    stale_tasks: aging.filter(t => t.isStale && t.status !== 'done').length,
    ancient_tasks: aging.filter(t => t.isAncient && t.status !== 'done').length,
    avg_completion_hours: 0,
    oldest_active: aging.find(t => t.status !== 'done')?.ageHours || 0
  };

  // Calculate average completion time for done tasks in last 30 days
  const recentDone = active.filter(t =>
    t.status === 'done' &&
    t.completed_at &&
    new Date(t.completed_at) > new Date(now - 30*24*60*60*1000)
  );

  if (recentDone.length > 0) {
    const totalHours = recentDone.reduce((sum, task) => {
      const created = new Date(task.created_at);
      const completed = new Date(task.completed_at);
      return sum + Math.floor((completed - created) / (1000 * 60 * 60));
    }, 0);
    metrics.avg_completion_hours = Math.round(totalHours / recentDone.length);
  }

  res.json({
    metrics,
    tasks: aging.slice(0, 20) // Top 20 by staleness
  });
});

// API: Search memory files
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const memDir = path.join(WORKSPACE, 'memory');
  const results = [];
  try {
    const files = fs.readdirSync(memDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(memDir, file), 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ file, line: i + 1, text: line.trim(), context: lines.slice(Math.max(0, i-1), i+2).join(' ').trim() });
        }
      });
    }
  } catch(e) {}
  res.json(results.slice(0, 50));
});

// API: Activity log
app.get('/api/activity', (req, res) => {
  const logs = loadLogs();
  const limit = parseInt(req.query.limit) || 50;
  res.json(logs.slice(0, limit));
});

// API: Cron check-in (crons POST here to prove they ran)
// Saves a log file per execution for traceability
app.post('/api/checkin', (req, res) => {
  const { source, summary, details } = req.body;
  addLog('cron_checkin', `[${source || 'unknown'}] ${summary || 'check-in'}`);
  // Save detailed log file
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fname = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}-${source || 'unknown'}.md`;
  const logDir = path.join(__dirname, 'data', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const content = `# ${source || 'unknown'} — ${now.toISOString()}\n\n## Summary\n${summary || 'No summary'}\n\n## Details\n${details || 'No details provided'}\n`;
  fs.writeFileSync(path.join(logDir, fname), content);
  res.json({ ok: true, logFile: fname });
});

// API: List routine logs
app.get('/api/logs', (req, res) => {
  const logDir = path.join(__dirname, 'data', 'logs');
  try {
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.md') && f !== 'README.md').sort().reverse();
    const limit = parseInt(req.query.limit) || 50;
    const source = req.query.source;
    const filtered = source ? files.filter(f => f.includes(source)) : files;
    const result = filtered.slice(0, limit).map(f => ({
      file: f,
      content: fs.readFileSync(path.join(logDir, f), 'utf8')
    }));
    res.json(result);
  } catch { res.json([]); }
});

// API: Get crons from OpenClaw Gateway (with cache fallback)
let cronCache = { data: null, updatedAt: null };

app.get('/api/crons', (req, res) => {
  exec('openclaw cron list --json', { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error fetching crons:', error.message);
      if (cronCache.data) {
        console.log('Serving cached cron data from', cronCache.updatedAt);
        return res.json({ ...cronCache.data, _cached: true, _cachedAt: cronCache.updatedAt });
      }
      return res.status(500).json({ error: 'Failed to fetch cron jobs', details: error.message });
    }
    try {
      const cronData = JSON.parse(stdout);
      cronCache = { data: cronData, updatedAt: new Date().toISOString() };
      res.json(cronData);
    } catch (parseError) {
      console.error('Error parsing cron JSON:', parseError.message);
      if (cronCache.data) {
        return res.json({ ...cronCache.data, _cached: true, _cachedAt: cronCache.updatedAt });
      }
      res.status(500).json({ error: 'Failed to parse cron data', details: parseError.message });
    }
  });
});

// API: Worker Runs — Tracked run flow (start/complete/pending)
// These MUST be registered before the catch-all POST/GET routes below.

app.get('/api/worker-runs/pending', (req, res) => {
  const runs = [];
  for (const [id, run] of pendingRuns) {
    runs.push({ run_id: id, ...run });
  }
  res.json(runs);
});

app.post('/api/worker-runs/start', async (req, res) => {
  const { worker, model, ticket_id } = req.body;
  if (!worker) return res.status(400).json({ error: 'worker field required' });
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const usage = await fetchUsageSnapshot();
  const run = {
    worker,
    model: model || null,
    ticket_id: ticket_id || null,
    started_at: new Date().toISOString(),
    usage_before_pct: usage.success ? usage.session_pct : null,
  };
  pendingRuns.set(runId, run);
  res.json({ run_id: runId, ...run });
});

app.post('/api/worker-runs/:run_id/complete', async (req, res) => {
  const { run_id } = req.params;
  const pending = pendingRuns.get(run_id);
  if (!pending) return res.status(404).json({ error: 'run_id not found or already completed' });

  const { status, tokens_in, tokens_out, cost_usd, model } = req.body;
  const usage = await fetchUsageSnapshot();
  const now = new Date();
  const durationS = Math.round((now - new Date(pending.started_at)) / 1000);
  const finalModel = model || pending.model;
  const finalTokensIn = tokens_in || 0;
  const finalTokensOut = tokens_out || 0;

  // Auto-calculate cost if not provided
  let finalCost = cost_usd || 0;
  if (!finalCost && finalModel && (finalTokensIn || finalTokensOut)) {
    finalCost = calculateCost(finalModel, finalTokensIn, finalTokensOut);
  }

  const entry = {
    run_id,
    tracked: true,
    worker: pending.worker,
    ticket_id: pending.ticket_id,
    model: finalModel,
    tokens_in: finalTokensIn,
    tokens_out: finalTokensOut,
    cost_usd: finalCost,
    duration_s: durationS,
    status: status || 'ok',
    usage_before_pct: pending.usage_before_pct,
    usage_after_pct: usage.success ? usage.session_pct : null,
    timestamp: now.toISOString(),
  };

  fs.mkdirSync(path.dirname(WORKER_RUNS_FILE), { recursive: true });
  fs.appendFileSync(WORKER_RUNS_FILE, JSON.stringify(entry) + '\n');
  pendingRuns.delete(run_id);
  addLog('worker_run', `[${pending.worker}] ${entry.status} — ${finalModel || 'unknown'} (${durationS}s, $${finalCost})`);
  res.json(entry);
});

// API: Worker Runs (POST to log, GET to list)
app.post('/api/worker-runs', (req, res) => {
  const { worker, ticket_id, model, tokens_in, tokens_out, cost_usd, duration_s, status } = req.body;
  if (!worker) return res.status(400).json({ error: 'worker field required' });

  // Auto-calculate cost if not provided but model + tokens are available
  let finalCost = cost_usd || 0;
  if (!finalCost && model && (tokens_in || tokens_out)) {
    finalCost = calculateCost(model, tokens_in, tokens_out);
  }

  const entry = {
    worker,
    ticket_id: ticket_id || null,
    model: model || null,
    tokens_in: tokens_in || 0,
    tokens_out: tokens_out || 0,
    cost_usd: finalCost,
    duration_s: duration_s || 0,
    status: status || 'ok',
    timestamp: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(WORKER_RUNS_FILE), { recursive: true });
  fs.appendFileSync(WORKER_RUNS_FILE, JSON.stringify(entry) + '\n');
  addLog('worker_run', `[${worker}] ${status || 'ok'} — ${model || 'unknown'} (${duration_s || 0}s, $${finalCost})`);
  res.json(entry);
});

app.get('/api/worker-runs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  try {
    const lines = fs.readFileSync(WORKER_RUNS_FILE, 'utf8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    // Return newest first
    entries.reverse();
    res.json(entries.slice(0, limit));
  } catch {
    res.json([]);
  }
});

// Governance routes
const GOVERNANCE_FILE = path.join(__dirname, "data", "governance.json");

function loadGovernance() {
  try {
    return JSON.parse(fs.readFileSync(GOVERNANCE_FILE, "utf8"));
  } catch {
    return {
      workers: {},
      global: {
        alerts: { telegram_chat_id: "5141096765", cost_threshold_multiplier: 0.8, failure_threshold: 3 },
        defaults: {
          budget: { daily_usd: 5.0, weekly_usd: 25.0 },
          model: { default: "google/gemini-2.5-flash", fallback: "anthropic/claude-haiku-3-5-20241022" },
          retry_policy: { max_retries: 3, backoff_strategy: "exponential", initial_delay_s: 5, max_delay_s: 300 }
        }
      },
      schema_version: "1.0",
      last_updated: new Date().toISOString()
    };
  }
}

function saveGovernance(data) {
  return withWriteLock(() => {
    data.last_updated = new Date().toISOString();
    fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(data, null, 2));
    addLog("governance", "Governance rules updated");
    return data;
  });
}

app.get("/api/governance", (req, res) => {
  try {
    const governance = loadGovernance();
    res.json(governance);
  } catch (err) {
    console.error("Error loading governance:", err);
    res.status(500).json({ error: "Failed to load governance rules" });
  }
});

app.patch("/api/governance", (req, res) => {
  try {
    const current = loadGovernance();
    const updates = req.body;
    const updated = { ...current, ...updates };
    if (!updated.workers) updated.workers = {};
    if (!updated.global) updated.global = current.global || {};
    if (!updated.schema_version) updated.schema_version = "1.0";
    saveGovernance(updated);
    res.json(updated);
  } catch (err) {
    console.error("Error updating governance:", err);
    res.status(500).json({ error: "Failed to update governance rules" });
  }
});

app.get("/api/governance/worker/:name", (req, res) => {
  try {
    const governance = loadGovernance();
    const workerName = req.params.name;
    const workerConfig = governance.workers[workerName];
    if (!workerConfig) {
      const defaultConfig = { ...governance.global.defaults, enabled: true };
      res.json(defaultConfig);
    } else {
      res.json(workerConfig);
    }
  } catch (err) {
    console.error("Error loading worker governance:", err);
    res.status(500).json({ error: "Failed to load worker governance" });
  }
});

app.patch("/api/governance/worker/:name", (req, res) => {
  try {
    const governance = loadGovernance();
    const workerName = req.params.name;
    const updates = req.body;
    if (!governance.workers[workerName]) {
      governance.workers[workerName] = { ...governance.global.defaults, enabled: true };
    }
    governance.workers[workerName] = { ...governance.workers[workerName], ...updates };
    saveGovernance(governance);
    res.json(governance.workers[workerName]);
  } catch (err) {
    console.error("Error updating worker governance:", err);
    res.status(500).json({ error: "Failed to update worker governance" });
  }
});

// Initialize data directory and files on startup
function initializeData() {
  const dataDir = path.dirname(DB_FILE);
  const logsDir = path.join(__dirname, 'data', 'logs');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ tasks: [], ideas: [], nextId: 1 }, null, 2));
  }

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  }

  // One-time migration: add ticket_type if missing
  const db = loadDB();
  let migrated = false;
  for (const t of db.tasks) {
    if (!t.ticket_type) {
      t.ticket_type = ['agent', 'pepa'].includes(t.assignee) ? 'auto' : 'manual';
      migrated = true;
    }
  }
  if (migrated) {
    saveDB(db);
    console.log('Migration complete: ticket_type added to all tasks');
  }
}

// Initialize on startup
initializeData();

app.listen(PORT, HOST, () => {
  console.log(`OAS Dashboard running at http://${HOST}:${PORT}`);
  console.log(`Data directory initialized at: ${path.dirname(DB_FILE)}`);
});
