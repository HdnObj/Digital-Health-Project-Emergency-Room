// ═══════════════════════════════════════════════════════════════
//  patient.js  —  Patient Portal logic
//  Depends on: auth.js (loadDB, getSession, requireAuth, etc.)
// ═══════════════════════════════════════════════════════════════

'use strict';

/* ── State ────────────────────────────────────────────────── */
let db          = null;
let currentUser = null;   // from auth.js session
let patient     = null;   // the matched patient record

/* ── Bootstrap ────────────────────────────────────────────── */
function initPatient() {
  currentUser = requireAuth('patient');
  if (!currentUser) return;

  db = loadDB();

  // Find this patient's record by nationalId stored in session
  patient = db.patients.find(p => p.nationalId === currentUser.nationalId);

  if (!patient) {
    // Patient is registered in system but no ER record yet
    renderNoRecord();
  }

  // Populate topbar & sidebar identity
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('topbarAvatar').textContent  = initials;

  // Render all panels
  renderHero();
  renderStatusRow();
  renderOverview();
  renderVitals();
  renderDiagnosis();
  renderVisitHistory();
  renderPersonalInfo();
}

/* ── Hero banner ──────────────────────────────────────────── */
function renderHero() {
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const [bg, fc] = avatarColor(currentUser.name);

  document.getElementById('heroAvatar').textContent  = initials;
  document.getElementById('heroAvatar').style.background = bg;
  document.getElementById('heroAvatar').style.color  = fc;
  document.getElementById('heroName').textContent    = currentUser.name;
  document.getElementById('heroId').textContent      = 'National ID: ' + currentUser.nationalId;

  const v = patient ? db.vitals.find(x => x.patientId === patient.id) : null;
  const chips = document.getElementById('heroChips');
  chips.innerHTML = '';

  if (patient) {
    chips.innerHTML += `<span class="hero-chip"><i class="ti ti-calendar"></i>${timeAgo(patient.arrivedAt)}</span>`;
    chips.innerHTML += `<span class="hero-chip"><i class="ti ti-building-hospital"></i>${db.hospital?.name || 'City General'}</span>`;
    if (v) {
      chips.innerHTML += `<span class="hero-chip" style="background:${priChipColor(v.priority)}">${priLabel(v.priority)}</span>`;
    }
  } else {
    chips.innerHTML = `<span class="hero-chip"><i class="ti ti-info-circle"></i>No active ER visit</span>`;
  }
}

function priChipColor(pri) {
  if (pri === 'P1-Red')    return 'rgba(239,68,68,.25)';
  if (pri === 'P2-Yellow') return 'rgba(245,158,11,.25)';
  return 'rgba(34,197,94,.2)';
}
function priLabel(pri) {
  if (pri === 'P1-Red')    return '🔴 P1 Critical';
  if (pri === 'P2-Yellow') return '🟡 P2 Urgent';
  return '🟢 P3 Non-Urgent';
}

/* ── Status summary row ───────────────────────────────────── */
function renderStatusRow() {
  const v  = patient ? db.vitals.find(x => x.patientId === patient.id)  : null;
  const dx = patient ? db.diagnoses.find(x => x.patientId === patient.id): null;
  const nurse  = (patient?.triageNurseId)    ? db.users?.find(u=>u.id===patient.triageNurseId)?.name    || '—' : '—';
  const doctor = (patient?.assignedDoctorId) ? db.users?.find(u=>u.id===patient.assignedDoctorId)?.name || '—' : '—';

  // Status
  const statusEl = document.getElementById('sc-status');
  if (patient) {
    statusEl.innerHTML = statusBadge(patient.status);
  } else {
    statusEl.innerHTML = '<span class="badge badge-gray">No active visit</span>';
  }

  // Priority
  const priEl = document.getElementById('sc-priority');
  priEl.innerHTML = v ? priorityBadge(v.priority) : '<span class="badge badge-gray">—</span>';

  // Assigned doctor
  document.getElementById('sc-doctor').textContent = doctor;

  // Bed
  const bedEl = document.getElementById('sc-bed');
  if (patient?.bedId) {
    const bed = db.beds.find(b => b.id === patient.bedId);
    bedEl.textContent = bed ? `${bed.ward}` : 'Assigned';
  } else {
    bedEl.textContent = 'Unassigned';
  }
}

/* ── Overview panel ───────────────────────────────────────── */
function renderOverview() {
  const el = document.getElementById('overviewContent');
  if (!patient) { renderNoRecordInEl(el); return; }

  const v    = db.vitals.find(x => x.patientId === patient.id);
  const dx   = db.diagnoses.find(x => x.patientId === patient.id);
  const nurse= patient.triageNurseId ? db.users?.find(u=>u.id===patient.triageNurseId)?.name || '—' : '—';
  const doc  = patient.assignedDoctorId ? db.users?.find(u=>u.id===patient.assignedDoctorId)?.name || '—' : '—';

  el.innerHTML = `
    <!-- Chief complaint notice -->
    <div class="notice-bar notice-info" style="margin-bottom:14px">
      <i class="ti ti-stethoscope"></i>
      <div><strong>Chief Complaint:</strong> ${patient.chiefComplaint}</div>
    </div>

    <!-- Quick info tiles -->
    <div class="info-grid" style="margin-bottom:16px">
      <div class="info-tile"><div class="info-tile-lbl">Current Status</div><div class="info-tile-val">${statusBadge(patient.status)}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Triage Priority</div><div class="info-tile-val">${v ? priorityBadge(v.priority) : '<span class="badge badge-gray">Not yet triaged</span>'}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Triage Nurse</div><div class="info-tile-val">${nurse}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Assigned Doctor</div><div class="info-tile-val">${doc}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Arrived</div><div class="info-tile-val">${fmtDate(patient.arrivedAt)}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Bed / Location</div><div class="info-tile-val">${patient.bedId ? (db.beds.find(b=>b.id===patient.bedId)?.ward || '—') : 'Unassigned'}</div></div>
    </div>

    ${dx ? `
      <!-- Diagnosis summary card -->
      <div class="result-card">
        <div class="result-card-accent acc-blue"></div>
        <div class="result-card-head">
          <div class="result-card-icon" style="background:var(--patient-50);color:var(--patient-600)"><i class="ti ti-microscope"></i></div>
          <div>
            <div class="result-card-title">${dx.diagnosis}</div>
            <div class="result-card-date"><code style="background:#F1F5F9;padding:1px 6px;border-radius:4px;font-size:11px">${dx.icd10Code}</code> · ${timeAgo(dx.timestamp)}</div>
          </div>
        </div>
        <div class="result-card-body">
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:12px">${dx.treatment}</div>
          ${dx.outcome ? `<div>${statusBadge(dx.outcome)}</div>` : ''}
        </div>
      </div>` : `
      <div class="notice-bar notice-warning">
        <i class="ti ti-clock"></i>
        <div>Your case is being assessed by the clinical team. Diagnosis will appear here once completed.</div>
      </div>`}`;
}

/* ── Vitals panel ─────────────────────────────────────────── */
function renderVitals() {
  const el = document.getElementById('vitalsContent');
  if (!patient) { renderNoRecordInEl(el); return; }

  const v = db.vitals.find(x => x.patientId === patient.id);
  if (!v) {
    el.innerHTML = `<div class="notice-bar notice-info"><i class="ti ti-info-circle"></i>Your vital signs have not been recorded yet. Please wait for the triage nurse.</div>`;
    return;
  }

  const fhr  = v.hr   > 120 ? 'vtf-danger' : v.hr   > 100 ? 'vtf-warn' : 'vtf-ok';
  const fsp  = v.spo2 < 90  ? 'vtf-danger' : v.spo2 < 95  ? 'vtf-warn' : 'vtf-ok';
  const ftp  = v.temp > 39  ? 'vtf-danger' : v.temp > 38  ? 'vtf-warn' : 'vtf-ok';
  const fhr2 = v.hr   > 120 ? '⚠ High'     : v.hr   > 100 ? '↑ Elevated' : '✓ Normal';
  const fsp2 = v.spo2 < 90  ? '⚠ Critical' : v.spo2 < 95  ? '↓ Low'  : '✓ Normal';
  const ftp2 = v.temp > 39  ? '⚠ High'     : v.temp > 38  ? '↑ Elevated' : '✓ Normal';

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--text-muted)">Recorded: ${fmtDate(v.timestamp)}</div>
      ${priorityBadge(v.priority)}
    </div>
    <div class="vitals-row">
      <div class="vital-tile">
        <div class="vital-tile-lbl">Blood Pressure</div>
        <div class="vital-tile-val">${v.bp}</div>
        <div class="vital-tile-unit">mmHg</div>
      </div>
      <div class="vital-tile">
        <div class="vital-tile-lbl">Heart Rate</div>
        <div class="vital-tile-val" style="color:${v.hr>120?'var(--red-600)':'inherit'}">${v.hr}</div>
        <div class="vital-tile-unit">bpm</div>
        <div class="vital-tile-flag ${fhr}">${fhr2}</div>
      </div>
      <div class="vital-tile">
        <div class="vital-tile-lbl">SpO₂</div>
        <div class="vital-tile-val" style="color:${v.spo2<90?'var(--red-600)':'inherit'}">${v.spo2}%</div>
        <div class="vital-tile-flag ${fsp}">${fsp2}</div>
      </div>
      <div class="vital-tile">
        <div class="vital-tile-lbl">Temperature</div>
        <div class="vital-tile-val" style="color:${v.temp>39?'var(--amber-600)':'inherit'}">${v.temp}</div>
        <div class="vital-tile-unit">°C</div>
        <div class="vital-tile-flag ${ftp}">${ftp2}</div>
      </div>
      <div class="vital-tile">
        <div class="vital-tile-lbl">Pain Scale</div>
        <div class="vital-tile-val">${v.painScale}</div>
        <div class="vital-tile-unit">/10</div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Pain Level Visual</div>
      <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
        <div style="height:100%;border-radius:99px;width:${v.painScale*10}%;background:${v.painScale>=8?'var(--red-500)':v.painScale>=5?'var(--amber-500)':'var(--green-500)'};transition:width .6s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px"><span>No pain</span><span>Worst pain</span></div>
    </div>`;
}

/* ── Diagnosis & Prescriptions panel ─────────────────────── */
function renderDiagnosis() {
  const el = document.getElementById('diagnosisContent');
  if (!patient) { renderNoRecordInEl(el); return; }

  const dx = db.diagnoses.find(x => x.patientId === patient.id);
  if (!dx) {
    el.innerHTML = `<div class="notice-bar notice-info"><i class="ti ti-clock"></i>Your diagnosis has not been entered yet. The doctor will update this once your assessment is complete.</div>`;
    return;
  }

  const rxHTML = dx.prescriptions.map(rx => `
    <div class="rx-item">
      <i class="ti ti-pill"></i>
      <div>
        <div class="rx-drug">${rx.drug} <span class="rx-ndc">${rx.ndc}</span></div>
        <div class="rx-dose">${rx.dose}</div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <!-- Diagnosis card -->
    <div class="result-card" style="margin-bottom:14px">
      <div class="result-card-accent acc-blue"></div>
      <div class="result-card-head">
        <div class="result-card-icon" style="background:var(--patient-50);color:var(--patient-600)"><i class="ti ti-microscope"></i></div>
        <div style="flex:1;min-width:0">
          <div class="result-card-title">${dx.diagnosis}</div>
          <div class="result-card-date">ICD-10: <code style="background:#F1F5F9;padding:1px 6px;border-radius:4px">${dx.icd10Code}</code> · ${fmtDate(dx.timestamp)}</div>
        </div>
        ${dx.outcome ? statusBadge(dx.outcome) : ''}
      </div>
      <div class="result-card-body">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Treatment Plan</div>
        <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.75">${dx.treatment}</div>
      </div>
    </div>

    <!-- Prescriptions -->
    ${dx.prescriptions.length ? `
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">
      Prescriptions (${dx.prescriptions.length})
    </div>
    ${rxHTML}` : `<div class="notice-bar notice-info"><i class="ti ti-info-circle"></i>No prescriptions issued for this visit.</div>`}

    <!-- Outcome -->
    ${dx.outcome ? `
    <div class="notice-bar notice-success" style="margin-top:14px;margin-bottom:0">
      <i class="ti ti-circle-check"></i>
      <div><strong>Outcome:</strong> ${dx.outcome.charAt(0).toUpperCase()+dx.outcome.slice(1)}</div>
    </div>` : ''}`;
}

/* ── Visit history panel ──────────────────────────────────── */
function renderVisitHistory() {
  const el = document.getElementById('historyContent');
  if (!patient) { renderNoRecordInEl(el); return; }

  const v  = db.vitals.find(x => x.patientId === patient.id);
  const dx = db.diagnoses.find(x => x.patientId === patient.id);

  // Build a synthetic timeline from what we know
  const events = [];
  events.push({ icon:'ti-door-enter', cls:'vd-blue', title:'Patient Arrived', desc:`Registered with complaint: "${patient.chiefComplaint}"`, ts: patient.arrivedAt });
  if (v) {
    events.push({ icon:'ti-stethoscope', cls:'vd-amber', title:'Triage Completed', desc:`Priority: ${priLabel(v.priority)} · Nurse: ${db.users?.find(u=>u.id===v.recordedBy)?.name||'—'}`, ts: v.timestamp });
  }
  if (patient.bedId) {
    const bed = db.beds.find(b => b.id === patient.bedId);
    events.push({ icon:'ti-bed', cls:'vd-blue', title:'Bed Assigned', desc:`${bed?.ward || 'ER Bay'}`, ts: patient.arrivedAt });
  }
  if (dx) {
    events.push({ icon:'ti-microscope', cls:'vd-green', title:'Diagnosis Recorded', desc:`${dx.diagnosis} (${dx.icd10Code})`, ts: dx.timestamp });
  }
  if (dx?.outcome === 'discharged') {
    events.push({ icon:'ti-circle-check', cls:'vd-green', title:'Patient Discharged', desc:'Clinical visit concluded.', ts: dx.timestamp });
  }
  if (dx?.outcome === 'admitted') {
    events.push({ icon:'ti-building-hospital', cls:'vd-amber', title:'Admitted to Ward', desc:'Patient transferred for continued care.', ts: dx.timestamp });
  }

  if (!events.length) {
    el.innerHTML = `<div class="empty-pt"><i class="ti ti-history"></i><p>No visit events recorded yet.</p></div>`;
    return;
  }

  el.innerHTML = '<div class="visit-timeline">' +
    events.map((e, i) => `
      <div class="visit-item">
        <div class="visit-dot-col">
          <div class="visit-dot ${e.cls}"><i class="ti ${e.icon}" style="font-size:15px"></i></div>
          ${i < events.length - 1 ? '<div class="visit-line"></div>' : ''}
        </div>
        <div class="visit-content">
          <div class="visit-title">${e.title}</div>
          <div class="visit-date">${fmtDate(e.ts)}</div>
          <div class="visit-desc">${e.desc}</div>
        </div>
      </div>`).join('') +
    '</div>';
}

/* ── Personal information panel ───────────────────────────── */
function renderPersonalInfo() {
  const el = document.getElementById('personalContent');
  el.innerHTML = `
    <div class="info-grid">
      <div class="info-tile"><div class="info-tile-lbl">Full Name</div><div class="info-tile-val">${currentUser.name}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">National ID</div><div class="info-tile-val" style="font-family:monospace">${currentUser.nationalId}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Date of Birth</div><div class="info-tile-val">${patient?.dob || currentUser.dob || '—'}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Gender</div><div class="info-tile-val">${patient?.gender || currentUser.gender || '—'}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Phone</div><div class="info-tile-val">${patient?.phone || currentUser.phone || '—'}</div></div>
      <div class="info-tile"><div class="info-tile-lbl">Department</div><div class="info-tile-val">${db.hospital?.name || 'City General Hospital'}</div></div>
    </div>
    <div class="notice-bar notice-info" style="margin-top:14px;margin-bottom:0">
      <i class="ti ti-lock"></i>
      <div>Your personal information is managed by the hospital administration. Contact the front desk for any corrections.</div>
    </div>`;
}

/* ── No record state ──────────────────────────────────────── */
function renderNoRecord() {
  // Silently handled per-panel
}
function renderNoRecordInEl(el) {
  el.innerHTML = `
    <div class="empty-pt">
      <i class="ti ti-clipboard-x"></i>
      <p>No ER visit record found for your account. Please check in at the front desk.</p>
    </div>`;
}

/* ── Panel navigation ─────────────────────────────────────── */
const PATIENT_PANELS = {
  overview:  ['My Overview',       'Your current visit summary'],
  vitals:    ['Vital Signs',       'Your triage vitals recorded by the nurse'],
  diagnosis: ['Diagnosis & Rx',    'Your diagnosis, treatment plan, and prescriptions'],
  history:   ['Visit Timeline',    'Chronological events during your ER visit'],
  personal:  ['Personal Info',     'Your registered personal information'],
};

function showPatientPanel(id) {
  if (window.innerWidth <= 768) closeSidebar();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const link = document.querySelector(`.sidebar-link[onclick*="'${id}'"]`);
  if (link) link.classList.add('active');
  const [t, s] = PATIENT_PANELS[id] || ['Panel', ''];
  document.getElementById('panelTitle').textContent = t;
  document.getElementById('panelSub').textContent   = s;
}

/* ── Sidebar toggle ───────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
  document.body.style.overflow = document.getElementById('sidebar').classList.contains('open') ? 'hidden' : '';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}
