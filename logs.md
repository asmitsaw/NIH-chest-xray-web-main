# Chest-X AI Project Log & Modification Tracker

This document maintains the architectural understanding, baseline system state, and an ongoing chronological audit log of all modifications made to the project. Every change or enhancement made to the codebase must be appended to the [Modification History](#modification-history) section below.

---

## 1. Project Overview & Clinical Objective

**Chest-X AI** is a clinical decision-support and research platform for thoracic radiography (chest X-rays). Originally developed as a monolithic Streamlit prototype, it was re-architected into a decoupled three-tier enterprise web application:
- **Frontend SPA**: React 18 + Vite with custom DICOM-style radiograph viewer, 3D interactive thorax visualization (Three.js), Grad-CAM heatmaps, and role-differentiated dashboards.
- **Backend API**: Node.js 24 + Express 5.1 utilizing Node's native `node:sqlite` (`DatabaseSync` in WAL mode), PBKDF2-SHA256 multi-round password hashing, and JWT Role-Based Access Control (RBAC).
- **ML Microservice**: Python 3.11 + Flask 3.1 HTTP microservice wrapping both:
  1. *Foundation Model*: Pretrained TorchXRayVision DenseNet-121 (`densenet121-res224-all`) with independent multi-label Sigmoid outputs across 14-18 pathologies and calibrated operating thresholds.
  2. *Legacy Baseline Model*: 5-stage Keras/TensorFlow CNN (`weights.best.05-1.74.hdf5`) with Softmax output and Grad-CAM backpropagation on layer `conv2d_5`.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (SPA)                     │
│   React 18 + Vite (Port 5173 Dev / Port 4000 Static Prod)   │
│   - ThoraxCanvas3D (Three.js WebGL anatomical viewer)       │
│   - Study Workstation (Grad-CAM, DICOM brightness/contrast) │
│   - Longitudinal Comparison, Clinical Assistant, Admin      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JWT Authorization
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                      │
│                  Node.js 24 + Express 5.1                   │
│   - Port 4000 (:4000)                                       │
│   - SQLite WAL (chest_x_ai.db via node:sqlite DatabaseSync) │
│   - PBKDF2 Password Hashing (100,000 iterations, sha256)    │
│   - Role-Based Access Control: DOCTOR, PATIENT, ADMIN       │
│   - Audited Report Immutability & Addenda Engine            │
│   - PDFKit Report Generator                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal HTTP (Loopback Only)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   ML Microservice Layer                     │
│                  Python 3.11 + Flask 3.1                    │
│   - Port 5001 (127.0.0.1:5001)                              │
│   - TorchXRayVision DenseNet-121 / Keras 5-Stage CNN        │
│   - Image Preprocessing (32x32 min, 8192x8192 max, float32) │
│   - Grad-CAM on denseblock4 / conv2d_5                      │
│   - OpenCV Heatmaps (Jet, Turbo, Viridis, Inferno, etc.)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (`chest_x_ai.db`)

The SQLite database operates in Write-Ahead Logging (WAL) mode with foreign key constraints enabled:

| Table | Purpose | Key Fields |
| :--- | :--- | :--- |
| `users` | Authentication & credentials | `id`, `username`, `email`, `password_hash`, `role` (`DOCTOR`/`PATIENT`/`ADMIN`), `is_active` |
| `patients` | Patient demographic data | `id`, `user_id` (FK -> users), `mrn` (UNIQUE), `full_name`, `age`, `gender`, `blood_group`, `medical_history_notes` |
| `doctors` | Physician clinical profiles | `id`, `user_id` (FK -> users), `full_name`, `specialization`, `qualification`, `hospital_clinic`, `availability_schedule` |
| `xray_studies` | Radiograph study metadata | `id`, `patient_id` (FK), `doctor_id` (FK), `study_uid`, `study_type`, `image_path`, `status` (`PENDING_ANALYSIS`, `AI_ANALYZED`, `IN_REVIEW`, `FINALIZED`) |
| `ai_predictions` | Inference predictions | `id`, `study_id` (FK), `model_version`, `inference_time_ms`, `raw_scores_json`, `primary_findings_json`, `threshold_used` |
| `explanations` | Grad-CAM saliency assets | `id`, `prediction_id` (FK), `finding_name`, `heatmap_path`, `overlay_path`, `activation_layer` |
| `doctor_reports` | Physician findings & signs | `id`, `study_id` (UNIQUE FK), `doctor_id` (FK), `confirmed_findings_json`, `rejected_findings_json`, `added_findings_json`, `final_impression`, `recommendation`, `is_draft`, `finalized_at` |
| `appointments` | Consultation scheduler | `id`, `patient_id` (FK), `doctor_id` (FK), `appointment_date`, `appointment_time`, `reason`, `status` (`SCHEDULED`, `COMPLETED`, `CANCELLED`) |
| `audit_logs` | Immutable audit trail | `id`, `user_id` (FK), `username`, `role`, `action`, `entity`, `entity_id`, `details`, `ip_address`, `timestamp` |

---

## 4. Machine Learning & XAI Subsystem

### 4.1 14 Official NIH Pathologies
The canonical 14 pulmonary findings evaluated:
1. `Atelectasis`
2. `Consolidation`
3. `Infiltration`
4. `Pneumothorax`
5. `Edema`
6. `Emphysema`
7. `Fibrosis`
8. `Effusion`
9. `Pneumonia`
10. `Pleural_Thickening`
11. `Cardiomegaly`
12. `Nodule`
13. `Mass`
14. `Hernia`

### 4.2 Models Supported
- **TorchXRayVision DenseNet-121 (`densenet121-res224-all`)**: Multi-label classifier with independent Sigmoids, pretrained on 800,000+ radiographs. Evaluates co-occurring findings simultaneously without mutual competition. Calibrated per-disease operating thresholds (`op_threshs`).
- **Baseline Keras CNN (`weights.best.05-1.74.hdf5`)**: 5-stage Conv2D + Dense(500) + Softmax(14). Softmax simplex sums to 1.0 (relative ranking).
- **Explainability (Grad-CAM)**:
  - DenseNet: Backpropagation into `denseblock4`.
  - Keras CNN: Backpropagation into `conv2d_5` via `tf.GradientTape`.
  - Renders normalized heatmaps blended onto radiographs using OpenCV (JET, Turbo, Viridis, Inferno, Hot, Plasma).

---

## 5. Security & Clinical Governance Mechanisms

1. **Password Security**: PBKDF2 with SHA-256 and 100,000 iterations with 16-byte random salt (`pbkdf2_sha256$100000$<salt>$<hash>`). Timing-safe comparison prevents side-channel timing attacks.
2. **Session Integrity**: Persistent 64-character `JWT_SECRET` stored in `.env`. Production startup guards prevent insecure or ephemeral secret keys.
3. **Clinical Immutability (`DEF-002`)**: Finalized clinical reports cannot be updated or downgraded. Modifications require appending signed, timestamped physician addenda (`POST /api/studies/:id/report/amend`) wrapped in SQLite immediate transactions.
4. **Patient Privacy & ACLs (`DEF-004`, `DEF-005`)**: Patients can only access their own finalized reports. Raw AI model predictions and preliminary drafts are stripped for patient accounts. Cross-patient study comparisons and cross-patient record access are rejected with 400/403.
5. **Input Validation**: Radiograph uploads checked for MIME types, file size (max 15-16 MB), image dimension bounds (`32x32` to `8192x8192`), and finite tensor values.

---

## 6. Modification History

All modifications to this repository must be logged in this section in reverse chronological order (newest first).

### Template for New Entries:
```markdown
### [YYYY-MM-DD] - <Title / Summary of Changes>
- **Author / Agent**: <Name>
- **Affected Subsystems**: <Frontend / Backend / ML / Database / Tests / Docs>
- **Files Modified / Created**:
  - `path/to/file1`
  - `path/to/file2`
- **Description of Changes**:
  - <Detail 1>
  - <Detail 2>
- **Verification & Tests Run**:
  - `<test command>`: <Pass / Result>
```

---

### [2026-11-20] - Remove "TorchXRayVision" Nomenclature and Standardize on "DenseNet-121"
- **Author / Agent**: Antigravity Assistant
- **Affected Subsystems**: Frontend (`Model.jsx`, `Study.jsx`, `HeroPage.jsx`), Backend API (`server/index.js`, `server/report_pdf.js`, `server/db.js`), ML Layer (`ai/model_adapter.py`, `ai/model_config.py`, `ai/model_loader.py`), SQLite Database (`chest_x_ai.db`)
- **Files Modified / Created**:
  - `client/src/pages/Model.jsx`
  - `client/src/pages/Study.jsx`
  - `client/src/pages/HeroPage.jsx`
  - `server/index.js`
  - `server/report_pdf.js`
  - `server/db.js`
  - `ai/model_adapter.py`
  - `ai/model_config.py`
  - `ai/model_loader.py`
  - `chest_x_ai.db` (Database records updated)
- **Description of Changes**:
  - Removed all occurrences of "pretrained TorchXRayVision" and "TorchXRayVision" across user-facing views, metadata providers, and database schemas.
  - Standardized the model name and version to **DenseNet-121** across the UI workstation header, findings ladder, architecture notes, generated PDF reports, and hero page.
  - Updated legacy database rows in `ai_predictions` from `2.0.0-torchxrayvision-densenet121` and `densenet121` to `DenseNet-121`.
  - Rebuilt the React frontend production bundle via Vite.
- **Verification & Tests Run**:
  - `node -e ...`: Verified 3 rows updated in `chest_x_ai.db` to `model_version: 'DenseNet-121'`.
  - `npm --prefix client run build`: Passed (54 modules transformed, dist bundle built in 1.96s).
  - `node --test server/tests/backend_test.js`: Passed 16/16 tests across 8 suites in 147ms.

---

### [2026-11-20] - Fix Test DB Path Decoding in Backend Unit Test
- **Author / Agent**: Antigravity Assistant
- **Affected Subsystems**: Backend Tests (`server/tests/backend_test.js`)
- **Files Modified / Created**:
  - `server/tests/backend_test.js`
- **Description of Changes**:
  - Replaced `new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')` with standard Node.js `fileURLToPath(import.meta.url)`.
  - Fixes URL percent-encoding (`%20`) failure when the workspace path contains spaces (e.g., `D:\New folder\NIH-chest-xray-web-main`), ensuring `test_chestx.db` opens properly.
- **Verification & Tests Run**:
  - `node --test server/tests/backend_test.js`: Passed 16/16 tests across 8 suites in 278ms.

---

### [2026-11-20] - Repository Baseline Audit & Logs Creation
- **Author / Agent**: Antigravity Assistant
- **Affected Subsystems**: Documentation, Tracking, System Overview
- **Files Modified / Created**:
  - `logs.md` (Created)
- **Description of Changes**:
  - Ingested and verified entire codebase across React client, Node.js Express backend, Flask ML service, and documentation suite (`docs/`).
  - Documented complete architecture, database schema, ML pipeline, security protocols, and test harnesses.
  - Initialized `logs.md` as the permanent modification log for all future changes.
- **Verification & Tests Run**:
  - Verified repository file structure, database schema, and test suite definitions.
