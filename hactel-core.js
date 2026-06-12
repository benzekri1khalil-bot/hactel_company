/* ═══════════════════════════════════════════════════
   HACTEL CORE v4 — Shared auth, users, tools, config
   All pages load this file first
═══════════════════════════════════════════════════ */

/* ── SYSTEM API KEYS (embedded — never shown to users) ── */
const SYS_KEYS = {
  // Hacene's key - auto-injected when Hacene logs in
  hacene: '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',
};

/* ── DEFAULT CONFIG ── */
const DEFAULT_CFG = {
  siteName: 'HACTEL', tagline: 'Professional AI Tools for IT Operations',
  email: 'benzekri1khalil@gmail.com', notifEmail: 'benzekri1khalil@gmail.com',
  freeCreds: 50, apiKey: '', apiModel: 'gpt-4o', geminiKey: '',
  socialLi:'', socialIg:'', socialTt:'', socialFb:'',
  planLinks: {starter:'',pro:'',business:''},
  promoCodes: {TEST2024:10, KHALIL:999, HACTEL20:20},
  homeScale: 100, // font scale percentage for homepage
};

function getCfg() {
  try { return Object.assign({}, DEFAULT_CFG, JSON.parse(localStorage.getItem('hk_cfg')||'{}')); }
  catch { return Object.assign({}, DEFAULT_CFG); }
}
function saveCfg(u) {
  const c = getCfg(); Object.assign(c, u);
  localStorage.setItem('hk_cfg', JSON.stringify(c)); return c;
}

/* ── USER MANAGEMENT ── */
function getUsers() { return JSON.parse(localStorage.getItem('hk_users')||'[]'); }
function saveUsers(u) { localStorage.setItem('hk_users', JSON.stringify(u)); }

function simpleHash(s) {
  let h = 0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return h.toString(16);
}

/* ── BUILT-IN ACCOUNTS (always available, not editable) ── */
const BUILTIN = {
  'benzekri1khalil@gmail.com': {
    id:'admin_khalil', name:'Khalil Benzekri', role:'admin',
    pass:'/khalil#brahim/', adminCode:'khattarasafiakhalilbenzekri@',
    credits:9999, apiKey:''
  },
  'hacene': { // login by username, not email
    id:'user_hacene', name:'Hacene', role:'manager',
    pass:'hactelcompany',
    credits:9999, apiKey: SYS_KEYS.hacene,
    autoKey: true
  }
};

function loginUser(identifier, password) {
  // Check built-in accounts first
  const builtin = BUILTIN[identifier] || Object.values(BUILTIN).find(u=>u.name===identifier);
  if (builtin) {
    if (builtin.pass !== password) return { ok:false, msg:'Wrong password.' };
    const session = { id:builtin.id, role:builtin.role, name:builtin.name, apiKey:builtin.apiKey||'' };
    sessionStorage.setItem('hk_ses', JSON.stringify(session));
    return { ok:true, user:{ ...builtin, email:identifier } };
  }
  // Check dynamic users
  const users = getUsers();
  const user = users.find(u => (u.email===identifier || u.username===identifier) && u.passwordHash===simpleHash(password));
  if (!user) return { ok:false, msg:'Wrong email/username or password.' };
  const session = { id:user.id, role:user.role, name:user.name, apiKey:user.apiKey||'' };
  sessionStorage.setItem('hk_ses', JSON.stringify(session));
  return { ok:true, user };
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('hk_ses')||'null'); }
  catch { return null; }
}

function currentUserName() { const s=getSession(); return s?s.name:''; }
function currentRole() { const s=getSession(); return s?s.role:''; }
function currentApiKey() {
  const s = getSession();
  if (!s) return '';
  // Built-in key from session (Hacene etc)
  if (s.apiKey && s.apiKey.startsWith('sk-')) return s.apiKey;
  // Admin config key
  const cfg = getCfg();
  if (cfg.apiKey && cfg.apiKey.startsWith('sk-')) return cfg.apiKey;
  // User's own saved key
  return localStorage.getItem('hk_k') || '';
}

function requireAuth(redirectTo) {
  if (!getSession()) {
    window.location.href = redirectTo || 'login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  const r = currentRole();
  if (r !== 'admin' && r !== 'manager') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem('hk_ses');
  window.location.href = 'login.html';
}

/* ── CREATE USER (admin only) ── */
function createUser(name, emailOrUsername, password, role, credits, access) {
  const users = getUsers();
  const existing = users.find(u => u.email===emailOrUsername || u.username===emailOrUsername);
  if (existing) return { ok:false, msg:'Account already exists.' };
  const user = {
    id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name,
    email: emailOrUsername.includes('@') ? emailOrUsername : '',
    username: !emailOrUsername.includes('@') ? emailOrUsername : '',
    passwordHash: simpleHash(password),
    role: role || 'user',
    access: access || 'generator',
    credits: credits || 50,
    apiKey: '',
    createdAt: new Date().toISOString(),
    history: [],
    generationCount: 0,
  };
  users.push(user);
  saveUsers(users);
  return { ok:true, user };
}

function updateUser(id, update) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id===id);
  if (idx === -1) return false;
  Object.assign(users[idx], update);
  saveUsers(users);
  return true;
}

function deleteUser(id) {
  saveUsers(getUsers().filter(u => u.id!==id));
}

/* ── MESSAGES ── */
function getMsgs() { return JSON.parse(localStorage.getItem('hk_msgs')||'[]'); }
function addMsg(from, email, subject, body) {
  const msgs = getMsgs();
  msgs.unshift({ id:'m_'+Date.now(), from, email, subject, body,
    time:new Date().toISOString(), read:false, starred:false, archived:false });
  localStorage.setItem('hk_msgs', JSON.stringify(msgs));
}
function updateMsg(id, u) {
  const msgs = getMsgs(); const i=msgs.findIndex(m=>m.id===id);
  if(i>-1){ Object.assign(msgs[i],u); localStorage.setItem('hk_msgs',JSON.stringify(msgs)); }
}
function deleteMsg(id) { localStorage.setItem('hk_msgs',JSON.stringify(getMsgs().filter(m=>m.id!==id))); }

/* ── STATS ── */
function getStats() {
  const users = getUsers();
  const msgs  = getMsgs();
  const allHist = users.flatMap(u => u.history||[]);
  const today = new Date().toDateString();
  const last7 = [];
  for(let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    last7.push({ label:d.toLocaleDateString('en',{weekday:'short'}),
      count:allHist.filter(h=>new Date(h.time).toDateString()===d.toDateString()).length });
  }
  const byCat = allHist.reduce((a,h)=>{ const k=h.category||'Other'; a[k]=(a[k]||0)+1; return a; }, {});
  return { totalUsers:users.length, totalGen:allHist.length,
    todayGen:allHist.filter(h=>new Date(h.time).toDateString()===today).length,
    unreadMsgs:msgs.filter(m=>!m.read&&!m.archived).length,
    last7, byCat };
}

/* ── TOOLS REGISTRY ── */
const TOOLS = {
  datasheet: { id:'datasheet', name:'Datasheet Generator', icon:'📄', desc:'Generate professional A4 datasheets from any product model', color:'#C9A030' },
  pdf2pptx:  { id:'pdf2pptx',  name:'PDF → PowerPoint',   icon:'📑', desc:'Convert any PDF to a professional PowerPoint presentation',   color:'#E8B84B' },
  translate: { id:'translate', name:'Document Translator', icon:'🌍', desc:'Translate any document to any language, keep or change format', color:'#F5D070' },
};

/* ── TOAST (shared) ── */
function showToast(msg, type) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(c);
  }
  const el = document.createElement('div');
  const icon = type==='ok'?'✅':type==='err'?'❌':'ℹ️';
  el.style.cssText = 'background:rgba(15,12,3,.97);color:#F5F0E8;font-size:13px;padding:12px 18px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);display:flex;align-items:center;gap:10px;border:1px solid rgba(201,160,48,.25);max-width:320px;animation:slideIn .3s ease;cursor:pointer;pointer-events:all';
  el.innerHTML = `<span style="font-size:18px;flex-shrink:0">${icon}</span>${msg}`;
  el.onclick = () => el.remove();
  c.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
