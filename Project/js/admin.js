
let db = null, currentUser = null;
let selectedRole = null;
let recentStaff = [];

/* ── Init ──────────────────────────────────────────── */
function init() {
  currentUser = requireAuth('admin');
  if (!currentUser) return;
  document.getElementById('sidebarAvatar').textContent = currentUser.avatar;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('topbarAvatar').textContent  = currentUser.avatar;
  db = loadDB();
  renderAll();
  // Live preview wiring
  ['sf-name','sf-username','sf-dept','sf-avatar'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateStaffPreview);
  });
}

function renderAll() {
  renderStats(); renderCDS(); renderPatientQueue(); renderCapacity();
  renderStaffSidebar(); renderAuditPreview(); renderBedGrid();
  renderBedSelects(); renderStaffTable(); renderAuditFull();
  renderAccountsPanel(); renderPatientAccountsList(); renderCpPatientSelect();
  // Update badge
  const count = getPatientUsers().length;
  document.getElementById('ptAcctCount').textContent = count;
}

/* ── Stats ─────────────────────────────────────────── */
function renderStats() {
  const total      = db.patients.length;
  const waiting    = db.patients.filter(p=>['waiting','in-triage','under-treatment'].includes(p.status)).length;
  const avail      = db.beds.filter(b=>b.status==='available').length;
  const discharged = db.patients.filter(p=>p.status==='discharged').length;
  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-waiting').textContent   = waiting;
  document.getElementById('stat-beds').textContent      = avail;
  document.getElementById('stat-discharged').textContent= discharged;
  const staff = db.users.filter(u=>u.role!=='admin').length;
  document.getElementById('accountCount').textContent = total + staff;
}

/* ── CDS ───────────────────────────────────────────── */
function renderCDS() {
  const a=[];
  const occ = db.beds.filter(b=>b.status==='occupied').length/db.beds.length*100;
  if(occ>=75) a.push(`<div class="cds-alert"><i class="ti ti-alert-triangle"></i><span><strong>Capacity Alert:</strong> Bed occupancy at ${Math.round(occ)}% — consider overflow protocol.</span></div>`);
  const p1=db.vitals.filter(v=>v.priority==='P1-Red').length;
  if(p1>0) a.push(`<div class="cds-alert"><i class="ti ti-heart-rate-monitor"></i><span><strong>Critical:</strong> ${p1} patient(s) flagged P1-Red.</span></div>`);
  document.getElementById('cdsAlerts').innerHTML=a.join('');
}

/* ── Patient Queue widget ──────────────────────────── */
function renderPatientQueue() {
  const sorted=db.patients.filter(p=>p.status!=='discharged').sort((a,b)=>{
    const pr={'in-triage':0,'under-treatment':1,'waiting':2};
    return (pr[a.status]??3)-(pr[b.status]??3);
  });
  document.getElementById('patientQueueList').innerHTML=sorted.map(p=>{
    const[bg,fc]=avatarColor(p.name);
    const v=db.vitals.find(x=>x.patientId===p.id);
    const init=p.name.split(' ').map(n=>n[0]).join('').slice(0,2);
    return`<div class="patient-row"><div class="patient-avatar" style="background:${bg};color:${fc}">${init}</div><div style="flex:1;min-width:0"><div class="patient-name">${p.name}</div><div class="patient-meta">${p.chiefComplaint}</div></div>${v?priorityBadge(v.priority):statusBadge(p.status)}</div>`;
  }).join('')||'<div style="padding:20px;text-align:center;color:#94A3B8;font-size:13px">No active patients</div>';
}

/* ── Capacity ──────────────────────────────────────── */
function renderCapacity() {
  const wards={};
  db.beds.forEach(b=>{if(!wards[b.ward])wards[b.ward]={t:0,o:0};wards[b.ward].t++;if(b.status==='occupied')wards[b.ward].o++;});
  document.getElementById('capacityBars').innerHTML=Object.entries(wards).map(([w,d])=>{
    const pct=Math.round(d.o/d.t*100);
    const col=pct>=75?'progress-red':pct>=50?'progress-amber':'progress-blue';
    return`<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12.5px;font-weight:500;color:#334155">${w}</span><span style="font-size:12px;color:#64748B">${d.o}/${d.t} · ${pct}%</span></div><div class="progress"><div class="progress-fill ${col}" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

/* ── Staff sidebar widget ──────────────────────────── */
function renderStaffSidebar() {
  const cols={admin:'#DBEAFE,#1D4ED8',nurse:'#CCFBF1,#0F766E',doctor:'#EDE9FE,#5B21B6'};
  document.getElementById('staffList').innerHTML=db.users.map(u=>{
    const[bg,fc]=cols[u.role].split(',');
    return`<div class="patient-row"><div class="patient-avatar" style="background:${bg};color:${fc}">${u.avatar}</div><div><div class="patient-name">${u.name}</div><div class="patient-meta" style="text-transform:capitalize">${u.role}</div></div><span class="badge badge-green">● Active</span></div>`;
  }).join('');
}

/* ── Audit ─────────────────────────────────────────── */
function renderAuditPreview() {
  document.getElementById('auditPreview').innerHTML=db.auditLog.slice(0,5).map(l=>
    `<tr><td style="white-space:nowrap">${timeAgo(l.timestamp)}</td><td class="name">${l.userName}</td><td><span class="badge badge-blue">${l.action.replace(/_/g,' ')}</span></td><td>${l.target}</td></tr>`
  ).join('');
}
function renderAuditFull() {
  document.getElementById('auditFull').innerHTML=db.auditLog.map(l=>
    `<tr><td style="font-size:11.5px;white-space:nowrap">${fmtDate(l.timestamp)}</td><td class="name">${l.userName}</td><td><span class="badge badge-blue">${l.action.replace(/_/g,' ')}</span></td><td>${l.target}</td></tr>`
  ).join('');
}

/* ── Beds ──────────────────────────────────────────── */
function renderBedGrid() {
  document.getElementById('bedGrid').innerHTML=db.beds.map(b=>{
    const pt=b.patientId?db.patients.find(p=>p.id===b.patientId):null;
    return`<div class="bed-card ${b.status}"><div class="bed-id">${b.id.toUpperCase()}</div><div style="margin:3px 0;font-size:10px">${b.ward}</div><div style="font-weight:600;font-size:10px;text-transform:uppercase">${b.status}</div>${pt?`<div style="font-size:10px;margin-top:2px">${pt.name}</div>`:''}`;
  }).join('');
}
function renderBedSelects() {
  const u=db.patients.filter(p=>!p.bedId&&p.status!=='discharged');
  document.getElementById('bedPatientSelect').innerHTML=u.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')||'<option>No patients need beds</option>';
  const a=db.beds.filter(b=>b.status==='available');
  document.getElementById('bedSelect').innerHTML=a.map(b=>`<option value="${b.id}">${b.id.toUpperCase()} — ${b.ward}</option>`).join('')||'<option>No beds available</option>';
}
function assignBed() {
  const patId=document.getElementById('bedPatientSelect').value;
  const bedId=document.getElementById('bedSelect').value;
  if(!patId||!bedId)return;
  const patient=db.patients.find(p=>p.id===patId);
  const bed=db.beds.find(b=>b.id===bedId);
  if(!patient||!bed)return;
  patient.bedId=bedId; patient.status='in-progress';
  bed.status='occupied'; bed.patientId=patId;
  addAuditLog('BED_ASSIGNED',`${patient.name} → ${bed.id.toUpperCase()} (${bed.ward})`);
  saveDB(db); db=loadDB(); renderAll();
  document.getElementById('modalBody').innerHTML=`<strong>${patient.name}</strong> assigned to <strong>${bed.id.toUpperCase()}</strong> in <strong>${bed.ward}</strong>.`;
  openModal('confirmModal');
}

/* ── Staff directory table ─────────────────────────── */
function renderStaffTable() {
  document.getElementById('staffTable').innerHTML=db.users.map(u=>
    `<tr><td class="name">${u.name}</td><td style="font-family:monospace;font-size:12px">@${u.username}</td><td style="text-transform:capitalize">${u.role}</td><td>${u.department}</td><td><span class="badge badge-green">● Active</span></td></tr>`
  ).join('');
}

/* ══════════════════════════════════════════════════════
   ALL ACCOUNTS — three sections, card-based, no h-scroll
   ══════════════════════════════════════════════════════ */
function renderAccountsPanel() {
  renderPatientsSection();
  renderNurseCards();
  renderDoctorCards();
}

/* ── Section 1: Patient Cards ──────────────────────── */
function renderPatientsSection() {
  const filter  = document.getElementById('ptStatusFilter')?.value||'';
  const patients= filter?db.patients.filter(p=>p.status===filter):db.patients;
  const users   = db.users;

  document.getElementById('cnt-patients').textContent    = db.patients.length;
  document.getElementById('cnt-patients-hdr').textContent= db.patients.length;

  if(!patients.length){
    document.getElementById('patientCardGrid').innerHTML=
      '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px;grid-column:1/-1"><i class="ti ti-users" style="font-size:32px;display:block;margin-bottom:10px;opacity:.4"></i>No patients found.</div>';
    return;
  }

  document.getElementById('patientCardGrid').innerHTML=patients.map(p=>{
    const[bg,fc]=avatarColor(p.name);
    const v     =db.vitals.find(x=>x.patientId===p.id);
    const nurse =p.triageNurseId?users.find(u=>u.id===p.triageNurseId)?.name:'—';
    const doctor=p.assignedDoctorId?users.find(u=>u.id===p.assignedDoctorId)?.name:'—';
    const bed   =p.bedId?(db.beds.find(b=>b.id===p.bedId)?.ward||'—'):'—';
    const init  =p.name.split(' ').map(n=>n[0]).join('').slice(0,2);
    // Accent bar color by priority
    const barColor=v?{P1:'#EF4444',P2:'#F59E0B',P3:'#22C55E'}[v.priority.split('-')[0]]||'#E2E8F0':'#E2E8F0';
    return`<div class="pt-card" onclick="viewPatientDetail('${p.id}')">
      <div style="height:4px;background:${barColor}"></div>
      <div class="pt-card-top">
        <div class="pt-card-avatar" style="background:${bg};color:${fc}">${init}</div>
        <div style="flex:1;min-width:0">
          <div class="pt-card-name">${p.name}</div>
          <div class="pt-card-id">${p.nationalId} · ${p.gender}</div>
        </div>
        ${v?priorityBadge(v.priority):statusBadge(p.status)}
      </div>
      <div class="pt-card-body">
        <div class="pt-card-row"><i class="ti ti-notes-medical"></i><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.chiefComplaint}</span></div>
        <div class="pt-card-row"><i class="ti ti-stethoscope"></i>Nurse: <strong>${nurse}</strong></div>
        <div class="pt-card-row"><i class="ti ti-user-heart"></i>Doctor: <strong>${doctor}</strong></div>
      </div>
      <div class="pt-card-foot">
        <span><i class="ti ti-clock" style="font-size:12px;margin-right:4px"></i>${timeAgo(p.arrivedAt)}</span>
        <span><i class="ti ti-bed" style="font-size:12px;margin-right:4px"></i>${bed}</span>
        <span style="color:#2563EB;font-weight:600;font-size:12px">View full record →</span>
      </div>
    </div>`;
  }).join('');
}

/* ── Patient detail modal ──────────────────────────── */
function viewPatientDetail(id) {
  const p=db.patients.find(x=>x.id===id); if(!p)return;
  const v=db.vitals.find(x=>x.patientId===id);
  const dx=db.diagnoses.find(x=>x.patientId===id);
  const[bg,fc]=avatarColor(p.name);
  const users=db.users;
  const nurse =p.triageNurseId?users.find(u=>u.id===p.triageNurseId)?.name:'—';
  const doctor=p.assignedDoctorId?users.find(u=>u.id===p.assignedDoctorId)?.name:'—';
  const bed   =p.bedId?(db.beds.find(b=>b.id===p.bedId)?.ward||'Unassigned'):'Unassigned';
  const init  =p.name.split(' ').map(n=>n[0]).join('').slice(0,2);
  document.getElementById('ptDetailTitle').textContent=p.name;
  document.getElementById('ptDetailBody').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div style="width:52px;height:52px;border-radius:50%;background:${bg};color:${fc};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;flex-shrink:0">${init}</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#0F172A">${p.name}</div>
        <div style="font-size:12px;color:#64748B;margin-top:3px">ID: ${p.nationalId} · ${p.dob} · ${p.gender}</div>
        <div style="margin-top:6px">${statusBadge(p.status)}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">CHIEF COMPLAINT</div><strong>${p.chiefComplaint}</strong></div>
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">BED</div><strong>${bed}</strong></div>
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">PHONE</div><strong>${p.phone}</strong></div>
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">ARRIVED</div><strong>${timeAgo(p.arrivedAt)}</strong></div>
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">TRIAGE NURSE</div><strong>${nurse}</strong></div>
      <div style="background:#F8FAFC;border-radius:9px;padding:11px"><div style="font-size:10px;color:#94A3B8;font-weight:600;margin-bottom:4px">DOCTOR</div><strong>${doctor}</strong></div>
    </div>
    ${v?`<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Triage Vitals · ${priorityBadge(v.priority)}</div>
      <div class="vitals-grid">
        <div class="vital-box"><div class="vital-label">BP</div><div class="vital-value">${v.bp}</div><div class="vital-unit">mmHg</div></div>
        <div class="vital-box"><div class="vital-label">HR</div><div class="vital-value" style="color:${v.hr>120?'#DC2626':'inherit'}">${v.hr}</div><div class="vital-unit">bpm</div></div>
        <div class="vital-box"><div class="vital-label">SpO₂</div><div class="vital-value" style="color:${v.spo2<90?'#DC2626':'inherit'}">${v.spo2}%</div></div>
        <div class="vital-box"><div class="vital-label">Temp</div><div class="vital-value" style="color:${v.temp>39?'#D97706':'inherit'}">${v.temp}°C</div></div>
        <div class="vital-box"><div class="vital-label">Pain</div><div class="vital-value">${v.painScale}/10</div></div>
      </div></div>`:
    `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px;font-size:13px;color:#1D4ED8;margin-bottom:14px"><i class="ti ti-info-circle"></i> No triage vitals recorded yet.</div>`}
    ${dx?`<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:13px"><div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Diagnosis · <code style="background:#DCFCE7;padding:2px 7px;border-radius:4px">${dx.icd10Code}</code></div><div style="font-size:13.5px;font-weight:600;color:#0F172A">${dx.diagnosis}</div><div style="font-size:12.5px;color:#475569;margin-top:4px">${dx.treatment}</div></div>`:''}`;
  openModal('patientDetailModal');
}

/* ── Section 2 & 3: Staff Cards ────────────────────── */
function renderNurseCards() {
  const nurses=db.users.filter(u=>u.role==='nurse');
  document.getElementById('cnt-nurses').textContent    =nurses.length;
  document.getElementById('cnt-nurses-hdr').textContent=nurses.length;
  document.getElementById('nurseCardGrid').innerHTML=
    nurses.length?nurses.map(u=>makeStaffCard(u,'nurse')).join(''):
    '<p style="color:#94A3B8;font-size:13px;padding:16px">No nurse accounts yet. <a href="#" onclick="showPanel(\'createstaff\')" style="color:#0D9488;font-weight:600">Create one →</a></p>';
}
function renderDoctorCards() {
  const doctors=db.users.filter(u=>u.role==='doctor');
  document.getElementById('cnt-doctors').textContent    =doctors.length;
  document.getElementById('cnt-doctors-hdr').textContent=doctors.length;
  document.getElementById('doctorCardGrid').innerHTML=
    doctors.length?doctors.map(u=>makeStaffCard(u,'doctor')).join(''):
    '<p style="color:#94A3B8;font-size:13px;padding:16px">No doctor accounts yet. <a href="#" onclick="showPanel(\'createstaff\')" style="color:#7C3AED;font-weight:600">Create one →</a></p>';
}

function makeStaffCard(u,role) {
  const triages  =db.vitals.filter(v=>v.recordedBy===u.id).length;
  const patients =db.patients.filter(p=>p.triageNurseId===u.id||p.assignedDoctorId===u.id).length;
  const diagnoses=db.diagnoses.filter(d=>d.doctorId===u.id).length;
  const rxCount  =db.diagnoses.filter(d=>d.doctorId===u.id).reduce((s,d)=>s+(d.prescriptions?.length||0),0);
  const sL=role==='nurse'
    ?`<div class="staff-stat"><div class="staff-stat-val">${triages}</div><div class="staff-stat-lbl">Triages</div></div>`
    :`<div class="staff-stat"><div class="staff-stat-val">${diagnoses}</div><div class="staff-stat-lbl">Diagnoses</div></div>`;
  const sR=role==='nurse'
    ?`<div class="staff-stat"><div class="staff-stat-val">${patients}</div><div class="staff-stat-lbl">Patients</div></div>`
    :`<div class="staff-stat"><div class="staff-stat-val">${rxCount}</div><div class="staff-stat-lbl">Prescriptions</div></div>`;
  const badge=role==='nurse'
    ?`<span class="badge badge-green" style="margin-top:6px;display:inline-flex">● Active</span>`
    :`<span class="badge badge-blue"  style="margin-top:6px;display:inline-flex">● Active</span>`;
  return`<div class="staff-card">
    <div class="staff-card-bar ${role}-bar"></div>
    <div class="staff-card-top">
      <div class="staff-card-avatar ${role}-av">${u.avatar}</div>
      <div><div class="staff-name">${u.name}</div><div class="staff-user">@${u.username}</div>${badge}</div>
    </div>
    <div class="staff-card-body">
      <div class="staff-row"><i class="ti ti-building-hospital"></i>${u.department}</div>
      <div class="staff-row"><i class="ti ti-id-badge"></i>ID: <strong>${u.id.toUpperCase()}</strong></div>
      <div class="staff-row"><i class="ti ti-shield-check"></i>Role: <strong style="text-transform:capitalize">${role}</strong></div>
      <div class="staff-stats">${sL}${sR}</div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   CREATE STAFF
   ══════════════════════════════════════════════════════ */
function selectRole(role) {
  selectedRole = role;
  document.getElementById('roleOptNurse').className  = 'role-opt'+(role==='nurse' ?' sel-nurse':'');
  document.getElementById('roleOptDoctor').className = 'role-opt'+(role==='doctor'?' sel-doctor':'');
  document.getElementById('roleError').style.display = 'none';
  updateStaffPreview();
}

function updateStaffPreview() {
  const name    = document.getElementById('sf-name').value.trim()||'Staff Name';
  const username= document.getElementById('sf-username').value.trim()||'username';
  const dept    = document.getElementById('sf-dept').value.trim()||'Department';
  const avatar  = (document.getElementById('sf-avatar').value.trim().toUpperCase()||name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'--');
  const role    = selectedRole||'role';
  const isNurse = role==='nurse';
  const avCls   = isNurse?'nurse-av':'doctor-av';
  const barCls  = isNurse?'nurse-bar':'doctor-bar';
  const badge   = isNurse
    ?`<span class="badge badge-green">● Active</span>`
    :`<span class="badge badge-blue">● Active</span>`;
  document.getElementById('staffPreview').innerHTML=`
    <div class="staff-card" style="box-shadow:none;border:none">
      <div class="staff-card-bar ${barCls}" style="border-radius:6px 6px 0 0"></div>
      <div class="staff-card-top">
        <div class="staff-card-avatar ${avCls}">${avatar}</div>
        <div><div class="staff-name">${name}</div><div class="staff-user">@${username}</div>${badge}</div>
      </div>
      <div class="staff-card-body">
        <div class="staff-row"><i class="ti ti-building-hospital"></i>${dept}</div>
        <div class="staff-row"><i class="ti ti-shield-check"></i>Role: <strong style="text-transform:capitalize">${role}</strong></div>
      </div>
    </div>`;
}

function submitCreateStaff() {
  const name    = document.getElementById('sf-name').value.trim();
  const username= document.getElementById('sf-username').value.trim();
  const password= document.getElementById('sf-password').value;
  const dept    = document.getElementById('sf-dept').value.trim();
  const avatarRaw= document.getElementById('sf-avatar').value.trim().toUpperCase();
  const avatar  = avatarRaw || name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const errEl   = document.getElementById('sf-error');
  errEl.style.display='none';

  // Validation
  if(!selectedRole){document.getElementById('roleError').style.display='block';return;}
  if(!name||!username||!password||!dept){errEl.textContent='⚠ Name, username, password, and department are required.';errEl.style.display='block';return;}
  if(password.length<6){errEl.textContent='⚠ Password must be at least 6 characters.';errEl.style.display='block';return;}
  const allTaken = new Set([...db.users.map(u=>u.username),...getPatientUsers().map(u=>u.username)]);
  if(allTaken.has(username)){errEl.textContent=`⚠ Username "@${username}" is already taken.`;errEl.style.display='block';return;}

  // Create user object and persist it into the unified db via saveDB
  const newUser={id:'u'+Date.now(),username,password,role:selectedRole,name,department:dept,avatar};
  db.users.push(newUser);
  saveDB(db);
  db=loadDB();

  // Track for "recently created" display
  recentStaff.unshift(newUser);
  renderRecentlyCreated();

  addAuditLog('STAFF_ACCOUNT_CREATED',`${newUser.name} (${selectedRole})`);
  showToast(`${newUser.name} created as ${selectedRole}`);
  clearStaffForm();
  renderAll();
}

function renderRecentlyCreated() {
  const el=document.getElementById('recentlyCreated');
  if(!recentStaff.length){el.innerHTML='<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px">No accounts created yet</div>';return;}
  el.innerHTML=recentStaff.slice(0,5).map(u=>{
    const[bg,fc]=avatarColor(u.name);
    const isNurse=u.role==='nurse';
    return`<div class="patient-row">
      <div class="patient-avatar" style="background:${isNurse?'#CCFBF1':'#EDE9FE'};color:${isNurse?'#0F766E':'#5B21B6'}">${u.avatar}</div>
      <div style="flex:1;min-width:0"><div class="patient-name">${u.name}</div><div class="patient-meta">@${u.username} · ${u.department}</div></div>
      <span class="badge ${isNurse?'badge-green':'badge-blue'}" style="text-transform:capitalize">${u.role}</span>
    </div>`;
  }).join('');
}

function clearStaffForm() {
  ['sf-name','sf-username','sf-password','sf-dept','sf-avatar'].forEach(id=>document.getElementById(id).value='');
  selectedRole=null;
  document.getElementById('roleOptNurse').className='role-opt';
  document.getElementById('roleOptDoctor').className='role-opt';
  document.getElementById('sf-error').style.display='none';
  document.getElementById('roleError').style.display='none';
  updateStaffPreview();
}

// loadDB/saveDB are defined in auth.js. No override needed — users now live in the delta.

/* ── Add Patient ───────────────────────────────────── */
function submitAddPatient() {
  const name    =document.getElementById('ap-name').value.trim();
  const nid     =document.getElementById('ap-nid').value.trim();
  const dob     =document.getElementById('ap-dob').value;
  const gender  =document.getElementById('ap-gender').value;
  const phone   =document.getElementById('ap-phone').value.trim();
  const complaint=document.getElementById('ap-complaint').value.trim();
  const errEl   =document.getElementById('ap-error');
  errEl.style.display='none';
  if(!name||!nid||!complaint){errEl.textContent='⚠ Full Name, National ID and Chief Complaint are required.';errEl.style.display='block';return;}
  if(db.patients.find(p=>p.nationalId===nid)){errEl.textContent=`⚠ A patient with National ID ${nid} already exists.`;errEl.style.display='block';return;}
  const newPt={id:'p'+Date.now(),nationalId:nid,name,dob:dob||'—',gender,phone:phone||'—',chiefComplaint:complaint,status:'waiting',bedId:null,assignedDoctorId:null,triageNurseId:null,arrivedAt:new Date().toISOString()};
  db.patients.push(newPt);
  addAuditLog('PATIENT_REGISTERED',name);
  saveDB(db); db=loadDB(); renderAll();
  closeModal('addPatientModal');
  ['ap-name','ap-nid','ap-phone','ap-complaint'].forEach(id=>document.getElementById(id).value='');
  showToast(`${name} registered`);
}

/* ── Search ────────────────────────────────────────── */
function handleSearch() {
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  if(!q){renderPatientsSection();return;}
  showPanel('accounts');
  const pts=db.patients.filter(p=>p.name.toLowerCase().includes(q)||p.chiefComplaint.toLowerCase().includes(q)||p.nationalId.includes(q));
  // temporarily swap patients for filtered set
  const saved=db.patients; db.patients=pts;
  renderPatientsSection();
  db.patients=saved;
}

/* ── Toast ─────────────────────────────────────────── */
function showToast(msg,isErr=false) {
  const t=document.getElementById('toast');
  const m=document.getElementById('toastMsg');
  m.textContent=msg;
  t.className='toast-msg'+(isErr?' err':'');
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>t.classList.remove('show'),3200);
}

/* ── Modal helpers ─────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ── Panel navigation ──────────────────────────────── */
const PANEL_META={
  dashboard:    ['Dashboard Overview','Hospital capacity, patient flow, and system status'],
  accounts:     ['All Accounts','Patients · Nurses · Doctors — all registered accounts'],
  createstaff:  ['Create Staff Account','Register a new nurse or doctor account'],
  staffdir:     ['Staff Directory','All registered clinical staff'],
  beds:         ['Bed Management','Assign and release beds across ER wards'],
  audit:        ['Audit Log','Complete system event history'],
  createpatient:['Create Patient Account','Give an ER patient access to the patient portal'],
  patientaccounts:['Manage Patient Accounts','All patient portal login accounts'],
};
function showPanel(id) {
  if(window.innerWidth<=768) closeSidebar();

  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');


  const link=document.querySelector(`.sidebar-link[onclick*="'${id}'"]`);
  if(link) link.classList.add('active');
  const[t,s]=PANEL_META[id]||['Panel',''];
  document.getElementById('panelTitle').textContent=t;
  document.getElementById('panelSub').textContent=s;
}

/* ── Sidebar ───────────────────────────────────────── */
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
  document.body.style.overflow=document.getElementById('sidebar').classList.contains('open')?'hidden':'';
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow='';
}

/* ══════════════════════════════════════════════════════
   CREATE PATIENT ACCOUNT — new functions
   ══════════════════════════════════════════════════════ */

function renderCpPatientSelect() {
  const ptUsers  = getPatientUsers();
  const usedNids = new Set(ptUsers.map(u => u.nationalId));
  // Only show patients who don't have a portal account yet
  const eligible = db.patients.filter(p => !usedNids.has(p.nationalId));
  const sel      = document.getElementById('cp-patient');
  if (!sel) return;
  sel.innerHTML  = '<option value="">— Choose a registered patient —</option>' +
    eligible.map(p => `<option value="${p.id}">${p.name} · ${p.nationalId}</option>`).join('');
  if (!eligible.length) {
    sel.innerHTML = '<option value="" disabled>All patients already have accounts</option>';
  }
}

function onCpPatientChange() {
  const id      = document.getElementById('cp-patient').value;
  const infoBox = document.getElementById('cp-patient-info');
  const infoTxt = document.getElementById('cp-info-text');
  if (!id) { infoBox.style.display='none'; return; }
  const p = db.patients.find(x => x.id === id);
  if (!p) { infoBox.style.display='none'; return; }
  infoTxt.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:#0F172A">${p.name}</div>
      ${statusBadge(p.status)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12.5px;color:#475569">
      <div>National ID: <strong style="font-family:monospace">${p.nationalId}</strong></div>
      <div>DOB: <strong>${p.dob}</strong></div>
      <div>Phone: <strong>${p.phone}</strong></div>
      <div>Gender: <strong>${p.gender}</strong></div>
    </div>`;
  infoBox.style.display = 'block';
  // Auto-suggest username from name
  const suggested = p.name.toLowerCase().replace(/\s+/g,'.').replace(/[^a-z.]/g,'');
  const uField = document.getElementById('cp-username');
  if (!uField.value) uField.value = suggested;
  document.getElementById('cp-error').style.display = 'none';
}

function submitCreatePatient() {
  const patId    = document.getElementById('cp-patient').value;
  const username = document.getElementById('cp-username').value.trim();
  const password = document.getElementById('cp-password').value;
  const errEl    = document.getElementById('cp-error');
  errEl.style.display = 'none';

  if (!patId)    { errEl.textContent='⚠ Please select a patient.';             errEl.style.display='block'; return; }
  if (!username) { errEl.textContent='⚠ Username is required.';                errEl.style.display='block'; return; }
  if (password.length < 6) { errEl.textContent='⚠ Password must be at least 6 characters.'; errEl.style.display='block'; return; }

  const p        = db.patients.find(x => x.id === patId);
  const existing = getPatientUsers();

  // Check username collision across ALL users (staff + patients)
  const allUsernames = new Set([
    ...db.users.map(u => u.username),
    ...existing.map(u => u.username)
  ]);
  if (allUsernames.has(username)) {
    errEl.textContent = `⚠ Username "@${username}" is already taken. Choose another.`;
    errEl.style.display = 'block'; return;
  }

  // Create the patient user object
  const newPtUser = {
    id:         'pu_' + Date.now(),
    username,
    password,
    role:       'patient',
    name:       p.name,
    nationalId: p.nationalId,
    dob:        p.dob,
    gender:     p.gender,
    phone:      p.phone,
    avatar:     p.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),
    createdAt:  new Date().toISOString(),
    createdBy:  currentUser.name
  };

  savePatientUser(newPtUser);
  addAuditLog('PATIENT_ACCOUNT_CREATED', `${p.name} (@${username})`);

  renderAll();
  renderRecentPatientAccounts(newPtUser);
  showToast(`Account created for ${p.name}`);
  clearCpForm();
}

function clearCpForm() {
  document.getElementById('cp-patient').value  = '';
  document.getElementById('cp-username').value = '';
  document.getElementById('cp-password').value = '';
  document.getElementById('cp-patient-info').style.display = 'none';
  document.getElementById('cp-error').style.display        = 'none';
}

let recentPtAccounts = [];
function renderRecentPatientAccounts(newUser) {
  recentPtAccounts.unshift(newUser);
  const el = document.getElementById('recentPatientAccounts');
  if (!el) return;
  el.innerHTML = recentPtAccounts.slice(0, 5).map(u => `
    <div class="patient-row">
      <div class="patient-avatar" style="background:#E0F2FE;color:#0369A1">${u.avatar}</div>
      <div style="flex:1;min-width:0">
        <div class="patient-name">${u.name}</div>
        <div class="patient-meta">@${u.username} · ID: ${u.nationalId}</div>
      </div>
      <span class="badge badge-blue">Patient</span>
    </div>`).join('');
}

function renderPatientAccountsList() {
  const ptUsers = getPatientUsers();
  const el      = document.getElementById('ptAccountsList');
  if (!el) return;
  // Update badge
  const badge = document.getElementById('ptAcctCount');
  if (badge) badge.textContent = ptUsers.length;

  if (!ptUsers.length) {
    el.innerHTML = `
      <div style="padding:40px;text-align:center;color:#94A3B8;font-size:13px">
        <i class="ti ti-key" style="font-size:36px;display:block;margin-bottom:10px;opacity:.4"></i>
        No patient accounts created yet.<br>
        <a href="#" onclick="showPanel('createpatient')" style="color:#0284C7;font-weight:600">Create the first one →</a>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:560px">
        <thead><tr style="border-bottom:1px solid #F1F5F9">
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em">Patient</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em">Username</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em">National ID</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em">Created By</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em">Created</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-align:center;text-transform:uppercase;letter-spacing:.04em">Actions</th>
        </tr></thead>
        <tbody>
          ${ptUsers.map(u => `
            <tr style="border-bottom:1px solid #F8FAFC">
              <td style="padding:12px 16px">
                <div style="font-weight:600;color:#0F172A;font-size:13px">${u.name}</div>
              </td>
              <td style="padding:12px 16px;font-family:monospace;font-size:12.5px;color:#0284C7">@${u.username}</td>
              <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#64748B">${u.nationalId}</td>
              <td style="padding:12px 16px;font-size:12.5px;color:#64748B">${u.createdBy||'Admin'}</td>
              <td style="padding:12px 16px;font-size:12px;color:#94A3B8;white-space:nowrap">${timeAgo(u.createdAt)}</td>
              <td style="padding:12px 16px;text-align:center">
                <button class="btn btn-sm btn-secondary" style="color:#DC2626;border-color:#FECACA" onclick="deletePatientAccount('${u.id}','${u.name}')">
                  <i class="ti ti-trash"></i> Revoke
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function deletePatientAccount(id, name) {
  if (!confirm(`Revoke portal access for ${name}?\n\nThey will no longer be able to log in to the patient portal.`)) return;
  deletePatientUser(id);
  addAuditLog('PATIENT_ACCOUNT_REVOKED', name);
  renderAll();
  showToast(`Access revoked for ${name}`, true);
}

init();
