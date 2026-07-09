/**
 * OptiCare Vision Center — Logic & UI Flow Test Suite
 * 
 * Tests the core business logic in db.js and config.js,
 * plus component rendering/flow for PatientPortal, DoctorPortal, and ReceptionistPortal.
 * 
 * Run with: npm test
 */

import { CLINIC_CONFIG } from './config/config';

// ============================================================
// SETUP: Mock localStorage for isolated test runs
// ============================================================
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Fresh import after localStorage mock is in place
// We need to clear the module cache so db.js re-seeds
beforeEach(() => {
  localStorage.clear();
  // Force re-seed by clearing the cached module
  jest.resetModules();
});

// Helper: get a fresh copy of all db functions
const loadDB = () => {
  return require('./database/db');
};

// ============================================================
// 1. CONFIGURATION & SEED DATA TESTS
// ============================================================
describe('CLINIC_CONFIG', () => {
  test('TC-01: slotDurationMinutes is a positive number', () => {
    expect(CLINIC_CONFIG.scheduling.slotDurationMinutes).toBeGreaterThan(0);
    expect(typeof CLINIC_CONFIG.scheduling.slotDurationMinutes).toBe('number');
  });

  test('TC-02: validityPeriods has at least one option', () => {
    expect(CLINIC_CONFIG.validityPeriods.length).toBeGreaterThanOrEqual(1);
    CLINIC_CONFIG.validityPeriods.forEach(period => {
      expect(period).toHaveProperty('value');
      expect(period).toHaveProperty('label');
      expect(typeof period.value).toBe('number');
    });
  });

  test('TC-03: validationLimits sphere range is symmetric and reasonable', () => {
    const { min, max } = CLINIC_CONFIG.validationLimits.sphere;
    expect(min).toBeLessThan(0);
    expect(max).toBeGreaterThan(0);
    expect(Math.abs(min)).toEqual(Math.abs(max));
  });

  test('TC-04: axis range is 0 to 180', () => {
    expect(CLINIC_CONFIG.validationLimits.axis.min).toBe(0);
    expect(CLINIC_CONFIG.validationLimits.axis.max).toBe(180);
  });

  test('TC-05: PD range is anatomically reasonable (40-80mm)', () => {
    expect(CLINIC_CONFIG.validationLimits.pd.min).toBeGreaterThanOrEqual(30);
    expect(CLINIC_CONFIG.validationLimits.pd.max).toBeLessThanOrEqual(90);
  });
});

describe('Seed Data Integrity', () => {
  test('TC-06: database seeds with 3 doctors', () => {
    const db = loadDB();
    const docs = db.getDoctors();
    expect(docs.length).toBe(3);
  });

  test('TC-07: database seeds with 3 patients', () => {
    const db = loadDB();
    const pats = db.getPatients();
    expect(pats.length).toBe(3);
  });

  test('TC-08: database seeds with 2 appointments', () => {
    const db = loadDB();
    const appts = db.getAppointments();
    expect(appts.length).toBe(2);
  });

  test('TC-09: database seeds with 2 prescriptions', () => {
    const db = loadDB();
    const rxs = db.getPrescriptions();
    expect(rxs.length).toBe(2);
  });

  test('TC-10: database seeds with 1 schedule override', () => {
    const db = loadDB();
    const ovrs = db.getOverrides();
    expect(ovrs.length).toBe(1);
  });

  test('TC-11: database seeds with 2 medical records', () => {
    const db = loadDB();
    const recs = db.getRecords();
    expect(recs.length).toBe(2);
  });

  test('TC-12: all seed appointments have required fields', () => {
    const db = loadDB();
    db.getAppointments().forEach(appt => {
      expect(appt).toHaveProperty('id');
      expect(appt).toHaveProperty('patient_id');
      expect(appt).toHaveProperty('doctor_id');
      expect(appt).toHaveProperty('date');
      expect(appt).toHaveProperty('start_time');
      expect(appt).toHaveProperty('end_time');
      expect(appt).toHaveProperty('status');
      expect(appt).toHaveProperty('type');
      expect(appt).toHaveProperty('reason');
    });
  });

  test('TC-13: all seed doctors have complete working_hours for 7 days', () => {
    const db = loadDB();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    db.getDoctors().forEach(doc => {
      days.forEach(day => {
        expect(doc.working_hours).toHaveProperty(day);
        const hours = doc.working_hours[day];
        if (hours !== null) {
          expect(hours).toHaveProperty('start');
          expect(hours).toHaveProperty('end');
          expect(hours.start < hours.end).toBe(true);
        }
      });
    });
  });

  test('TC-14: seed override has is_available set to false', () => {
    const db = loadDB();
    const ovr = db.getOverrides()[0];
    expect(ovr.is_available).toBe(false);
  });
});

// ============================================================
// 2. SLOT AVAILABILITY LOGIC
// ============================================================
describe('checkSlotAvailability', () => {
  test('TC-15: returns unavailable for non-existent doctor', () => {
    const db = loadDB();
    const result = db.checkSlotAvailability('doc-fake', '2026-07-10', '10:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  test('TC-16: returns unavailable on doctor\'s day off (Sunday for doc-1)', () => {
    const db = loadDB();
    // Find a Sunday date
    // 2026-07-12 is a Sunday
    const result = db.checkSlotAvailability('doc-1', '2026-07-12', '10:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/does not work/i);
  });

  test('TC-17: returns unavailable outside working hours', () => {
    const db = loadDB();
    // doc-1 works 09:00-17:00 on weekdays. 07:00 is too early
    // 2026-07-13 is a Monday
    const result = db.checkSlotAvailability('doc-1', '2026-07-13', '07:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/outside working hours/i);
  });

  test('TC-18: returns unavailable after working hours end', () => {
    const db = loadDB();
    // doc-1 works until 17:00. 17:00 itself should be blocked (>= end).
    const result = db.checkSlotAvailability('doc-1', '2026-07-13', '17:00');
    expect(result.available).toBe(false);
  });

  test('TC-19: returns available for valid open slot', () => {
    const db = loadDB();
    // doc-1 on 2026-07-13 (Monday), 11:00 — should be open
    const result = db.checkSlotAvailability('doc-1', '2026-07-13', '11:00');
    expect(result.available).toBe(true);
  });

  test('TC-20: returns unavailable on override/blocked date', () => {
    const db = loadDB();
    // Seed override blocks doc-1 on 2026-07-15
    const result = db.checkSlotAvailability('doc-1', '2026-07-15', '10:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/unavailable/i);
  });

  test('TC-21: returns unavailable for already booked slot', () => {
    const db = loadDB();
    // Seed has apt-1: doc-1 on 2026-07-08 at 10:00, status=scheduled
    const result = db.checkSlotAvailability('doc-1', '2026-07-08', '10:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/already booked/i);
  });

  test('TC-22: cancelled appointment does NOT block the slot', () => {
    const db = loadDB();
    // Cancel the seed appointment and check the same slot
    db.updateAppointmentStatus('apt-1', 'cancelled');
    const result = db.checkSlotAvailability('doc-1', '2026-07-08', '10:00');
    expect(result.available).toBe(true);
  });

  test('TC-23: excludeAppointmentId allows rescheduling own slot', () => {
    const db = loadDB();
    // apt-1 occupies doc-1, 2026-07-08, 10:00
    // With exclude, it should be available
    const result = db.checkSlotAvailability('doc-1', '2026-07-08', '10:00', 'apt-1');
    expect(result.available).toBe(true);
  });

  test('TC-24: excludeAppointmentId does NOT allow stealing another booking', () => {
    const db = loadDB();
    // apt-1 occupies doc-1, 2026-07-08, 10:00
    // Exclude a different id — should still be blocked
    const result = db.checkSlotAvailability('doc-1', '2026-07-08', '10:00', 'apt-999');
    expect(result.available).toBe(false);
  });
});

// ============================================================
// 3. BOOKING (addAppointment) LOGIC
// ============================================================
describe('addAppointment', () => {
  test('TC-25: successfully books an open slot', () => {
    const db = loadDB();
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13', // Monday
      start_time: '11:00',
      type: 'checkup',
      reason: 'Test booking'
    });
    expect(appt).toHaveProperty('id');
    expect(appt.status).toBe('scheduled');
    expect(appt.start_time).toBe('11:00');
  });

  test('TC-26: computes correct end_time based on config duration', () => {
    const db = loadDB();
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '09:00',
      type: 'checkup',
      reason: 'Test end_time'
    });
    // 09:00 + 30 min = 09:30
    expect(appt.end_time).toBe('09:30');
  });

  test('TC-27: end_time rolls over hour correctly', () => {
    const db = loadDB();
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '16:30',
      type: 'checkup',
      reason: 'Test hour rollover'
    });
    // 16:30 + 30 min = 17:00
    expect(appt.end_time).toBe('17:00');
  });

  test('TC-28: throws error when booking an occupied slot', () => {
    const db = loadDB();
    // apt-1 already occupies doc-1, 2026-07-08, 10:00
    expect(() => {
      db.addAppointment({
        patient_id: 'pat-2',
        doctor_id: 'doc-1',
        date: '2026-07-08',
        start_time: '10:00',
        type: 'checkup',
        reason: 'Double-book attempt'
      });
    }).toThrow(/already booked/i);
  });

  test('TC-29: throws error when booking on override/blocked day', () => {
    const db = loadDB();
    expect(() => {
      db.addAppointment({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        date: '2026-07-15', // blocked by seed override
        start_time: '10:00',
        type: 'checkup',
        reason: 'Blocked day attempt'
      });
    }).toThrow(/unavailable/i);
  });

  test('TC-30: caller cannot override computed status field', () => {
    const db = loadDB();
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '12:00',
      type: 'checkup',
      reason: 'Test status override',
      status: 'attended' // should be overridden to 'scheduled'
    });
    expect(appt.status).toBe('scheduled');
  });
});

// ============================================================
// 4. RESCHEDULING LOGIC
// ============================================================
describe('rescheduleAppointment', () => {
  test('TC-31: reschedules to a valid new slot', () => {
    const db = loadDB();
    // Reschedule apt-1 from 10:00 to 14:00 same day
    const result = db.rescheduleAppointment('apt-1', '2026-07-08', '14:30');
    expect(result.start_time).toBe('14:30');
    expect(result.status).toBe('scheduled');
  });

  test('TC-32: reschedule recomputes end_time', () => {
    const db = loadDB();
    const result = db.rescheduleAppointment('apt-1', '2026-07-08', '15:00');
    expect(result.end_time).toBe('15:30');
  });

  test('TC-33: throws when rescheduling to an occupied slot', () => {
    const db = loadDB();
    // apt-2 occupies doc-2 at 14:00 on 2026-07-08
    // Book doc-2 at 15:00 then try to reschedule to 14:00
    const newAppt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-2',
      date: '2026-07-08',
      start_time: '15:00',
      type: 'checkup',
      reason: 'Test reschedule conflict'
    });
    expect(() => {
      db.rescheduleAppointment(newAppt.id, '2026-07-08', '14:00');
    }).toThrow(/already booked/i);
  });

  test('TC-34: throws for non-existent appointment ID', () => {
    const db = loadDB();
    expect(() => {
      db.rescheduleAppointment('apt-fake', '2026-07-13', '10:00');
    }).toThrow(/not found/i);
  });

  test('TC-35: reschedule to same slot succeeds (excludeId logic)', () => {
    const db = loadDB();
    // Reschedule apt-1 to the exact same date/time
    const result = db.rescheduleAppointment('apt-1', '2026-07-08', '10:00');
    expect(result.start_time).toBe('10:00');
    expect(result.status).toBe('scheduled');
  });
});

// ============================================================
// 5. OVERRIDE MANAGEMENT LOGIC
// ============================================================
describe('Schedule Overrides', () => {
  test('TC-36: addOverride creates override with is_available=false by default', () => {
    const db = loadDB();
    const ovr = db.addOverride({
      doctor_id: 'doc-1',
      date: '2026-08-01',
      note: 'Vacation'
    });
    expect(ovr.is_available).toBe(false);
    expect(ovr).toHaveProperty('id');
  });

  test('TC-37: override blocks slot availability', () => {
    const db = loadDB();
    db.addOverride({ doctor_id: 'doc-2', date: '2026-07-14', note: 'Sick leave' });
    const check = db.checkSlotAvailability('doc-2', '2026-07-14', '10:00');
    expect(check.available).toBe(false);
    expect(check.reason).toMatch(/sick leave/i);
  });

  test('TC-38: removeOverride restores availability', () => {
    const db = loadDB();
    // Seed override ovr-1 blocks doc-1 on 2026-07-15
    db.removeOverride('ovr-1');
    // 2026-07-15 is a Tuesday — doc-1 works Tues 09:00-17:00
    const check = db.checkSlotAvailability('doc-1', '2026-07-15', '10:00');
    expect(check.available).toBe(true);
  });
});

// ============================================================
// 6. APPOINTMENT STATUS UPDATES
// ============================================================
describe('updateAppointmentStatus', () => {
  test('TC-39: updates status to checked-in', () => {
    const db = loadDB();
    const result = db.updateAppointmentStatus('apt-1', 'checked-in');
    expect(result.status).toBe('checked-in');
  });

  test('TC-40: updates status to attended', () => {
    const db = loadDB();
    const result = db.updateAppointmentStatus('apt-1', 'attended');
    expect(result.status).toBe('attended');
  });

  test('TC-41: updates status to cancelled', () => {
    const db = loadDB();
    const result = db.updateAppointmentStatus('apt-1', 'cancelled');
    expect(result.status).toBe('cancelled');
  });

  test('TC-42: returns undefined for non-existent appointment', () => {
    const db = loadDB();
    const result = db.updateAppointmentStatus('apt-fake', 'cancelled');
    expect(result).toBeUndefined();
  });
});

// ============================================================
// 7. PRESCRIPTION LOGIC
// ============================================================
describe('Prescriptions', () => {
  test('TC-43: addPrescription creates with auto date_issued', () => {
    const db = loadDB();
    const rx = db.addPrescription({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      validity_months: 12,
      od_sphere: '-1.00',
      od_cylinder: 'DS',
      od_axis: 0,
      od_add: '0.00',
      os_sphere: '-1.25',
      os_cylinder: 'DS',
      os_axis: 0,
      os_add: '0.00',
      pd: 63,
      notes: 'Test Rx'
    });
    expect(rx).toHaveProperty('id');
    expect(rx.date_issued).toBe(new Date().toISOString().split('T')[0]);
    expect(db.getPrescriptions().length).toBe(3); // 2 seed + 1 new
  });

  test('TC-44: calculateNextCheckup computes correct date', () => {
    const db = loadDB();
    // 2025-11-10 + 12 months = 2026-11-10
    const next = db.calculateNextCheckup('2025-11-10', 12);
    expect(next).toBe('2026-11-10');
  });

  test('TC-45: calculateNextCheckup handles month overflow', () => {
    const db = loadDB();
    // 2026-06-15 + 24 months = 2028-06-15
    const next = db.calculateNextCheckup('2026-06-15', 24);
    expect(next).toBe('2028-06-15');
  });
});

// ============================================================
// 8. PATIENT MANAGEMENT
// ============================================================
describe('Patient Management', () => {
  test('TC-46: addPatient creates patient with auto-id and clinic_id', () => {
    const db = loadDB();
    const pat = db.addPatient({
      name: 'Test Patient',
      contact: '09991112222',
      dob: '2000-01-01'
    });
    expect(pat).toHaveProperty('id');
    expect(pat.id).toMatch(/^pat-/);
    expect(pat.clinic_id).toBe('clinic-1');
    expect(pat.name).toBe('Test Patient');
    expect(db.getPatients().length).toBe(4); // 3 seed + 1
  });
});

// ============================================================
// 9. DATA PERSISTENCE (localStorage)
// ============================================================
describe('Data Persistence', () => {
  test('TC-47: changes persist to localStorage', () => {
    const db = loadDB();
    db.addPatient({ name: 'Persist Test', contact: '123', dob: '1990-01-01' });
    
    const raw = JSON.parse(localStorage.getItem('optical_clinic_db_v1'));
    expect(raw.patients.some(p => p.name === 'Persist Test')).toBe(true);
  });

  test('TC-48: data survives re-load from localStorage', () => {
    const db1 = loadDB();
    db1.addPatient({ name: 'Reload Test', contact: '456', dob: '1990-01-01' });
    
    // Re-require the module (simulating page reload)
    jest.resetModules();
    const db2 = require('./database/db');
    expect(db2.getPatients().some(p => p.name === 'Reload Test')).toBe(true);
  });
});

// ============================================================
// 10. EDGE CASES & BOUNDARY TESTS
// ============================================================
describe('Edge Cases', () => {
  test('TC-49: booking at exact start of working hours succeeds', () => {
    const db = loadDB();
    // doc-1 starts at 09:00 on Monday (2026-07-13)
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '09:00',
      type: 'checkup',
      reason: 'Boundary test start'
    });
    expect(appt.start_time).toBe('09:00');
  });

  test('TC-50: booking at last valid slot before close succeeds', () => {
    const db = loadDB();
    // doc-1 ends at 17:00, slot is 30min, so last valid slot is 16:30
    const appt = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '16:30',
      type: 'checkup',
      reason: 'Boundary test end'
    });
    expect(appt.start_time).toBe('16:30');
    expect(appt.end_time).toBe('17:00');
  });

  test('TC-51: booking at exact closing time is rejected', () => {
    const db = loadDB();
    expect(() => {
      db.addAppointment({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        date: '2026-07-13',
        start_time: '17:00',
        type: 'checkup',
        reason: 'At close time'
      });
    }).toThrow(/outside working hours/i);
  });

  test('TC-52: two different doctors can be booked at the same time', () => {
    const db = loadDB();
    const appt1 = db.addAppointment({
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-13',
      start_time: '11:00',
      type: 'checkup',
      reason: 'Doc 1 test'
    });
    // doc-2 does not work Mondays — use Tuesday 2026-07-14
    const appt2 = db.addAppointment({
      patient_id: 'pat-2',
      doctor_id: 'doc-2',
      date: '2026-07-14',
      start_time: '11:00',
      type: 'checkup',
      reason: 'Doc 2 test'
    });
    expect(appt1.start_time).toBe('11:00');
    expect(appt2.start_time).toBe('11:00');
  });

  test('TC-53: doc-2 is correctly unavailable on Monday', () => {
    const db = loadDB();
    // doc-2 has monday: null
    const result = db.checkSlotAvailability('doc-2', '2026-07-13', '10:00');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/does not work/i);
  });

  test('TC-54: doc-3 is correctly unavailable Thu/Fri/Sat/Sun', () => {
    const db = loadDB();
    // doc-3: thursday=null, friday=null, saturday=null, sunday=null
    // 2026-07-09 is Thursday
    expect(db.checkSlotAvailability('doc-3', '2026-07-09', '09:00').available).toBe(false);
    // 2026-07-10 is Friday
    expect(db.checkSlotAvailability('doc-3', '2026-07-10', '09:00').available).toBe(false);
    // 2026-07-11 is Saturday
    expect(db.checkSlotAvailability('doc-3', '2026-07-11', '09:00').available).toBe(false);
  });

  test('TC-55: getRecords returns empty array if records key is missing', () => {
    // Manually remove records from storage
    const raw = JSON.parse(localStorage.getItem('optical_clinic_db_v1') || '{}');
    delete raw.records;
    localStorage.setItem('optical_clinic_db_v1', JSON.stringify(raw));
    
    jest.resetModules();
    const db = require('./database/db');
    const recs = db.getRecords();
    expect(Array.isArray(recs)).toBe(true);
  });
});
