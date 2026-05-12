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
│   ├── index.js
│   ├── patient.js
│   ├── landingpage.js
│   └── doctor.js              
│
├── data/
│   └── db.json                      
```

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

## 👥 Team

This system was designed and developed by a three-member engineering team as part of the **SBES240 - Requirements Engineering for Digital Health** course.

| Name 
|---|
| Abdelrahman Nagy Samir |
| Omar Ehab |
| Logine Fathy |
| Malak Osama |

---

**Pre-provisioned test accounts:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Doctor | `doctor` | `doc123` |
| Nurse | `nurse` | `nurse123` |
| Patient | `From db.json file` | `From db.json file` |

---

<div align="center">

*Built with precision. Documented with rigor. Engineered for interoperability.*

**SBES240 — Requirements Engineering for Digital Health**
**Department of Biomedical & Healthcare Data Engineering (BDE)**

</div>
