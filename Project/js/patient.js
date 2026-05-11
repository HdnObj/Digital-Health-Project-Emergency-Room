/**
 * patient.js
 * ─────────────────────────────────────────────────────
 * ERMS Patient Portal
 *
 * Authentication strategy:
 *   Patients log in via the shared login page (index.html).
 *   Their record in db.users has role = 'patient' and a
 *   `nationalId` field that links to their entry in db.patients.
 *
 *   If a patient account doesn't exist in db.users yet, the
 *   system falls back to matching by nationalId stored in the
 *   session (set when admin/nurse registers them).
 * ─────────────────────────────────────────────────────
 */

'use strict';

let db          = null;
let currentUser = null;   // from auth.js session
let patient     = null;   // db.patients entry

/* ════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════ */
function init() {
  currentUser = requireAuth('patient');
  if (!currentUser) return;

  db = loadDB();

  /* Find matching patient record — by nationalId field on user
     or by id if the user IS the patient record (some setups). */
  patient = db.patients.find(p =>
    p.nationalId === currentUser.nationalId ||
    p.id         === currentUser.patientId  ||
    p.nationalId === currentUser.username
  );

  if (!patient) {
    // Fallback: look for a patient whose name matches the user name
    patient = db.patients.find(p => p.name === currentUser.name);
  }

  if (!patient) {
    alert('No patient record found for your account. Please contact the front desk.');
    doLogout();
    return;
  }

  /* Personalise the UI */
  const initials = patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = patient.name.split(' ')[0]; // first name only
  document.getElementById('topbarAvatar').textContent  = initials;

  renderAll();
}

function renderAll() {
  renderOverview();
  renderVitals();
  renderDiagnosis();
  renderPersonalInfo();
}


/* ════════════════════════════════════════════════════
   PANEL 1: OVERVIEW
   ════════════════════════════════════════════════════ */
function renderOverview() {
  renderStatusBanner();
  renderQuickCards();
  renderJourneyTimeline();
}

/* Status Banner */
function renderStatusBanner() {
  const banner  = document.getElementById('statusBanner');
  const icon    = document.getElementById('statusIcon');
  const valEl   = document.getElementById('statusValue');
  const descEl  = document.getElementById('statusDesc');
  const badgeEl = document.getElementById('statusBadge');

  const STATUS_MAP = {
    'waiting': {
      label : 'Waiting for Triage',
      desc  : 'You are in the queue. A nurse will call you shortly.',
      cls   : 'status-banner--waiting',
      icon  : 'ti-clock',
      badge : '<span class="badge badge-gray">Waiting</span>',
    },
    'in-triage': {
      label : 'In Triage Assessment',
      desc  : 'Your nurse is recording your vital signs and priority.',
      cls   : 'status-banner--triage',
      icon  : 'ti-stethoscope',
      badge : '<span class="badge badge-amber">In Triage</span>',
    },
    'under-treatment': {
      label : 'Under Treatment',
      desc  : 'You are being examined and treated by a doctor.',
      cls   : 'status-banner--treatment',
      icon  : 'ti-user-heart',
      badge : '<span class="badge badge-blue">Under Treatment</span>',
    },
    'in-progress': {
      label : 'Under Treatment',
      desc  : 'You are being examined and treated by a doctor.',
      cls   : 'status-banner--treatment',
      icon  : 'ti-user-heart',
      badge : '<span class="badge badge-blue">Under Treatment</span>',
    },
    'discharged': {
      label : 'Discharged',
      desc  : 'Your ER visit is complete. Please follow your doctor\'s instructions.',
      cls   : 'status-banner--discharged',
      icon  : 'ti-circle-check',
      badge : '<span class="badge badge-green">Discharged</span>',
    },
    'admitted': {
      label : 'Admitted to Ward',
      desc  : 'You have been admitted for further care. Please follow ward staff instructions.',
      cls   : 'status-banner--admitted',
      icon  : 'ti-building-hospital',
      badge : '<span class="badge badge-purple">Admitted</span>',
    },
    'referred': {
      label : 'Referred to Specialist',
      desc  : 'Your doctor has referred you to a specialist for follow-up.',
      cls   : 'status-banner--referred',
      icon  : 'ti-arrow-forward-up',
      badge : '<span class="badge badge-blue">Referred</span>',
    },
  };

  const info = STATUS_MAP[patient.status] || STATUS_MAP['waiting'];

  // Remove old modifier classes
  banner.className = banner.className.replace(/status-banner--\S+/g, '').trim();
  banner.classList.add('pt-status-banner', info.cls);

  icon.innerHTML  = `<i class="ti ${info.icon}"></i>`;
  valEl.textContent  = info.label;
  descEl.textContent = info.desc;
  badgeEl.innerHTML  = info.badge;
}

/* Quick Cards */
function renderQuickCards() {
  const vitals = db.vitals.find(v => v.patientId === patient.id);
  const nurse  = patient.triageNurseId
    ? db.users.find(u => u.id === patient.triageNurseId)?.name || '—'
    : '—';
  const doctor = patient.assignedDoctorId
    ? db.users.find(u => u.id === patient.assignedDoctorId)?.name || '—'
    : '—';
  const bed = patient.bedId
    ? (db.beds.find(b => b.id === patient.bedId)?.ward || '—')
    : '—';

  document.getElementById('qBed').textContent    = bed;
  document.getElementById('qNurse').textContent  = nurse;
  document.getElementById('qDoctor').textContent = doctor;
  document.getElementById('qTime').textContent   = patient.arrivedAt
    ? timeAgo(patient.arrivedAt)
    : '—';
}

/* Journey Timeline */
function renderJourneyTimeline() {
  const steps = [
    {
      id    : 'arrived',
      icon  : 'ti-door-enter',
      title : 'Arrived at ER',
      desc  : patient.arrivedAt ? `Checked in ${timeAgo(patient.arrivedAt)}` : 'Arrival registered',
      done  : true,
    },
    {
      id    : 'triage',
      icon  : 'ti-stethoscope',
      title : 'Triage Assessment',
      desc  : 'Nurse records your vitals and priority level',
      done  : ['in-triage','under-treatment','in-progress','discharged','admitted','referred'].includes(patient.status),
    },
    {
      id    : 'exam',
      icon  : 'ti-user-heart',
      title : 'Doctor Examination',
      desc  : 'Doctor examines you and records diagnosis',
      done  : ['discharged','admitted','referred'].includes(patient.status),
    },
    {
      id    : 'outcome',
      icon  : 'ti-circle-check',
      title : getOutcomeStepTitle(),
      desc  : getOutcomeStepDesc(),
      done  : ['discharged','admitted','referred'].includes(patient.status),
      active: ['discharged','admitted','referred'].includes(patient.status),
    },
  ];

  const tl = document.getElementById('journeyTimeline');
  tl.innerHTML = steps.map((step, idx) => {
    const isLast   = idx === steps.length - 1;
    const dotClass = step.done
      ? (step.active ? 'journey-dot journey-dot--active' : 'journey-dot journey-dot--done')
      : 'journey-dot';
    return `
      <div class="journey-step">
        <div class="journey-left">
          <div class="${dotClass}">
            <i class="ti ${step.icon}"></i>
          </div>
          ${!isLast ? '<div class="journey-line' + (step.done ? ' journey-line--done' : '') + '"></div>' : ''}
        </div>
        <div class="journey-content ${step.done ? '' : 'journey-content--pending'}">
          <div class="journey-title">${step.title}</div>
          <div class="journey-desc">${step.desc}</div>
        </div>
      </div>`;
  }).join('');
}

function getOutcomeStepTitle() {
  switch (patient.status) {
    case 'discharged': return 'Discharged Home';
    case 'admitted'  : return 'Admitted to Ward';
    case 'referred'  : return 'Referred to Specialist';
    default          : return 'Outcome';
  }
}
function getOutcomeStepDesc() {
  switch (patient.status) {
    case 'discharged': return 'Your ER visit is complete — follow doctor\'s instructions';
    case 'admitted'  : return 'Admitted for further inpatient care';
    case 'referred'  : return 'Specialist referral issued';
    default          : return 'Pending doctor decision';
  }
}


/* ════════════════════════════════════════════════════
   PANEL 2: VITALS
   ════════════════════════════════════════════════════ */
function renderVitals() {
  const vitals = db.vitals.find(v => v.patientId === patient.id);
  const grid   = document.getElementById('vitalsDetailGrid');
  const block  = document.getElementById('priorityBlockContent');

  if (!vitals) {
    grid.innerHTML  = '';
    block.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-stethoscope empty-state-icon"></i>
        <div>No vitals recorded yet.</div>
        <div class="empty-state-sub">A nurse will record your vital signs during triage.</div>
      </div>`;
    return;
  }

  /* Priority banner */
  const priorityInfo = getPriorityInfo(vitals.priority);
  block.innerHTML = `
    <div class="pt-priority-display ${priorityInfo.cls}">
      <div class="pt-priority-emoji">${priorityInfo.emoji}</div>
      <div>
        <div class="pt-priority-level">${vitals.priority}</div>
        <div class="pt-priority-desc">${priorityInfo.desc}</div>
      </div>
    </div>`;

  /* Vital sign cards */
  const cards = [
    {
      label : 'Blood Pressure',
      value : vitals.bp,
      unit  : 'mmHg',
      icon  : 'ti-gauge',
      status: evalBP(vitals.bp),
    },
    {
      label : 'Heart Rate',
      value : vitals.hr,
      unit  : 'bpm',
      icon  : 'ti-heart',
      status: vitals.hr > 120 ? 'critical' : vitals.hr > 100 ? 'elevated' : 'normal',
    },
    {
      label : 'Oxygen Saturation',
      value : vitals.spo2 + '%',
      unit  : 'SpO₂',
      icon  : 'ti-lungs',
      status: vitals.spo2 < 90 ? 'critical' : vitals.spo2 < 95 ? 'elevated' : 'normal',
    },
    {
      label : 'Body Temperature',
      value : vitals.temp + '°',
      unit  : '°C',
      icon  : 'ti-thermometer',
      status: vitals.temp > 39 ? 'critical' : vitals.temp > 38 ? 'elevated' : 'normal',
    },
    {
      label : 'Pain Level',
      value : vitals.painScale + '/10',
      unit  : 'Self-reported',
      icon  : 'ti-mood-sad',
      status: vitals.painScale >= 8 ? 'critical' : vitals.painScale >= 5 ? 'elevated' : 'normal',
    },
    {
      label : 'Priority Level',
      value : vitals.priority.split('-')[0],
      unit  : vitals.priority.split('-')[1] || '',
      icon  : 'ti-flag',
      status: vitals.priority.startsWith('P1') ? 'critical' : vitals.priority.startsWith('P2') ? 'elevated' : 'normal',
    },
  ];

  grid.innerHTML = cards.map(c => {
    const [statusLabel, statusIcon] = getStatusLabel(c.status);
    return `
      <div class="vital-detail-card vital-detail-card--${c.status}">
        <div class="vital-detail-top">
          <div class="vital-detail-icon vital-detail-icon--${c.status}">
            <i class="ti ${c.icon}"></i>
          </div>
          <div class="vital-detail-status vital-detail-status--${c.status}">
            ${statusIcon} ${statusLabel}
          </div>
        </div>
        <div class="vital-detail-label">${c.label}</div>
        <div class="vital-detail-value vital-detail-value--${c.status}">${c.value}</div>
        <div class="vital-detail-unit">${c.unit}</div>
      </div>`;
  }).join('');
}

function getPriorityInfo(priority) {
  if (priority.startsWith('P1')) return { emoji: '🔴', cls: 'priority-critical', desc: 'Critical — immediate care required' };
  if (priority.startsWith('P2')) return { emoji: '🟡', cls: 'priority-urgent',   desc: 'Urgent — high priority care' };
  return                                 { emoji: '🟢', cls: 'priority-routine',  desc: 'Non-urgent — routine assessment' };
}

function evalBP(bp) {
  if (!bp || !bp.includes('/')) return 'normal';
  const sys = parseInt(bp.split('/')[0]);
  if (sys > 160 || sys < 90) return 'critical';
  if (sys > 130)             return 'elevated';
  return 'normal';
}

function getStatusLabel(status) {
  switch (status) {
    case 'critical': return ['Critical',  '⚠'];
    case 'elevated': return ['Elevated',  '↑'];
    default:         return ['Normal',    '✓'];
  }
}


/* ════════════════════════════════════════════════════
   PANEL 3: DIAGNOSIS & MEDICATIONS
   ════════════════════════════════════════════════════ */
function renderDiagnosis() {
  const dx        = db.diagnoses.find(d => d.patientId === patient.id);
  const dxContent = document.getElementById('diagnosisContent');
  const mxContent = document.getElementById('medicationsContent');
  const badgeEl   = document.getElementById('dxOutcomeBadge');
  const rxCount   = document.getElementById('rxCount');

  if (!dx) {
    dxContent.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-notes-medical empty-state-icon"></i>
        <div>No diagnosis recorded yet.</div>
        <div class="empty-state-sub">Your doctor will update this after your examination.</div>
      </div>`;
    mxContent.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-pill empty-state-icon"></i>
        <div>No medications prescribed yet.</div>
      </div>`;
    rxCount.style.display = 'none';
    badgeEl.innerHTML = '';
    return;
  }

  /* Outcome badge */
  badgeEl.innerHTML = statusBadge(dx.outcome || 'pending');

  /* Diagnosis info */
  dxContent.innerHTML = `
    <div class="dx-icd-row">
      <span class="dx-icd-tag">${dx.icd10Code}</span>
      <span class="dx-doctor">
        <i class="ti ti-user-heart"></i>
        ${db.users.find(u => u.id === dx.doctorId)?.name || 'Doctor'}
      </span>
    </div>
    <div class="dx-name">${dx.diagnosis}</div>
    <div class="dx-treatment-label">Treatment Plan</div>
    <div class="dx-treatment">${dx.treatment}</div>
    ${dx.timestamp ? `<div class="dx-time"><i class="ti ti-clock"></i> Recorded ${timeAgo(dx.timestamp)}</div>` : ''}`;

  /* Medications */
  const prescriptions = dx.prescriptions || [];
  rxCount.textContent  = prescriptions.length + ' medication' + (prescriptions.length !== 1 ? 's' : '');
  rxCount.style.display = prescriptions.length ? 'inline-flex' : 'none';

  if (!prescriptions.length) {
    mxContent.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-pill empty-state-icon"></i>
        <div>No medications prescribed.</div>
      </div>`;
  } else {
    mxContent.innerHTML = prescriptions.map((rx, i) => `
      <div class="rx-card">
        <div class="rx-number">${i + 1}</div>
        <div class="rx-icon"><i class="ti ti-pill"></i></div>
        <div class="rx-info">
          <div class="rx-name">${rx.drug}</div>
          <div class="rx-ndc"><span>NDC</span> ${rx.ndc}</div>
          <div class="rx-dose"><i class="ti ti-clock"></i> ${rx.dose}</div>
        </div>
      </div>`).join('');
  }
}


/* ════════════════════════════════════════════════════
   PANEL 4: PERSONAL INFO
   ════════════════════════════════════════════════════ */
function renderPersonalInfo() {
  const initials = patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const [bg, fc] = avatarColor(patient.name);

  document.getElementById('ptProfileHeader').innerHTML = `
    <div class="pt-profile-avatar" style="background:${bg};color:${fc}">
      ${initials}
    </div>
    <div class="pt-profile-name-wrap">
      <div class="pt-profile-name">${patient.name}</div>
      <div class="pt-profile-id">${patient.nationalId}</div>
      ${statusBadge(patient.status)}
    </div>`;

  const age = patient.dob && patient.dob !== '—'
    ? new Date().getFullYear() - new Date(patient.dob).getFullYear() + ' yrs'
    : '—';

  const fields = [
    { icon: 'ti-id',              label: 'National ID',      value: patient.nationalId },
    { icon: 'ti-calendar',        label: 'Date of Birth',    value: patient.dob || '—' },
    { icon: 'ti-user',            label: 'Age',              value: age },
    { icon: 'ti-gender-androgyne',label: 'Gender',           value: patient.gender || '—' },
    { icon: 'ti-phone',           label: 'Phone',            value: patient.phone || '—' },
    { icon: 'ti-notes-medical',   label: 'Chief Complaint',  value: patient.chiefComplaint || '—' },
    { icon: 'ti-clock',           label: 'Arrived',          value: patient.arrivedAt ? timeAgo(patient.arrivedAt) : '—' },
    { icon: 'ti-bed',             label: 'Bed / Ward',       value: patient.bedId
        ? (db.beds.find(b => b.id === patient.bedId)?.ward || '—')
        : 'Not assigned' },
  ];

  document.getElementById('ptInfoGrid').innerHTML = fields.map(f => `
    <div class="pt-info-field">
      <div class="pt-info-icon"><i class="ti ${f.icon}"></i></div>
      <div>
        <div class="pt-info-label">${f.label}</div>
        <div class="pt-info-value">${f.value}</div>
      </div>
    </div>`).join('');
}


/* ════════════════════════════════════════════════════
   PANEL NAVIGATION
   ════════════════════════════════════════════════════ */
const PANEL_META = {
  overview  : ['My Overview',            'Your current ER visit status'],
  vitals    : ['My Vitals',              'Recorded vital signs from triage'],
  diagnosis : ['Diagnosis & Medications','Your diagnosis and prescribed medications'],
  info      : ['Personal Information',   'Your registered details on file'],
};

function showPanel(id) {
  if (window.innerWidth <= 768) closeSidebar();

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  document.getElementById('panel-' + id).classList.add('active');

  const link = document.querySelector(`.sidebar-link[onclick*="'${id}'"]`);
  if (link) link.classList.add('active');

  const [title, sub] = PANEL_META[id] || ['Portal', ''];
  document.getElementById('panelTitle').textContent = title;
  document.getElementById('panelSub').textContent   = sub;
}


/* ════════════════════════════════════════════════════
   SIDEBAR TOGGLE (mobile)
   ════════════════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
  document.body.style.overflow =
    document.getElementById('sidebar').classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}


/* ════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════ */
init();