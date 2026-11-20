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
│   React 18 + Vite (Port 5173 UI Exclusively)                 │
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

### [2026-11-20] - Cinematic Frame-by-Frame Scroll Experience
- **Author / Agent**: Antigravity Assistant
- **Affected Subsystems**: Client Components, Public Media Assets, Landing Page Routing, Styling
- **Files Created**:
  - `client/src/components/CinematicScrollExperience.jsx` (Scroll-driven frame-by-frame master controller)
  - `client/src/components/CinematicScrollExperience.css` (Cinematic dark HUD, telemetry, and typography styling)
  - `client/public/videos/chestx-scroll-master.mp4` (Optimized 240-frame 10.0s 1280x720 master scroll video)
  - `client/public/videos/chestx-poster.jpg` (Initial frame 0 fallback poster)
- **Files Modified**:
  - `client/src/pages/HeroPage.jsx` (Integrated pinned cinematic experience with following platform sections)
  - `client/src/pages/HeroPage.css` (Added sticky navigation slide-down animation and section anchors)
- **Dependencies Installed / Verified**:
  - `gsap` (3.15.1) and `gsap/ScrollTrigger` (verified and active)
- **Animation Architecture**:
  - Single pinned container (`pin: true`, `pinSpacing: true`) with 500vh scroll duration.
  - Normalized scroll progress (`0.0` to `1.0`) mapped directly to `video.currentTime = progress * video.duration`.
  - Bidirectional frame scrub: scrolling down advances video, scrolling up reverses it, stopping freezes the exact frame.
  - No independent autoplay: `video.pause()` enforced on initialization; frame display is 100% user-scroll-driven.
- **Scroll Storyboard (5 Synchronized Narrative Scenes)**:
  - **Scene 01 (0–20%)**: "BEYOND WHAT / THE EYE CAN SEE." — *Every radiograph holds a deeper story.*
  - **Scene 02 (20–40%)**: "INSIDE EVERY / BREATH." — *Explore the complexity of thoracic anatomy.*
  - **Scene 03 (40–60%)**: "EVERY IMAGE / TELLS A STORY." — *Transform radiographic images into meaningful insights.*
  - **Scene 04 (60–80%)**: "SEE WHAT / AI CAN REVEAL." — *Explainable AI. Visual insights. Clinical review.*
  - **Scene 05 (80–100%)**: "THE FUTURE OF / RADIOGRAPH INTELLIGENCE." — *Discover Chest-X AI.* (with "Explore the Platform" CTA).
- **Performance Optimizations**:
  - Coalesced seek loop powered by `requestAnimationFrame` preventing UI thread blocking.
  - Frame delta thresholding (`delta > 0.03s`) preventing redundant seeking assignments.
  - Hardware accelerated `fastSeek()` with automatic `currentTime` fallback.
  - `isSeeking` concurrency flag preventing concurrent decode contention.
  - Proper GSAP cleanup using `gsap.context()` and `ctx.revert()`.
  - Poster fallback and `prefers-reduced-motion` compliance.
- **Verification & Tests Run**:
  - `npm --prefix client run build`: Passed with 61 modules transformed cleanly in 9.4s.
  - `node --test server/tests/backend_test.js`: Passed 16/16 backend tests in 311ms.
  - Video stream verified: 24.0 FPS, 240 frames, 10.00s duration, HTTP 200 OK.

---

### [2026-11-20] - Dedicated Port Separation: UI on Port 5173 Only, API on Port 4000
- **Author / Agent**: Antigravity Assistant
- **Affected Subsystems**: Server (`server/index.js`), Client Config (`client/vite.config.js`), Launcher (`start.bat`), Root Orchestrator (`package.json`), Tests (`tests/verify_all.js`), Documentation (`README.md`, `docs/PROJECT_AUDIT.md`, `docs/RELEASE_READINESS_AUDIT.md`)
- **Files Modified / Created**:
  - `server/index.js`
  - `client/vite.config.js`
  - `start.bat`
  - `package.json`
  - `tests/verify_all.js`
  - `README.md`
  - `docs/PROJECT_AUDIT.md`
  - `docs/RELEASE_READINESS_AUDIT.md`
  - `logs.md`
- **Description of Changes**:
  - Removed client static asset bundling from Express API on port 4000; port 4000 now exclusively serves the REST API.
  - Browser visits to port 4000 now automatically redirect to the dedicated UI at `http://localhost:5173`.
  - Configured Vite `preview` and `server` blocks to bind exclusively to port 5173.
  - Updated Windows batch launcher `start.bat` to launch all three services (ML microservice on 5001, Express API on 4000, and React client on 5173) and open `http://localhost:5173`.
  - Updated all documentation and test verification scripts to reflect the port architecture.
- **Verification & Tests Run**:
  - `node --test server/tests/backend_test.js`: Passed 16/16 backend tests in 150ms.
  - Verified `start.bat` and Vite configuration.

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


## Modification Log - Cinematic Scroll Collision Fix, Unified Dark Theme, Header Consolidation, Patient/Doctor Edit & Delete CRUD, Single Sign-in

**Date**: 2026-11-20  
**Context**: User requested fixes for text collisions in the cinematic scroll experience, elimination of duplicate headers, removal of light/white themes on the hero/landing page in favor of a cohesive dark medical aesthetic, addition of Edit and Delete buttons/modals for Patients and Doctors, and removal of duplicate login buttons.

### 1. Cinematic Scroll Experience Text Collision Fix
- **Root Cause**: In `client/src/components/CinematicScrollExperience.jsx`, 5 independent GSAP `ScrollTrigger` timelines were scrubbed on the wrapper with non-zero start/end durations. When scrubbing or initializing, multiple scene divs had opacity > 0 simultaneously at the identical absolute coordinates (`top: 50%; left: 6vw; transform: translateY(-50%)`), producing overlapping text collisions.
- **Resolution**:
  - Removed the 5 conflicting GSAP timelines.
  - Linked active storyboard scene strictly to `activeSceneIdx` (derived from normalized scrub progress `Math.min(Math.floor(p * 5), 4)`).
  - Configured discrete active and inactive styles in `CinematicScrollExperience.css`:
    - `.cx-scene-active`: `display: block !important; opacity: 1 !important; pointer-events: auto !important; animation: cxSceneIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;`
    - `.cx-scene-inactive`: `display: none !important; opacity: 0 !important; pointer-events: none !important;`
  - Completely prevents simultaneous multi-scene text collisions.

### 2. Header Consolidation (Single Unified Header)
- **Problem**: The landing page previously rendered two distinct headers—one inside `CinematicScrollExperience.jsx` (`.cx-cinematic-header`) and one inside `HeroPage.jsx` (`.pv-header`) that appeared dynamically on scroll past 85vh.
- **Resolution**:
  - Removed `<header className="cx-cinematic-header">` from `CinematicScrollExperience.jsx`.
  - Configured `HeroPage.jsx`'s `.pv-header` as the **single, unified, always-fixed header** across the entire page (`position: fixed; top: 0; left: 0; right: 0; height: 68px; z-index: 1000`).
  - Added "DenseNet-121 Ready" telemetry badge, navigation links (`Overview`, `Capabilities`, `Workflow`, `Technology`, `Research`), and direct "Sign In" / "Explore Platform" CTA buttons.

### 3. Unified Dark Medical Tech Palette (Removal of White Theme Clash)
- **Problem**: While the cinematic scroll used deep black/midnight navy (`#030712`), the following content on the hero page used light Material Teal/white (`--pv-surface: #f8f9ff`, `#ffffff` cards, `#eff4ff` containers), creating a visual clash.
- **Resolution**:
  - Updated `HeroPage.css` CSS design tokens:
    - `--pv-surface`: `#030712`
    - `--pv-surface-lowest`: `#080f1e`
    - `--pv-surface-low`: `#0b172a`
    - `--pv-surface-container`: `#111f38`
    - `--pv-on-surface`: `#ffffff`
    - `--pv-on-surface-variant`: `#94a3b8`
    - `--pv-primary`: `#00f2fe` (electric cyan)
    - `--pv-outline`: `rgba(0, 242, 254, 0.25)`
  - Refactored `HeroPage.jsx` inline styles:
    - "How It Works" workflow step cards: `#080f1e` background, `rgba(0, 242, 254, 0.15)` border, `#ffffff` headers, `#00f2fe` badges.
    - "Technology" informatics section: `#080f1e` outer container with 4 `#0b172a` stat boxes, `#00f2fe` numbers, `#ffffff` text.
    - Research and Citation section: dark palette with electric cyan accents.
    - PACS Viewport Switcher: dark `#030712` pill switcher with active cyan highlighting.
    - Quick Demo Login Modal: dark `#080f1e` glassmorphic modal with dark inputs (`#030712`), cyan borders, and styled fast role buttons.

### 4. Patient and Doctor Edit & Delete (Backend & UI)
- **Backend Endpoints (`server/index.js`)**:
  - `PUT /api/patients/:id`: updates demographic data (`first_name`, `last_name`, `dob`, `gender`, `contact_number`, `emergency_contact`) and linked `users.full_name`; records `EDIT_PATIENT` audit event.
  - `DELETE /api/patients/:id`: executed within an atomic `BEGIN IMMEDIATE TRANSACTION`—cascades deletions across appointments, reports, explanations, predictions, studies, patient record, and linked `users` account; records `DELETE_PATIENT` audit event.
  - `PUT /api/doctors/:id`: updates doctor fields (`full_name`, `specialty`, `license_number`, `contact_number`) and linked `users.full_name`; records `EDIT_DOCTOR` audit event.
  - `DELETE /api/doctors/:id`: safely unlinks doctor from existing studies/reports (`assigned_doctor_id = NULL`), removes doctor appointments, deletes doctor record, and unlinks `users` account; records `DELETE_DOCTOR` audit event.
- **Frontend Client (`client/src/api.js`)**:
  - Added `api.editPatient(id, body)`, `api.deletePatient(id)`, `api.editDoctor(id, body)`, `api.deleteDoctor(id)`.
- **UI Management Modals (`client/src/pages/Patients.jsx` & `client/src/pages/Doctors.jsx`)**:
  - Added Edit & Delete buttons to the Patients table and Patient Detail view with validation and confirmation dialogs.
  - Added Edit & Delete buttons to Doctor directory cards with prefilled edit modal and deletion confirmation.

### 5. Login Single Sign-In Button Consolidation
- **Problem**: Login page had two stacked sign-in buttons ("Sign in as admin" and "Sign in as Administrator").
- **Resolution**:
  - Removed duplicate `<button className="demo-login">` in `client/src/pages/Login.jsx`.
  - Retained one single primary submit button that executes genuine authentication (`await login(u, p)`) using PBKDF2 password verification and JWT token issuance without mock bypass.

### 6. Verification
- **Vite Production Build**: `npm --prefix client run build` completed successfully in 2.79s without compilation errors.
- **Backend Unit Tests**: `node --test server/tests/backend_test.js` executed 16 tests across 8 suites; 100% passed (0 failed).


## Modification Log - Foreign Key Cascade Delete Fix, Modal Elimination in Favor of Dedicated Login.jsx, Header Logo Integration

**Date**: 2026-11-20  
**Context**: User requested routing all sign-in actions directly to `Login.jsx` instead of popup modal, resolving SQLite `FOREIGN KEY constraint failed` error on patient deletion, and using the user-provided official logo (`chestx-logo.png`) in the header left corner without duplicate "Chest-X AI" text.

### 1. Patient & Doctor Cascade Deletion Foreign Key Fix
- **Root Cause**: In `server/index.js`, when deleting a patient or doctor, the cascade deleted appointments, studies, reports, predictions, explanations, and patient/doctor records before deleting the linked user (`DELETE FROM users WHERE id = user_id`). However, the user account had rows in `audit_logs` where `audit_logs.user_id REFERENCES users(id)`. With `PRAGMA foreign_keys = ON;`, SQLite rejected the user deletion with `FOREIGN KEY constraint failed`.
- **Resolution**:
  - In `DELETE /api/patients/:id`:
    - Safely unlinked user foreign key in audit logs prior to user deletion: `run('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?', p.user_id)`.
    - Maintained historical text details (`username`, `action`, `details`, `ip_address`) intact in audit trail.
  - In `DELETE /api/doctors/:id`:
    - Safely unlinked doctor references: `run('UPDATE xray_studies SET doctor_id = NULL WHERE doctor_id = ?', id)`.
    - Safely reassigned any reports to fallback doctor: `run('UPDATE doctor_reports SET doctor_id = ? WHERE doctor_id = ?', fallbackDoc.id, id)`.
    - Unlinked user from audit logs: `run('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?', d.user_id)`.
  - Executed live transactional test on Patient Asmit (MRN: 001, id: 4); confirmed complete cascade deletion with zero foreign key errors.

### 2. Elimination of Sign-In Popup Modal in Favor of `Login.jsx`
- **Problem**: Header and explore buttons triggered a floating popup modal (`showLoginModal`) instead of navigating to the dedicated login route `/login`.
- **Resolution**:
  - In `client/src/pages/HeroPage.jsx`:
    - Removed `showLoginModal` state, form inputs, and the entire modal DOM tree.
    - Updated all "Sign In", "Explore Platform", and avatar button click events to navigate directly to `/login` via `navigate('/login')`.
    - In `CinematicScrollExperience.jsx`, `onLoginClick` now navigates directly to `/login`.
  - All role selections (Doctor, Patient, Administrator) and authentic PBKDF2/JWT login logic are executed cleanly on the dedicated `Login.jsx` page with a single submit button.

### 3. Header Logo Branding Without Text Duplication
- **Asset**: Saved the high-resolution transparent RGBA logo provided by the user to `client/public/chestx-logo.png`.
- **Resolution**:
  - Replaced the previous CSS/SVG logo and duplicate text (`Chest-X AI`, `Clinical Intelligence`) in the header left corner with `<img src="/chestx-logo.png" alt="Chest-X AI" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />`.
  - Because the official graphic logo already includes the stylized "Chest-X AI" typography and "AI-POWERED THORACIC RADIOGRAPHY" subtext, no adjacent text is rendered, preventing duplicate lettering.
  - Also added the official logo into the workstation sidebar rail in `App.jsx` and the login view art panel in `Login.jsx`.

### 4. Verification
- **Vite Production Build**: `npm --prefix client run build` completed in 5.52s without errors.
- **Backend Unit Tests**: `node --test server/tests/backend_test.js` passed 16/16 tests (100% pass rate).


## Modification Log - Default Active Viewer Initialized to 3D Scan

**Date**: 2026-11-20  
**Context**: User requested that the Radiology PACS Active Viewer on the Hero Page always start with the interactive 3D Scan active by default rather than Grad-CAM.

### 1. Default State Configuration
- In `client/src/pages/HeroPage.jsx`:
  - Updated `viewerMode` initial state from `'gradcam'` to `'3d'`:
    ```jsx
    const [viewerMode, setViewerMode] = useState('3d');
    ```
  - Updated the view switcher pills in the PACS header so `3D Scan` is the active highlighted mode on initial load, while retaining the toggle option to switch to `Grad-CAM`.
  - On page load, the Three.js 3D volumetric thorax reconstruction (`ThoraxCanvas3D`) automatically mounts and renders immediately as the center stage view.

### 2. Verification
- `npm --prefix client run build` built cleanly in 4.59s without errors.


## Modification Log - Streamlined Landing Page Exclusively to Cinematic Scroll Experience

**Date**: 2026-11-20  
**Context**: User requested removing all content starting from the static "See More in Every Chest X-ray" hero main stage and PACS card down to the bottom of the page, dedicating the public landing page exclusively to the cinematic frame-by-frame scroll experience.

### 1. Structural Refactor in HeroPage.jsx
- Removed the static `<main className="pv-hero-main">` section, including the 2D/3D PACS card viewer, trust indicators, capability strip, clinical workflow, technology specifications, research citations, and footer.
- The landing page is now streamlined to:
  1. The single fixed dark glassmorphic header with the official `/chestx-logo.png` emblem (no text duplication), live "DenseNet-121 Ready" telemetry badge, and "Sign In" / "Explore Platform" CTA buttons that route cleanly to `/login`.
  2. The full-screen GSAP ScrollTrigger cinematic frame-by-frame video scroll experience across all 5 narrative phases (The Reveal, The Anatomy, The Radiograph, The Intelligence, The Platform), culminating in the final "Explore the Platform" action button.
- Cleaned unused imports and state (`ThoraxCanvas3D`, `HERO_XRAY_IMAGE`, `viewerMode`, `downloadBusy`, etc.). Bundle size reduced from 942 kB to 366 kB.

### 2. Verification
- Vite production build (`npm --prefix client run build`) completed in 1.78s with zero warnings or errors.
- Backend test suite (`node --test server/tests/backend_test.js`) passed 16/16 unit tests.
