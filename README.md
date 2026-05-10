<div align="center">

# 🏥 ERMS — Emergency Room Management System

### *Intelligent Health Integration & Patient Journey Optimization*

[![Academic Project](https://img.shields.io/badge/Type-Academic%20Project-blue?style=flat-square)](.)
[![Course](https://img.shields.io/badge/Course-SBES240-blueviolet?style=flat-square)](.)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20Web-informational?style=flat-square)](.)
[![No Frameworks](https://img.shields.io/badge/Frameworks-None-critical?style=flat-square)](.)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](.)

> *Designed for the course **Requirements Engineering for Digital Health (SBES240)** —*
> *Department of Biomedical & Healthcare Data Engineering (BDE)*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [The Clinical Problem We Solve](#-the-clinical-problem-we-solve)
- [Key Features by Role](#-key-features-by-role)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Implementation Logic](#-implementation-logic)
- [Patient Journey](#-patient-journey)
- [Data Schema](#-data-schema-intelligent-integration-engine)
- [Clinical Decision Support](#-clinical-decision-support-cds-widgets)
- [Team](#-team)
- [Technical Report](#-technical-report--documentation)
- [Getting Started](#-getting-started)
- [Acknowledgements](#-acknowledgements)

---

## 🧠 Overview

The **Emergency Room Management System (ERMS)** is a high-fidelity, role-stratified clinical information platform engineered to address one of the most critical challenges in modern healthcare infrastructure: **the fragmentation of patient data across disconnected departmental silos.**

This system is not a data entry portal. It is an architectural demonstration of **Intelligent Health Integration** — a philosophy where every clinical touchpoint, from first patient contact at triage to final discharge disposition, is captured, structured, and made immediately accessible to the appropriate stakeholder across a unified, role-aware interface layer.

Inspired by the interoperability frameworks championed by **HL7 FHIR (Fast Healthcare Interoperability Resources)** and the unified physician workflow models deployed in enterprise systems such as **Epic** and **Cerner**, the ERMS implements a simulated but architecturally faithful representation of a real-world **Hospital Information System (HIS)**. The data schema mirrors FHIR's `Patient`, `Encounter`, and `MedicationRequest` resource models. Clinical coding standards — **ICD-10** for diagnoses and the **National Drug Code (NDC)** system for pharmaceuticals — are embedded directly into the prescription and diagnostic workflows.

The result is a system where:

- A **nurse** captures and structures patient vitals and triage priority in real time
- A **doctor** receives a pre-populated clinical view of all upstream data and issues structured, NDC-coded prescriptions
- An **administrator** monitors hospital capacity, staff availability, and departmental audit trails from a single strategic command interface

All of this is achieved without a single external framework — demonstrating that deep engineering competence precedes tooling abstraction.

---

## 🚨 The Clinical Problem We Solve

In a conventional emergency department, clinical data moves between staff members through verbal handoffs, paper notes, and isolated departmental software — a structure that systematically produces what healthcare informaticists call **Data Silos**: islands of clinical information that are invisible to adjacent stakeholders.

The consequences are measurable and severe:
- Triage assessments are unavailable to the examining physician at the point of care
- Medication histories are not cross-referenced at the moment of prescription
- Hospital capacity data exists only in the administrator's mind or on a whiteboard
- Audit trails are incomplete, manual, and legally vulnerable

The ERMS collapses these silos through a **Unified Data Layer** — a structured `db.json` Intelligent Integration Engine — and a **role-stratified presentation layer** that surfaces exactly the right data to the right clinician at the right moment in the patient journey.

---

## ✨ Key Features by Role

### 🌐 Landing Page
- Professional, medically-branded entry interface with a hospital-grade aesthetic
- Secure **internal-only login** — no public registration pathway
- All accounts are **pre-provisioned** within the system, reflecting the closed-ecosystem model of real hospital networks
- Role validation occurs at authentication; unauthorized URL access triggers an immediate redirect

---

### 🔴 Admin Dashboard — Strategic Hospital Oversight
- **Real-Time Capacity Monitor:** Live bed occupancy tracking across wards with color-coded utilization thresholds (green < 70%, amber 70–89%, red ≥ 90%)
- **Staff Availability Panel:** On-duty/off-duty status for all registered clinical staff, filterable by shift and department
- **Departmental Audit Log:** Immutable, timestamped record of all system actions (`PATIENT_ARRIVED`, `PATIENT_TRIAGED`, `PRESCRIPTION_ISSUED`, `PATIENT_DISCHARGED`) for regulatory compliance and quality assurance
- **ER Throughput Analytics:** Aggregated discharge count and average length-of-stay metrics for operational decision-making

---

### 🟡 Nurse Dashboard — The Triage Gateway
The nurse dashboard serves as the **clinical intake controller** — the first structured point of contact between patient presentation and the formal healthcare record.

- **Triage Queue View:** Waiting patients sorted by arrival time, transitioning to priority-sorted order post-assessment
- **Vitals Capture Form:** Structured input for Blood Pressure (systolic/diastolic), Heart Rate (bpm), Temperature (°C), O₂ Saturation (%), and Respiratory Rate (breaths/min)
- **Priority Assignment Interface:** Three visually distinct, one-tap priority classifications:
  - 🔴 **Red** — Immediate (life-threatening)
  - 🟡 **Yellow** — Urgent (time-sensitive)
  - 🟢 **Green** — Non-urgent (stable)
- **MEWS Score Calculator:** Auto-computed Modified Early Warning Score from entered vitals, with a clinical escalation alert if the score reaches threshold (≥ 5)
- **Triage Notes:** Free-text clinical observation field, transmitted directly to the doctor's clinical view

---

### 🔵 Doctor Dashboard — Clinical Decision Support Interface
- **Unified Physician View:** Pre-populated clinical summary displaying all upstream triage data — vitals, priority, chief complaint, and nurse notes — without manual data re-entry
- **Medical History Panel:** Patient allergies, chronic conditions, and prior visit summaries surfaced at the point of diagnosis
- **ICD-10 Diagnostic Coding:** Structured diagnosis entry with international classification codes for clinical standardization
- **NDC-Coded Prescription Engine:** Medication orders include the 11-digit **National Drug Code** (format: `XXXXX-XXXX-XX`) per FDA pharmaceutical standards, with dose, route, and frequency fields
- **Drug-Drug Interaction Checker:** Alert system that cross-references new prescriptions against existing medications and documented patient allergies
- **Disposition Interface:** One-click discharge (with follow-up instructions) or ward admission (with bed assignment) — triggering the final status update to `"discharged"` or `"admitted"`

---

## 🛠 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Markup | HTML5 | Semantic structure, accessibility compliance |
| Styling | CSS3 | Custom properties, Grid, Flexbox, responsive layout |
| Logic | JavaScript ES6+ | Modules, async/await, destructuring, arrow functions |
| Data | JSON (`db.json`) | Mock FHIR-aligned data store — Intelligent Integration Engine |
| Storage | `sessionStorage` | Session-scoped auth (auto-clears on tab close for security) |
| Standards | ICD-10, NDC, HL7 FHIR concepts | Clinical interoperability alignment |

> **⚠️ Strictly No Frameworks — No React, No Angular, No Vue.**
>
> This constraint is intentional and architecturally significant. Building without component frameworks forces direct mastery of the Web Platform API: raw DOM manipulation, native event delegation, the Fetch API, and the browser's own routing model. Every abstraction that a framework provides silently — virtual DOM, reactive state, declarative routing — is implemented explicitly here. This is not a limitation. It is the proof of competence that frameworks are designed to accelerate past.

---

## 🗂 System Architecture

```
erms/
│
├── index.html           
├── admin.html        
├── nurse.html
├── landingpage.html  
├── doctor.html
├── patient.html        
│
├── css/
│   ├── main.css                   
│   ├── admin.css             
│   ├── nurse.css
│   ├── landingpage.css
│   ├── patient.css               
│   └── doctor.css                   
│
├── js/
│   ├── auth.js          
│   ├── admin.js              
│   ├── nurse.js               
│   └── doctor.js              
│
├── data/
│   └── db.json                      
```

---

## ⚙️ Implementation Logic

### Role-Based Access Control (RBAC)

Authentication is implemented in `js/core/auth.js` using a **credential-lookup pattern** against `db.json`. Passwords are stored as SHA-256 hashes — never in plaintext. On successful login, a session object is written to `sessionStorage`:

```javascript
sessionStorage.setItem('erms_user', JSON.stringify({
  id: user.id,
  name: user.name,
  role: user.role,           // "admin" | "nurse" | "doctor"
  loginTime: new Date().toISOString()
}));
```

Role-to-route mapping then determines the redirect destination:

```javascript
const routes = {
  admin:  'pages/admin-dashboard.html',
  nurse:  'pages/nurse-dashboard.html',
  doctor: 'pages/doctor-dashboard.html'
};
window.location.href = routes[user.role];
```

**Route Guard** — Every dashboard page executes an immediately-invoked function expression (IIFE) from `router.js` before any content renders. If no valid session exists, or if the session role does not match the page's required role, the user is unconditionally redirected to `index.html`. This prevents URL-guessing attacks in the closed hospital ecosystem.

`sessionStorage` is used deliberately over `localStorage` — session data is automatically purged when the browser tab closes, enforcing security hygiene on shared clinical workstations.

---

### Database Simulation — The Intelligent Integration Engine

`db.json` serves as the system's mock backend, structured around six primary collections that mirror HL7 FHIR resource types:

| Collection | FHIR Equivalent | Description |
|---|---|---|
| `users` | `Practitioner` | Staff credentials, roles, department assignments |
| `patients` | `Patient` + `Encounter` | Demographics, vitals, clinical notes, status |
| `beds` | `Location` | Ward bed availability and occupancy state |
| `staff` | `PractitionerRole` | On-duty status and shift assignments |
| `auditLog` | `AuditEvent` | Immutable action log with actor, action, timestamp |
| `interactions` | — | Mock drug-drug interaction reference table |

All data reads and writes are routed exclusively through `js/core/api.js`. No other module calls `fetch()` directly. This single-gateway pattern mirrors the service layer architecture of production healthcare APIs and ensures that mock-to-real backend migration requires changes in exactly one file.

---

## 🔄 Patient Journey

```
[Arrival] → status: "arrived"
    ↓
[Triage] → status: "triaged" | priority: "red" | "yellow" | "green"
    ↓
[Waiting Queue] → status: "waiting" (sorted by priority, then arrival time)
    ↓
[Examination] → status: "in-progress" | assignedDoctorId: set
    ↓
[Treatment & NDC Prescription] → prescriptions[]: populated with NDC codes
    ↓
         ┌──────────────────────────────────┐
         │         Disposition Decision      │
         └──────────────────────────────────┘
              ↙                        ↘
    [Discharge]                     [Admit to Ward]
  status: "discharged"            status: "admitted"
  finalStatus set                 wardId + bedId assigned
```

Every status transition writes a timestamped entry to `auditLog`, creating a legally auditable patient record from arrival to disposition.

---

## 🗄 Data Schema — Intelligent Integration Engine

The `db.json` Patient object aligns with HL7 FHIR `Patient` and `Encounter` resource specifications:

```json
{
  "id": "p001",
  "fullName": "Mohamed Ali",
  "nationalId": "29901012345678",
  "dob": "1999-01-01",
  "bloodType": "O+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Hypertension"],
  "status": "in-progress",
  "priority": "red",
  "arrivalTime": "2025-06-01T09:15:00Z",
  "chiefComplaint": "Chest pain radiating to left arm",
  "vitals": {
    "bloodPressure": { "systolic": 160, "diastolic": 95 },
    "heartRate": 110,
    "temperature": 37.2,
    "oxygenSaturation": 94,
    "respiratoryRate": 20
  },
  "triageNotes": "Patient diaphoretic. High MEWS score. Escalated immediately.",
  "diagnosis": "Suspected STEMI",
  "icd10Code": "I21.9",
  "prescriptions": [
    {
      "drugName": "Aspirin",
      "ndc": "00363-0088-01",
      "dose": "325mg",
      "route": "oral",
      "frequency": "once"
    }
  ]
}
```

---

## 🩺 Clinical Decision Support (CDS) Widgets

Two embedded CDS tools mirror the advisory systems found in enterprise EHR platforms:

### MEWS Score Calculator *(Nurse Dashboard)*
The **Modified Early Warning Score** is auto-computed from entered vitals in real time. A score ≥ 5 triggers a red escalation banner: *"High MEWS Score detected — escalate to physician immediately."* This replicates Epic's Best Practice Advisory (BPA) alerting mechanism.

### Drug-Drug Interaction Checker *(Doctor Dashboard)*
When a second prescription is added, the system cross-references the new drug against the patient's documented `allergies` array and existing `prescriptions[]`. A warning badge is displayed if a known conflict is detected. Interaction data is stored in `db.json` under an `interactions` reference table — a simplified mock of the NLM RxNorm API used in production HIS environments.

---

## 👥 Team

This system was designed and developed by a three-member engineering team as part of the **SBES240 — Requirements Engineering for Digital Health** course.

| Role | Name | Responsibilities |
|---|---|---|
| **Lead Architect & Logic Developer** | Abdelrahman Nagy Samir | System architecture, `db.json` schema design, `auth.js`, `router.js`, `api.js`, RBAC implementation, clinical workflow logic |
| **UI/UX Engineer** | *(Team Member 2 — Name)* | All HTML pages, CSS architecture (`main.css`, `components.css`, `triage.css`), `ui-render.js`, responsive layout, triage & doctor UI forms |
| **Feature Developer & Documentation Specialist** | *(Team Member 3 — Name)* | Dashboard feature logic (`admin.js`, `nurse.js`, `doctor.js`), CDS widgets, MEWS calculator, audit log system, technical report authorship |

---

## 📄 Technical Report & Documentation

This repository includes a full **Technical Requirements Report** documenting the complete software engineering lifecycle of the ERMS. The report is structured as follows:

1. **Executive Summary** — Problem statement, solution scope, stakeholder identification
2. **Requirements Analysis** — Functional Requirements (FR-01 through FR-XX) and Non-Functional Requirements (NFR-01 through NFR-XX)
3. **System Design** — Data schema (ERD), file architecture, system context diagram
4. **Workflow & Flowcharts** — Patient journey, authentication flow, triage decision tree
5. **Clinical Interoperability Discussion** — HL7 FHIR alignment, ICD-10 and NDC standards rationale, reference to Ray Hammond's digital health integration framework
6. **Design Rationale** — Architectural decisions (Vanilla JS, sessionStorage, modular CSS, single API gateway)
7. **CDS Feature Documentation** — MEWS score logic, drug interaction checker design, comparison to Epic/Cerner advisory systems
8. **Testing & Validation** — Role-based test cases, edge case handling (duplicate patients, unauthorized access, missing vitals)
9. **Conclusion & Future Work** — Migration path to a real Node.js + PostgreSQL backend, WebSocket real-time updates, live HL7 FHIR API integration

> 📁 The full report is available in the `/docs` directory of this repository.

---

## 🚀 Getting Started

The ERMS requires no build tools, no package manager, and no compilation step. It runs entirely in the browser.

**Prerequisites:** Any modern browser (Chrome 90+, Firefox 88+, Edge 90+). A local server is required for `fetch()` calls to `db.json` — the browser's same-origin policy blocks `file://` protocol requests.

**Recommended local server options:**

Using the VS Code **Live Server** extension (simplest):
1. Open the project folder in VS Code
2. Right-click `index.html` → *"Open with Live Server"*

Using Python (no installation required):
```bash
# Python 3
python -m http.server 5500

# Python 2
python -m SimpleHTTPServer 5500
```

Then open your browser at `http://localhost:5500`.

**Pre-provisioned test accounts:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hospital.org` | `Admin@2025` |
| Doctor | `doctor@hospital.org` | `Doctor@2025` |
| Nurse | `nurse@hospital.org` | `Nurse@2025` |

---

## 🙏 Acknowledgements

- **HL7 International** — for the FHIR specification that informed our data architecture
- **U.S. National Library of Medicine** — for the RxNorm and NDC drug coding standards referenced in the prescription module
- **OpenFDA** — for the public drug database used to seed realistic NDC codes in `db.json`
- **Epic Systems & Cerner** — whose published documentation and open developer portals provided design reference for the Clinical Decision Support widget architecture
- **Ray Hammond** — whose foundational work on digital health integration and the elimination of clinical data silos directly motivated the system's core design philosophy

---

<div align="center">

*Built with precision. Documented with rigor. Engineered for interoperability.*

**SBES240 — Requirements Engineering for Digital Health**
**Department of Biomedical & Healthcare Data Engineering (BDE)**

</div>
