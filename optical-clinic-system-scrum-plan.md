# Optical Clinic Appointment System — Scrum Plan & Build Instructions

## 0. Scope Assumption

Client-facing optical clinic system with:
- Patient appointment booking (checkups, follow-ups)
- Eye prescription records (per-eye sphere/cylinder/axis/add/PD, not generic notes)
- Automatic "next checkup due" logic based on prescription validity period
- Doctor/optometrist schedule management
- Admin/staff dashboard for reception

This is a different architecture from your fitness app. This system is **online-first**, not offline-first — patient and prescription data must be the server's source of truth at all times. Do not reuse the WatermelonDB offline-write pattern here.

---

## 1. Scrum Adapted for Solo Dev + Client-as-PO

You are solo. Standard Scrum roles don't map cleanly, so adapt like this:

| Role | Who | Adaptation |
|---|---|---|
| Product Owner | The client | Owns priority calls, approves each sprint demo. You still write and groom the backlog for them — don't wait for them to write tickets. |
| Scrum Master / Dev | You | You run ceremonies solo; keep them short, they exist to force scope discipline, not theater. |
| Stakeholder reviews | Client, end of each sprint | 15–20 min screen-share demo, not a written report. |

**Sprint length: 1 week.** Solo + fixed scope domain (optical prescriptions have known fields, not ambiguous) means short sprints keep client feedback loops tight and catch scope drift early.

**Ceremonies (lightweight):**
- **Sprint Planning** (30 min, Monday): pick backlog items for the week, confirm with client via chat if anything's ambiguous.
- **Daily standup**: replace with a 5-line end-of-day note to yourself (what's done, what's blocked, tomorrow's target). Optional to send to client weekly, not daily.
- **Sprint Review** (Friday, with client): live demo of working feature, not slides.
- **Sprint Retro** (Friday, solo, 10 min): what slowed you down, fix it next sprint.

**Definition of Done** for every backlog item:
- Works against real Supabase data, not mocked
- RLS policy tested (patient can't see another patient's data; staff can)
- No hardcoded values (clinic hours, prescription validity period, etc. — pull from config table)
- Manually tested on both iOS/Android if patient-facing

---

## 2. Domain Model (build this first, before any UI)

```
clinics            (single row if single clinic, but model it for 1 anyway — cheap now, expensive later)
doctors            (name, specialty, working_hours JSON, clinic_id)
patients           (name, contact, dob, clinic_id)
prescriptions       (patient_id, doctor_id, date_issued, validity_months,
                     od_sphere, od_cylinder, od_axis, od_add,
                     os_sphere, os_cylinder, os_axis, os_add,
                     pd, notes)
appointments        (patient_id, doctor_id, start_time, end_time, status,
                     type: checkup|follow_up|walk_in, reason)
schedule_overrides  (doctor_id, date, is_available, note) -- holidays/leave
staff_users         (auth link, role: admin|reception|doctor)
```

**Key derived field, not stored:** `next_checkup_due = date_issued + validity_months`. Compute this, don't store a stale copy — recompute whenever prescriptions or clinic config change.

**Critical constraints to set at the DB level, not app level:**
- `EXCLUDE` constraint on `appointments` using `tstzrange(start_time, end_time)` per `doctor_id` — prevents double-booking a doctor even under concurrent requests.
- RLS: patients see only their own `prescriptions`/`appointments`; staff/doctors see all within their clinic.

---

## 3. Sprint Breakdown

### Sprint 0 — Foundation (1 week)
- Supabase project, schema above, RLS policies, seed data
- Auth: patient login vs staff login (separate flows or role-gated single login — decide with client)
- Expo Router skeleton with role-based navigation stacks
- **Demo:** login works, role-based routing works, empty screens per role

### Sprint 1 — Core Booking (1 week)
- Doctor availability logic (working hours + overrides → available slots)
- Patient-facing: view available slots, book appointment
- DB-level double-booking prevention tested with concurrent requests
- **Demo:** patient books a real slot; try to double-book the same slot from two devices and watch it fail correctly

### Sprint 2 — Prescription Records (1 week)
- Prescription entry form (staff/doctor side) — per-eye fields, validity period
- Patient view: read-only prescription history
- `next_checkup_due` computed and displayed
- **Demo:** enter a prescription, confirm the "next checkup due" date appears correctly on patient's view

### Sprint 3 — Reminders & Notifications (1 week)
- Supabase Cron job: daily check for patients whose `next_checkup_due` is approaching (e.g. 7 days out)
- Push notification via Expo Notifications
- SMS fallback (Twilio, or PH-local provider) — confirm with client if this is in budget/scope, it's the one part with a recurring cost
- **Demo:** manually trigger the cron function, show notification firing for a test patient

### Sprint 4 — Staff/Admin Dashboard (1 week)
- Reception view: today's schedule, walk-in queue insertion alongside booked slots
- Doctor leave/override entry (cascades to cancel/reschedule affected appointments — decide with client: auto-notify patient or manual reception call?)
- No-show marking, appointment status management
- **Demo:** simulate a doctor calling in sick, show affected appointments flagged for reception follow-up

### Sprint 5 — Polish & Hardening (1 week)
- Timezone/DST audit (all stored UTC, display converted — Philippines is single timezone so lower risk, but don't hardcode assumptions if the client ever expands)
- Full RLS audit: try to access other patients' data as a logged-in patient, confirm blocked
- Error states, empty states, loading states across all screens
- App store prep (screenshots, privacy policy — required since it handles health-adjacent data)
- **Demo:** full walkthrough, patient books → gets reminder → attends → staff marks complete

---

## 4. Tech Stack

| Layer | Choice | Note |
|---|---|---|
| DB/Auth | Supabase (Postgres + RLS + Auth) | Same as your fitness app, but used online-first here |
| Backend logic | Supabase Edge Functions | Booking transactions, cron-triggered reminder checks |
| Mobile (patient app) | Expo + Expo Router + NativeWind | Reuse your existing stack |
| Staff/admin | Decide: same Expo app with role-gated screens, or separate lightweight React web dashboard | Reception desks often prefer a browser on a desktop — worth asking the client directly |
| State | Zustand for UI state only; server state fetched live (React Query or plain Supabase calls with refetch-on-focus) | No WatermelonDB here |
| Notifications | Expo Notifications (push) + Twilio or PH SMS gateway (fallback) | Confirm SMS budget with client early — it's the one recurring cost item |
| Date/time | `date-fns-tz` or `luxon` | Don't hand-roll date math |

---

## 5. One Decision to Get from the Client Before Sprint 0

Ask the client directly, don't assume:
1. Single clinic/location, or will this expand to branches later? (Changes whether `clinics` table matters now.)
2. Should patients self-register, or does reception create patient accounts? (Changes auth flow entirely.)
3. Is SMS reminder in budget, or push-notification-only acceptable at launch?
4. Staff dashboard: mobile app screens, or separate web dashboard for the front desk?

Get these answered before Sprint 0 — they change the schema and routing structure, and are expensive to retrofit after Sprint 2.
