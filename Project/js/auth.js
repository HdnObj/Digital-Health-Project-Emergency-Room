// auth.js — self-contained: DB embedded, localStorage delta, session management

const SESSION_KEY = 'erms_session';
const DELTA_KEY   = 'erms_db_delta';

// ── Embedded base database (no fetch needed) ──────────────────────────────────
const BASE_DB = {
  users: [
    { id:'u1', username:'admin',  password:'admin123', role:'admin',  name:'Omar Hassan',    department:'Management',       avatar:'OH' },
    { id:'u2', username:'nurse',  password:'nurse123', role:'nurse',  name:'Sara Khalil',    department:'Emergency',        avatar:'SK' },
    { id:'u3', username:'doctor', password:'doc123',   role:'doctor', name:'Dr. Ahmed Nour', department:'Emergency Medicine',avatar:'AN' }
  ],
  patients: [
    { id:'p1', nationalId:'29901010100001', name:'John Anderson', dob:'1990-03-15', gender:'Male',   phone:'+20-100-000-0001', chiefComplaint:'Chest pain and shortness of breath', status:'in-triage',       bedId:null,  assignedDoctorId:'u3', triageNurseId:'u2', arrivedAt:'2026-05-08T08:30:00Z' },
    { id:'p2', nationalId:'29901010100002', name:'Sara Martinez',  dob:'1985-07-22', gender:'Female', phone:'+20-100-000-0002', chiefComplaint:'Severe headache and dizziness',       status:'under-treatment', bedId:'b2',  assignedDoctorId:'u3', triageNurseId:'u2', arrivedAt:'2026-05-08T07:15:00Z' },
    { id:'p3', nationalId:'29901010100003', name:'Robert Chen',    dob:'1972-11-08', gender:'Male',   phone:'+20-100-000-0003', chiefComplaint:'Laceration on right forearm',         status:'waiting',         bedId:null,  assignedDoctorId:null,  triageNurseId:null, arrivedAt:'2026-05-08T09:00:00Z' },
    { id:'p4', nationalId:'29901010100004', name:'Anna Lee',       dob:'1995-02-14', gender:'Female', phone:'+20-100-000-0004', chiefComplaint:'Abdominal pain',                     status:'discharged',      bedId:null,  assignedDoctorId:'u3', triageNurseId:'u2', arrivedAt:'2026-05-08T06:00:00Z' },
    { id:'p5', nationalId:'29901010100005', name:'Michael Brown',  dob:'1960-09-30', gender:'Male',   phone:'+20-100-000-0005', chiefComplaint:'High fever 39.8°C',                  status:'waiting',         bedId:null,  assignedDoctorId:null,  triageNurseId:null, arrivedAt:'2026-05-08T09:45:00Z' }
  ],
  vitals: [
    { id:'v1', patientId:'p1', recordedBy:'u2', timestamp:'2026-05-08T08:45:00Z', bp:'155/95', hr:112, spo2:93, temp:37.2, painScale:8, priority:'P1-Red'    },
    { id:'v2', patientId:'p2', recordedBy:'u2', timestamp:'2026-05-08T07:30:00Z', bp:'145/90', hr:88,  spo2:97, temp:36.8, painScale:6, priority:'P2-Yellow' },
    { id:'v4', patientId:'p4', recordedBy:'u2', timestamp:'2026-05-08T06:15:00Z', bp:'118/76', hr:72,  spo2:99, temp:36.5, painScale:4, priority:'P3-Green'  }
  ],
  diagnoses: [
    { id:'d1', patientId:'p2', doctorId:'u3', icd10Code:'G43.909', diagnosis:'Migraine, unspecified',    treatment:'Sumatriptan, rest in dark room, IV fluids', prescriptions:[{ ndc:'0007-3521-18', drug:'Sumatriptan 50mg',   dose:'1 tab at onset, may repeat after 2h' }], outcome:null,        timestamp:'2026-05-08T08:00:00Z' },
    { id:'d2', patientId:'p4', doctorId:'u3', icd10Code:'K59.00',  diagnosis:'Constipation',             treatment:'Lactulose, dietary advice, increase fluids', prescriptions:[{ ndc:'0054-3176-58', drug:'Lactulose 10g/15ml', dose:'15ml twice daily' }],                   outcome:'discharged', timestamp:'2026-05-08T07:00:00Z' }
  ],
  beds: [
    { id:'b1', ward:'ER Bay A',  status:'available'                    },
    { id:'b2', ward:'ER Bay A',  status:'occupied',    patientId:'p2'  },
    { id:'b3', ward:'ER Bay A',  status:'available'                    },
    { id:'b4', ward:'ER Bay B',  status:'available'                    },
    { id:'b5', ward:'ER Bay B',  status:'available'                    },
    { id:'b6', ward:'ER Bay B',  status:'maintenance'                  },
    { id:'b7', ward:'Resus',     status:'available'                    },
    { id:'b8', ward:'Resus',     status:'available'                    }
  ],
  auditLog: [
    { id:'log1', userId:'u2', userName:'Sara Khalil',    action:'TRIAGE_COMPLETED',   target:'John Anderson',           timestamp:'2026-05-08T08:45:00Z' },
    { id:'log2', userId:'u3', userName:'Dr. Ahmed Nour', action:'DIAGNOSIS_ENTERED',  target:'Sara Martinez',           timestamp:'2026-05-08T08:00:00Z' },
    { id:'log3', userId:'u1', userName:'Omar Hassan',    action:'BED_ASSIGNED',       target:'Sara Martinez → Bay A-2', timestamp:'2026-05-08T07:35:00Z' },
    { id:'log4', userId:'u3', userName:'Dr. Ahmed Nour', action:'PATIENT_DISCHARGED', target:'Anna Lee',                timestamp:'2026-05-08T07:00:00Z' },
    { id:'log5', userId:'u2', userName:'Sara Khalil',    action:'PATIENT_REGISTERED', target:'Robert Chen',             timestamp:'2026-05-08T09:00:00Z' }
  ],
  drugs: [
    { ndc:'0069-3060-30', name:'Aspirin 81mg',         category:'Antiplatelet'     },
    { ndc:'0007-3521-18', name:'Sumatriptan 50mg',     category:'Antimigraine'     },
    { ndc:'0054-3176-58', name:'Lactulose 10g/15ml',   category:'Laxative'        },
    { ndc:'0338-0117-04', name:'Normal Saline 0.9% IV',category:'IV Fluid'        },
    { ndc:'0409-4888-34', name:'Morphine 10mg/ml',     category:'Opioid Analgesic' },
    { ndc:'0641-6003-25', name:'Metoprolol 25mg',      category:'Beta Blocker'     },
    { ndc:'0781-5064-31', name:'Amoxicillin 500mg',    category:'Antibiotic'      },
    { ndc:'0006-0963-54', name:'Ondansetron 4mg',      category:'Antiemetic'      },
    { ndc:'0143-9914-10', name:'Lorazepam 2mg/ml',     category:'Benzodiazepine'  },
    { ndc:'0074-3305-13', name:'Epinephrine 1mg/ml',   category:'Vasopressor'     }
  ],
  hospital:{ name:'City General Hospital', totalBeds:8, erCapacity:40 }
};

// ── DB helpers ────────────────────────────────────────────────────────────────
function loadDB() {
  const delta = localStorage.getItem(DELTA_KEY);
  if (!delta) return JSON.parse(JSON.stringify(BASE_DB));
  const d = JSON.parse(delta);
  return { ...JSON.parse(JSON.stringify(BASE_DB)), ...d };
}

function saveDB(db) {
  const delta = {
    patients: db.patients,
    vitals:   db.vitals,
    diagnoses:db.diagnoses,
    beds:     db.beds,
    auditLog: db.auditLog
  };
  localStorage.setItem(DELTA_KEY, JSON.stringify(delta));
}

// ── Session helpers ───────────────────────────────────────────────────────────
function getSession() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}
function setSession(user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession()   { sessionStorage.removeItem(SESSION_KEY); }

// ── Auth ──────────────────────────────────────────────────────────────────────
function doLogin(username, password) {
  const db   = loadDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return { success: false, error: 'Invalid username or password. Please try again.' };
  const { password: _, ...safeUser } = user;
  setSession(safeUser);
  return { success: true, user: safeUser };
}

function doLogout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── Route guard ───────────────────────────────────────────────────────────────
function requireAuth(requiredRole) {
  const user = getSession();
  if (!user) { window.location.href = 'index.html'; return null; }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role + '.html'; return null;
  }
  return user;
}

// ── Audit log ─────────────────────────────────────────────────────────────────
function addAuditLog(action, target) {
  const user = getSession();
  const db   = loadDB();
  db.auditLog.unshift({ id:'log'+Date.now(), userId:user.id, userName:user.name, action, target, timestamp:new Date().toISOString() });
  saveDB(db);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function statusBadge(status) {
  const map = {
    'waiting':         ['badge-gray',  'Waiting'],
    'in-triage':       ['badge-amber', 'In Triage'],
    'in-progress':     ['badge-blue',  'In Progress'],
    'under-treatment': ['badge-blue',  'Under Treatment'],
    'discharged':      ['badge-green', 'Discharged'],
    'admitted':        ['badge-green', 'Admitted'],
    'referred':        ['badge-red',   'Referred']
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function priorityBadge(priority) {
  if (!priority) return '<span class="badge badge-gray">—</span>';
  if (priority.includes('P1')) return '<span class="badge badge-red">● P1 Critical</span>';
  if (priority.includes('P2')) return '<span class="badge badge-amber">● P2 Urgent</span>';
  return '<span class="badge badge-green">● P3 Non-Urgent</span>';
}

function avatarColor(name) {
  const colors = [['#DBEAFE','#1D4ED8'],['#DCFCE7','#15803D'],['#FEF3C7','#B45309'],['#FEE2E2','#B91C1C'],['#EDE9FE','#6D28D9']];
  return colors[name.charCodeAt(0) % colors.length];
}
