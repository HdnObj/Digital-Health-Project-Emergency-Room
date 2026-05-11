// nurse.js — Nurse portal logic

let db          = null;
let currentUser = null;
let selectedPriority = null;

/* ══════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════ */
function init() {
  currentUser = requireAuth('nurse');
  if (!currentUser) return;

  document.getElementById('sidebarAvatar').textContent = currentUser.avatar;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('topbarAvatar').textContent  = currentUser.avatar;

  db = loadDB();
  renderAll();
}

function renderAll() {
  renderStats();
  renderQueues();
  renderPatientSelect();
  renderCompletedTable();
}

/* ══════════════════════════════════════════════════════════════════
   STATS
   ══════════════════════════════════════════════════════════════════ */
function renderStats() {
  const waiting  = db.patients.filter(p => p.status === 'waiting').length;
  const inT      = db.patients.filter(p => p.status === 'in-triage').length;
  const done     = db.vitals.filter(v => v.recordedBy === currentUser.id).length;

  document.getElementById('st-waiting').textContent  = waiting;
  document.getElementById('st-intriage').textContent = inT;
  document.getElementById('st-done').textContent     = done;

  const wcEl = document.getElementById('waitingCount');
  if (wcEl) wcEl.textContent = waiting + inT;
}

/* ══════════════════════════════════════════════════════════════════
   QUEUE
   ══════════════════════════════════════════════════════════════════ */
function renderQueues() {
  const row = (p, showBtn) => {
    const [bg, fc] = avatarColor(p.name);
    const init = p.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const v    = db.vitals.find(x => x.patientId === p.id);
    return `<div class="patient-row">
      <div class="patient-avatar" style="background:${bg};color:${fc}">${init}</div>
      <div style="flex:1;min-width:0">
        <div class="patient-name">${p.name}</div>
        <div class="patient-meta">${p.chiefComplaint} · ${timeAgo(p.arrivedAt)}</div>
      </div>
      ${v
        ? priorityBadge(v.priority)
        : showBtn
          ? `<button class="btn btn-sm btn-primary" onclick="startTriage('${p.id}')">Start Triage</button>`
          : statusBadge(p.status)
      }
    </div>`;
  };

  const awaiting = db.patients.filter(p => p.status === 'waiting');
  const triaged  = db.patients.filter(p => p.status === 'in-triage' || p.status === 'under-treatment');

  const awEl = document.getElementById('awaitingList');
  const trEl = document.getElementById('triagedList');

  if (awEl) awEl.innerHTML = awaiting.map(p => row(p, true)).join('')
    || '<div class="queue-empty"><i class="ti ti-check"></i>No patients waiting</div>';
  if (trEl) trEl.innerHTML = triaged.map(p => row(p, false)).join('')
    || '<div class="queue-empty">No triaged patients yet</div>';

  // CDS banner
  const critV = db.vitals.filter(v => v.hr > 120 || v.spo2 < 90).length;
  const cdsEl = document.getElementById('cdsQueueAlert');
  if (cdsEl) cdsEl.innerHTML = critV > 0
    ? `<div class="cds-alert"><i class="ti ti-alert-triangle"></i><strong>${critV} patient(s)</strong> with critical vitals — HR&gt;120 or SpO₂&lt;90.</div>`
    : '';
}

function renderPatientSelect() {
  const eligible = db.patients.filter(p => p.status === 'waiting' || p.status === 'in-triage');
  const sel      = document.getElementById('triagePatientSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select patient —</option>' +
    eligible.map(p => `<option value="${p.id}">${p.name} — ${p.chiefComplaint}</option>`).join('');
}

function startTriage(id) {
  showPanel('triage');
  document.getElementById('triagePatientSelect').value = id;
  selectPatient();
}

/* ══════════════════════════════════════════════════════════════════
   TRIAGE FORM
   ══════════════════════════════════════════════════════════════════ */
function selectPatient() {
  const id  = document.getElementById('triagePatientSelect').value;
  const info = document.getElementById('patientInfoCard');
  if (!id) {
    if (info) info.innerHTML = '<div style="text-align:center;padding:20px;color:#94A3B8;font-size:13px">Select a patient</div>';
    return;
  }

  const p    = db.patients.find(x => x.id === id);
  const [bg, fc] = avatarColor(p.name);
  const age  = new Date().getFullYear() - new Date(p.dob).getFullYear();

  document.getElementById('triagePatientName').textContent = p.name;
  document.getElementById('triagePatientMeta').textContent = `${age} yrs · ${p.gender} · ${p.chiefComplaint}`;

  if (info) info.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="width:48px;height:48px;border-radius:50%;background:${bg};color:${fc};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700">
        ${p.name.split(' ').map(n => n[0]).join('').slice(0,2)}
      </div>
      <div>
        <div style="font-weight:600;font-size:14px">${p.name}</div>
        <div style="font-size:12px;color:#64748B">${p.nationalId}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px">
      <div><span style="color:#94A3B8">DOB</span><br><strong>${p.dob}</strong></div>
      <div><span style="color:#94A3B8">Gender</span><br><strong>${p.gender}</strong></div>
      <div style="grid-column:span 2"><span style="color:#94A3B8">Complaint</span><br><strong>${p.chiefComplaint}</strong></div>
      <div><span style="color:#94A3B8">Arrived</span><br><strong>${timeAgo(p.arrivedAt)}</strong></div>
    </div>`;
}

function selectPriority(p) {
  selectedPriority = p;
  ['P1','P2','P3'].forEach(x => {
    document.getElementById('pcard-' + x).className = 'priority-card';
  });
  document.getElementById('pcard-' + p.split('-')[0]).className = 'priority-card selected-' + p.split('-')[0];
  const badgeEl = document.getElementById('triagePriorityBadge');
  if (badgeEl) badgeEl.innerHTML = priorityBadge(p);
}

function autoCalcPriority() {
  const hr   = parseInt(document.getElementById('vHR').value)   || 0;
  const spo2 = parseInt(document.getElementById('vSpO2').value) || 100;
  const temp = parseFloat(document.getElementById('vTemp').value) || 36.5;
  const pain = parseInt(document.getElementById('vPain').value)  || 0;
  const sys  = parseInt((document.getElementById('vBP').value || '0').split('/')[0]) || 0;

  let suggested = null, msg = '';
  if (hr > 120 || spo2 < 90) {
    suggested = 'P1-Red';
    msg = `<strong>Auto P1:</strong> ${hr > 120 ? 'HR=' + hr + ' bpm ' : ''}${spo2 < 90 ? 'SpO₂=' + spo2 + '%' : ''}`;
  } else if (temp > 39 || sys > 160 || pain >= 8) {
    suggested = 'P2-Yellow';
    msg = `<strong>Suggested P2:</strong> ${temp > 39 ? 'Temp=' + temp + '°C ' : ''}${sys > 160 ? 'SBP=' + sys + ' ' : ''}${pain >= 8 ? 'Pain=' + pain + '/10' : ''}`;
  }

  const cdsEl = document.getElementById('cdsTriageAlert');
  if (cdsEl) cdsEl.innerHTML = msg
    ? `<div class="${suggested === 'P1-Red' ? 'cds-alert' : 'alert alert-warning'}" style="margin-bottom:16px"><i class="ti ti-alert-triangle"></i>${msg.trim()}</div>`
    : '';

  if (suggested) selectPriority(suggested);
}

function submitTriage() {
  const patId = document.getElementById('triagePatientSelect').value;
  const bp    = document.getElementById('vBP').value;
  const hr    = document.getElementById('vHR').value;
  const spo2  = document.getElementById('vSpO2').value;
  const temp  = document.getElementById('vTemp').value;
  const pain  = document.getElementById('vPain').value;

  if (!patId || !bp || !hr || !spo2 || !temp) { alert('Please fill all vital signs.'); return; }
  if (!selectedPriority) { alert('Please select a priority level.'); return; }

  const existing = db.vitals.findIndex(v => v.patientId === patId);
  const entry = {
    id: 'v' + Date.now(),
    patientId:  patId,
    recordedBy: currentUser.id,
    timestamp:  new Date().toISOString(),
    bp, hr: parseInt(hr), spo2: parseInt(spo2), temp: parseFloat(temp),
    painScale:  parseInt(pain),
    priority:   selectedPriority
  };

  if (existing >= 0) db.vitals[existing] = entry; else db.vitals.push(entry);

  const patient = db.patients.find(x => x.id === patId);
  patient.status       = 'in-triage';
  patient.triageNurseId = currentUser.id;

  addAuditLog('TRIAGE_COMPLETED', patient.name);
  saveDB(db); db = loadDB(); renderAll(); showPanel('queue');
  alert('Triage recorded for ' + patient.name);
}

/* ══════════════════════════════════════════════════════════════════
   COMPLETED TRIAGES
   ══════════════════════════════════════════════════════════════════ */
function renderCompletedTable() {
  const rows = db.vitals
    .filter(v => v.recordedBy === currentUser.id)
    .map(v => {
      const p = db.patients.find(x => x.id === v.patientId);
      return `<tr>
        <td class="name">${p?.name || '?'}</td>
        <td>${v.bp}</td>
        <td>${v.hr}</td>
        <td>${v.spo2}%</td>
        <td>${v.temp}°C</td>
        <td>${v.painScale}/10</td>
        <td>${priorityBadge(v.priority)}</td>
        <td style="font-size:12px;white-space:nowrap">${timeAgo(v.timestamp)}</td>
      </tr>`;
    }).join('');

  const el = document.getElementById('completedTable');
  if (el) el.innerHTML = rows || '<tr><td colspan="8" style="text-align:center;color:#94A3B8;padding:20px">No completed triages</td></tr>';
}

/* ══════════════════════════════════════════════════════════════════
   PANEL NAVIGATION
   ══════════════════════════════════════════════════════════════════ */
const PM = {
  queue:     ['Patient Queue',     'Patients awaiting triage'],
  triage:    ['Triage Assessment', 'Record vitals and assign ESI priority'],
  completed: ['Completed Triages', 'Your triage records'],
};

function showPanel(id) {
  if (window.innerWidth <= 768) closeSidebar();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const link = document.querySelector(`.sidebar-link[onclick*="'${id}'"]`);
  if (link) link.classList.add('active');
  const [t, s] = PM[id] || ['Panel', ''];
  document.getElementById('panelTitle').textContent = t;
  document.getElementById('panelSub').textContent   = s;
}

init();