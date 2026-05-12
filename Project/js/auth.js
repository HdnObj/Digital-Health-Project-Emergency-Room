// ═══════════════════════════════════════════════════════
//  ERMS · auth.js  —  embedded DB + session + UI helpers
// ═══════════════════════════════════════════════════════
const SESSION_KEY  = 'erms_session';
const DELTA_KEY    = 'erms_delta';
const PT_USERS_KEY = 'erms_patient_users'; // extra patient accounts created by admin

// ─────────────────────────────────────────────────────────
//  BASE_DB  — single source of truth, mirrors db.json
//  Patients now carry username / password / role / avatar
// ─────────────────────────────────────────────────────────
const BASE_DB = {
  users: [
    { id:'u1', username:'admin',  password:'admin123', role:'admin',  name:'Omar Hassan',    department:'Management',        avatar:'OH' },
    { id:'u2', username:'nurse',  password:'nurse123', role:'nurse',  name:'Sara Khalil',    department:'Emergency',         avatar:'SK' },
    { id:'u3', username:'doctor', password:'doc123',   role:'doctor', name:'Dr. Ahmed Nour', department:'Emergency Medicine', avatar:'AN' }
  ],
  patients: [
    {
      id:'p1', username:'john.anderson',  password:'john@1990',    role:'patient', avatar:'JA',
      nationalId:'29901010100001', name:'John Anderson',  dob:'1990-03-15', gender:'Male',
      phone:'+20-100-000-0001', chiefComplaint:'Chest pain and shortness of breath',
      status:'in-triage',       bedId:null, assignedDoctorId:'u3', triageNurseId:'u2',
      arrivedAt:'2026-05-08T08:30:00Z'
    },
    {
      id:'p2', username:'sara.martinez',  password:'sara@1985',    role:'patient', avatar:'SM',
      nationalId:'29901010100002', name:'Sara Martinez',  dob:'1985-07-22', gender:'Female',
      phone:'+20-100-000-0002', chiefComplaint:'Severe headache and dizziness',
      status:'under-treatment', bedId:'b2', assignedDoctorId:'u3', triageNurseId:'u2',
      arrivedAt:'2026-05-08T07:15:00Z'
    },
    {
      id:'p3', username:'robert.chen',    password:'robert@1972',  role:'patient', avatar:'RC',
      nationalId:'29901010100003', name:'Robert Chen',    dob:'1972-11-08', gender:'Male',
      phone:'+20-100-000-0003', chiefComplaint:'Laceration on right forearm',
      status:'waiting',         bedId:null, assignedDoctorId:null, triageNurseId:null,
      arrivedAt:'2026-05-08T09:00:00Z'
    },
    {
      id:'p4', username:'anna.lee',       password:'anna@1995',    role:'patient', avatar:'AL',
      nationalId:'29901010100004', name:'Anna Lee',       dob:'1995-02-14', gender:'Female',
      phone:'+20-100-000-0004', chiefComplaint:'Abdominal pain',
      status:'discharged',      bedId:null, assignedDoctorId:'u3', triageNurseId:'u2',
      arrivedAt:'2026-05-08T06:00:00Z'
    },
    {
      id:'p5', username:'michael.brown',  password:'michael@1960', role:'patient', avatar:'MB',
      nationalId:'29901010100005', name:'Michael Brown',  dob:'1960-09-30', gender:'Male',
      phone:'+20-100-000-0005', chiefComplaint:'High fever 39.8°C',
      status:'waiting',         bedId:null, assignedDoctorId:null, triageNurseId:null,
      arrivedAt:'2026-05-08T09:45:00Z'
    }
  ],
  vitals: [
    { id:'v1', patientId:'p1', recordedBy:'u2', timestamp:'2026-05-08T08:45:00Z', bp:'155/95', hr:112, spo2:93,  temp:37.2, painScale:8, priority:'P1-Red'    },
    { id:'v2', patientId:'p2', recordedBy:'u2', timestamp:'2026-05-08T07:30:00Z', bp:'145/90', hr:88,  spo2:97,  temp:36.8, painScale:6, priority:'P2-Yellow' },
    { id:'v3', patientId:'p4', recordedBy:'u2', timestamp:'2026-05-08T06:15:00Z', bp:'118/76', hr:72,  spo2:99,  temp:36.5, painScale:4, priority:'P3-Green'  }
  ],
  diagnoses: [
    { id:'d1', patientId:'p2', doctorId:'u3', icd10Code:'G43.909', diagnosis:'Migraine, unspecified',
      treatment:'Sumatriptan, rest in dark room, IV fluids',
      prescriptions:[{ ndc:'0007-3521-18', drug:'Sumatriptan 50mg', dose:'1 tab at onset, repeat after 2h' }],
      outcome:null,        timestamp:'2026-05-08T08:00:00Z' },
    { id:'d2', patientId:'p4', doctorId:'u3', icd10Code:'K59.00',  diagnosis:'Constipation',
      treatment:'Lactulose, dietary advice, increase fluids',
      prescriptions:[{ ndc:'0054-3176-58', drug:'Lactulose 10g/15ml', dose:'15ml twice daily' }],
      outcome:'discharged', timestamp:'2026-05-08T07:00:00Z' }
  ],
  beds: [
    { id:'b1', ward:'ER Bay A', status:'available' },
    { id:'b2', ward:'ER Bay A', status:'occupied',    patientId:'p2' },
    { id:'b3', ward:'ER Bay A', status:'available' },
    { id:'b4', ward:'ER Bay B', status:'available' },
    { id:'b5', ward:'ER Bay B', status:'available' },
    { id:'b6', ward:'ER Bay B', status:'maintenance' },
    { id:'b7', ward:'Resus',    status:'available' },
    { id:'b8', ward:'Resus',    status:'available' }
  ],
  auditLog: [
    { id:'l1', userId:'u2', userName:'Sara Khalil',    action:'TRIAGE_COMPLETED',   target:'John Anderson',          timestamp:'2026-05-08T08:45:00Z' },
    { id:'l2', userId:'u3', userName:'Dr. Ahmed Nour', action:'DIAGNOSIS_ENTERED',  target:'Sara Martinez',          timestamp:'2026-05-08T08:00:00Z' },
    { id:'l3', userId:'u1', userName:'Omar Hassan',    action:'BED_ASSIGNED',       target:'Sara Martinez → Bay A-2',timestamp:'2026-05-08T07:35:00Z' },
    { id:'l4', userId:'u3', userName:'Dr. Ahmed Nour', action:'PATIENT_DISCHARGED', target:'Anna Lee',               timestamp:'2026-05-08T07:00:00Z' },
    { id:'l5', userId:'u2', userName:'Sara Khalil',    action:'PATIENT_REGISTERED', target:'Robert Chen',            timestamp:'2026-05-08T09:00:00Z' }
  ],
  drugs: [
    { ndc:'0069-3060-30', name:'Aspirin 81mg',          category:'Antiplatelet'     },
    { ndc:'0007-3521-18', name:'Sumatriptan 50mg',      category:'Antimigraine'     },
    { ndc:'0054-3176-58', name:'Lactulose 10g/15ml',    category:'Laxative'         },
    { ndc:'0338-0117-04', name:'Normal Saline 0.9% IV', category:'IV Fluid'         },
    { ndc:'0409-4888-34', name:'Morphine 10mg/ml',      category:'Opioid Analgesic' },
    { ndc:'0641-6003-25', name:'Metoprolol 25mg',       category:'Beta Blocker'     },
    { ndc:'0781-5064-31', name:'Amoxicillin 500mg',     category:'Antibiotic'       },
    { ndc:'0006-0963-54', name:'Ondansetron 4mg',       category:'Antiemetic'       },
    { ndc:'0143-9914-10', name:'Lorazepam 2mg/ml',      category:'Benzodiazepine'   },
    { ndc:'0074-3305-13', name:'Epinephrine 1mg/ml',    category:'Vasopressor'      }
  ],
  hospital: { name:'City General Hospital', totalBeds:8, erCapacity:40 }
};

// ═══════════════════════════════════════════════════════
//  EXTRA PATIENT ACCOUNTS  (created by admin at runtime)
//  Separate from BASE_DB so they survive delta writes
// ═══════════════════════════════════════════════════════
function getPatientUsers() {
  try { return JSON.parse(localStorage.getItem(PT_USERS_KEY) || '[]'); }
  catch(e) { return []; }
}
function savePatientUser(userObj) {
  const all = getPatientUsers();
  const idx = all.findIndex(u => u.id === userObj.id);
  if (idx >= 0) all[idx] = userObj; else all.push(userObj);
  localStorage.setItem(PT_USERS_KEY, JSON.stringify(all));
}
function deletePatientUser(id) {
  const all = getPatientUsers().filter(u => u.id !== id);
  localStorage.setItem(PT_USERS_KEY, JSON.stringify(all));
}

// ═══════════════════════════════════════════════════════
//  DB LOAD / SAVE — safe merge, never overwrites BASE_DB
// ═══════════════════════════════════════════════════════
function loadDB() {
  try {
    const base  = JSON.parse(JSON.stringify(BASE_DB));
    const raw   = localStorage.getItem(DELTA_KEY);
    if (!raw) return base;
    const delta = JSON.parse(raw);
    // Merge mutable runtime collections
    if (delta.vitals)    base.vitals    = delta.vitals;
    if (delta.diagnoses) base.diagnoses = delta.diagnoses;
    if (delta.beds)      base.beds      = delta.beds;
    if (delta.auditLog)  base.auditLog  = delta.auditLog;
    // Merge patients: runtime fields (status, bedId, etc.) come from delta,
    // but credential fields (username, password, role, avatar) always come
    // from BASE_DB so login always works even after a saveDB call
    if (delta.patients) {
      base.patients = delta.patients.map(dp => {
        const basePt = BASE_DB.patients.find(bp => bp.id === dp.id);
        if (basePt) {
          return {
            ...dp,
            username: basePt.username,
            password: basePt.password,
            role:     basePt.role,
            avatar:   basePt.avatar
          };
        }
        return dp; // newly added patient (no credentials — fine)
      });
    }
    // Merge extra staff accounts created at runtime
    if (delta.extraUsers && delta.extraUsers.length) {
      const existing = new Set(base.users.map(u => u.id));
      delta.extraUsers.forEach(u => { if (!existing.has(u.id)) base.users.push(u); });
    }
    return base;
  } catch(e) { return JSON.parse(JSON.stringify(BASE_DB)); }
}

function saveDB(db) {
  const baseIds = new Set(BASE_DB.users.map(u => u.id));
  // Strip sensitive credential fields from patients before persisting delta
  const safePatients = (db.patients || []).map(p => {
    const { username, password, role, avatar, ...rest } = p;
    return rest;
  });
  const delta = {
    patients:   safePatients,
    vitals:     db.vitals,
    diagnoses:  db.diagnoses,
    beds:       db.beds,
    auditLog:   db.auditLog,
    extraUsers: (db.users || []).filter(u => !baseIds.has(u.id))
  };
  localStorage.setItem(DELTA_KEY, JSON.stringify(delta));
}

// ═══════════════════════════════════════════════════════
//  SESSION
// ═══════════════════════════════════════════════════════
function getSession() {
  try { const s = sessionStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; }
  catch(e) { return null; }
}
function setSession(u)  { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// ═══════════════════════════════════════════════════════
//  LOGIN
//  Priority order:
//    1. Staff users  (BASE_DB.users + admin-created staff)
//    2. Base patients (BASE_DB.patients — always available)
//    3. Extra patient accounts created by admin at runtime
// ═══════════════════════════════════════════════════════
function doLogin(username, password) {
  const db = loadDB();

  // ── 1. Staff ─────────────────────────────────────────
  const staff = db.users.find(u => u.username === username && u.password === password);
  if (staff) {
    const { password: _, ...safe } = staff;
    setSession(safe);
    return { success: true, user: safe };
  }

  // ── 2. Base patients (built-in credentials from BASE_DB) ──
  // Use db.patients (which may have delta updates to status/bed etc.)
  // but match credentials from BASE_DB.patients so passwords are always fresh
  const basePt = BASE_DB.patients.find(p => p.username === username && p.password === password);
  if (basePt) {
    // Get the live patient record (may have updated status/vitals from delta)
    const livePt = db.patients.find(p => p.id === basePt.id) || basePt;
    const safe = {
      id:         basePt.id,
      role:       'patient',
      name:       basePt.name,
      username:   basePt.username,
      avatar:     basePt.avatar,
      nationalId: basePt.nationalId,
      dob:        basePt.dob,
      gender:     basePt.gender,
      phone:      basePt.phone || livePt.phone
    };
    setSession(safe);
    return { success: true, user: safe };
  }

  // ── 3. Admin-created patient accounts ─────────────────
  const ptUsers = getPatientUsers();
  const ptUser  = ptUsers.find(u => u.username === username && u.password === password);
  if (ptUser) {
    const { password: _, ...safe } = ptUser;
    setSession(safe);
    return { success: true, user: safe };
  }

  return { success: false, error: 'Invalid username or password.' };
}

function doLogout() { clearSession(); window.location.href = 'index.html'; }

function requireAuth(role) {
  const u = getSession();
  if (!u) { window.location.href = 'index.html'; return null; }
  if (role && u.role !== role) { window.location.href = u.role + '.html'; return null; }
  return u;
}

// ═══════════════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════════════
function addAuditLog(action, target) {
  const u = getSession(); if (!u) return;
  const db = loadDB();
  db.auditLog.unshift({ id:'l'+Date.now(), userId:u.id, userName:u.name, action, target, timestamp:new Date().toISOString() });
  saveDB(db);
}

// ═══════════════════════════════════════════════════════
//  FORMATTERS & UI HELPERS
// ═══════════════════════════════════════════════════════
function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}
function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
}

function statusBadge(s) {
  const m = { waiting:'badge-gray,Waiting', 'in-triage':'badge-amber,In Triage', 'in-progress':'badge-blue,In Progress', 'under-treatment':'badge-blue,Under Treatment', discharged:'badge-green,Discharged', admitted:'badge-green,Admitted', referred:'badge-red,Referred' };
  const [cls, label] = (m[s] || 'badge-gray,' + s).split(',');
  return `<span class="badge ${cls}">${label}</span>`;
}
function priorityBadge(p) {
  if (!p) return '<span class="badge badge-gray">—</span>';
  if (p.includes('P1')) return '<span class="badge badge-red">● P1 Critical</span>';
  if (p.includes('P2')) return '<span class="badge badge-amber">● P2 Urgent</span>';
  return '<span class="badge badge-green">● P3 Non-Urgent</span>';
}
function avatarColor(name) {
  const c = [['#DBEAFE','#1D4ED8'],['#DCFCE7','#15803D'],['#FEF3C7','#B45309'],['#FEE2E2','#B91C1C'],['#EDE9FE','#6D28D9']];
  return c[name.charCodeAt(0) % c.length];
}
function initials(name) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

// ─── Sidebar ───────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if (!sb || !ov) return;
  const open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if (!sb || !ov) return;
  sb.classList.remove('open');
  ov.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Toast ─────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = `<i class="ti ti-${type==='success'?'check':'alert-circle'}"></i><span>${msg}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Modal ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
