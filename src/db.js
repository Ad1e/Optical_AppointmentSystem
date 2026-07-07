// Simulated Database Layer for Optical Clinic System
// Backed by localStorage to persist data across page reloads.
import { CLINIC_CONFIG } from './config';

const LOCAL_STORAGE_KEY = 'optical_clinic_db_v1';

// Initial Seed Data
const seedData = {
  clinics: [
    {
      id: 'clinic-1',
      name: 'OptiCare Vision Center - Manila',
      address: 'Suite 302, Medical Plaza, Ermita, Manila',
      phone: '+63 2 8123 4567',
      email: 'manila@opticare.ph'
    }
  ],
  doctors: [
    {
      id: 'doc-1',
      name: 'Dr. Sarah Santos, OD',
      specialty: 'Primary Eye Care & Contact Lenses',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
      working_hours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '09:00', end: '13:00' },
        sunday: null
      },
      clinic_id: 'clinic-1'
    },
    {
      id: 'doc-2',
      name: 'Dr. Marcus Cruz, OD',
      specialty: 'Pediatric Optometry & Vision Therapy',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
      working_hours: {
        monday: null,
        tuesday: { start: '10:00', end: '18:00' },
        wednesday: { start: '10:00', end: '18:00' },
        thursday: { start: '10:00', end: '18:00' },
        friday: { start: '10:00', end: '18:00' },
        saturday: { start: '10:00', end: '18:00' },
        sunday: null
      },
      clinic_id: 'clinic-1'
    },
    {
      id: 'doc-3',
      name: 'Dr. Angela Lim, OD',
      specialty: 'Geriatric Care & Low Vision Specialist',
      avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
      working_hours: {
        monday: { start: '08:30', end: '16:30' },
        tuesday: { start: '08:30', end: '16:30' },
        wednesday: { start: '08:30', end: '16:30' },
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null
      },
      clinic_id: 'clinic-1'
    }
  ],
  patients: [
    {
      id: 'pat-1',
      name: 'Juan Dela Cruz',
      contact: '09171234567',
      dob: '1990-05-15',
      email: 'juan@example.com',
      clinic_id: 'clinic-1'
    },
    {
      id: 'pat-2',
      name: 'Maria Clara',
      contact: '09187654321',
      dob: '1995-10-22',
      email: 'maria@example.com',
      clinic_id: 'clinic-1'
    },
    {
      id: 'pat-3',
      name: 'Jose Rizal',
      contact: '09228889999',
      dob: '1985-06-19',
      email: 'jose.rizal@example.com',
      clinic_id: 'clinic-1'
    }
  ],
  prescriptions: [
    {
      id: 'rx-1',
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date_issued: '2025-11-10',
      validity_months: 12,
      // OD - Right Eye
      od_sphere: '-1.75',
      od_cylinder: '-0.50',
      od_axis: '180',
      od_add: '+1.50',
      // OS - Left Eye
      os_sphere: '-2.00',
      os_cylinder: '-0.75',
      os_axis: '175',
      os_add: '+1.50',
      pd: '63',
      notes: 'Anti-radiation coating suggested for screen work.'
    },
    {
      id: 'rx-2',
      patient_id: 'pat-2',
      doctor_id: 'doc-2',
      date_issued: '2026-02-14',
      validity_months: 12,
      od_sphere: '+0.50',
      od_cylinder: 'DS',
      od_axis: '0',
      od_add: '0.00',
      os_sphere: '+0.25',
      os_cylinder: '-0.25',
      os_axis: '90',
      os_add: '0.00',
      pd: '60',
      notes: 'Reading glasses only.'
    }
  ],
  appointments: [
    {
      id: 'apt-1',
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      date: '2026-07-08',
      start_time: '10:00',
      end_time: '10:30',
      status: 'scheduled', // scheduled, checked-in, attended, cancelled, no-show
      type: 'checkup',
      reason: 'Routine vision assessment'
    },
    {
      id: 'apt-2',
      patient_id: 'pat-2',
      doctor_id: 'doc-2',
      date: '2026-07-08',
      start_time: '14:00',
      end_time: '14:30',
      status: 'checked-in',
      type: 'follow_up',
      reason: 'Check custom contact lenses fit'
    }
  ],
  schedule_overrides: [
    {
      id: 'ovr-1',
      doctor_id: 'doc-1',
      date: '2026-07-15',
      is_available: false,
      note: 'Optometry Conference'
    }
  ]
};

// Initialize DB from Local Storage or Seed
const loadDB = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load local storage', e);
  }
  
  // Set seed data
  saveDB(seedData);
  return seedData;
};

const saveDB = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

// State
let db = loadDB();

// Core DB operations
export const getClinics = () => db.clinics;
export const getDoctors = () => db.doctors;
export const getPatients = () => db.patients;
export const getAppointments = () => db.appointments;
export const getPrescriptions = () => db.prescriptions;
export const getOverrides = () => db.schedule_overrides;

export const addPatient = (patient) => {
  const newPatient = {
    id: `pat-${Date.now()}`,
    clinic_id: 'clinic-1',
    ...patient
  };
  db.patients.push(newPatient);
  saveDB(db);
  return newPatient;
};

export const updateAppointmentStatus = (appointmentId, status) => {
  const app = db.appointments.find(a => a.id === appointmentId);
  if (app) {
    app.status = status;
    saveDB(db);
  }
  return app;
};

export const addOverride = (override) => {
  const newOverride = {
    id: `ovr-${Date.now()}`,
    ...override
  };
  db.schedule_overrides.push(newOverride);
  saveDB(db);
  return newOverride;
};

export const removeOverride = (id) => {
  db.schedule_overrides = db.schedule_overrides.filter(o => o.id !== id);
  saveDB(db);
};

export const addPrescription = (prescription) => {
  const newRx = {
    id: `rx-${Date.now()}`,
    date_issued: new Date().toISOString().split('T')[0],
    ...prescription
  };
  db.prescriptions.push(newRx);
  saveDB(db);
  return newRx;
};

// Check if a specific slot is booked or blocked by an override/working hours
export const checkSlotAvailability = (doctorId, dateStr, timeStr) => {
  const doc = db.doctors.find(d => d.id === doctorId);
  if (!doc) return { available: false, reason: 'Doctor not found' };

  // 1. Check overrides
  const dayOverride = db.schedule_overrides.find(o => o.doctor_id === doctorId && o.date === dateStr);
  if (dayOverride && !dayOverride.is_available) {
    return { available: false, reason: `Doctor unavailable: ${dayOverride.note}` };
  }

  // 2. Check general working hours for this weekday
  const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const schedule = doc.working_hours[dayOfWeek];
  if (!schedule) {
    return { available: false, reason: 'Doctor does not work on this day' };
  }

  // Compare times (format "HH:MM")
  if (timeStr < schedule.start || timeStr >= schedule.end) {
    return { available: false, reason: `Outside working hours (${schedule.start} - ${schedule.end})` };
  }

  // 3. Check existing appointments (excluding cancelled)
  const isConflict = db.appointments.some(appt => 
    appt.doctor_id === doctorId && 
    appt.date === dateStr && 
    appt.start_time === timeStr && 
    appt.status !== 'cancelled'
  );

  if (isConflict) {
    return { available: false, reason: 'Time slot already booked' };
  }

  return { available: true };
};

export const addAppointment = (appointment) => {
  // Confirm availability first
  const check = checkSlotAvailability(appointment.doctor_id, appointment.date, appointment.start_time);
  if (!check.available) {
    throw new Error(check.reason);
  }

  // Define end_time (dynamic duration based on config settings)
  const [hours, minutes] = appointment.start_time.split(':').map(Number);
  let endMin = minutes + CLINIC_CONFIG.scheduling.slotDurationMinutes;
  let endHour = hours;
  if (endMin >= 60) {
    const hoursAdded = Math.floor(endMin / 60);
    endMin = endMin % 60;
    endHour += hoursAdded;
  }
  const end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  const newAppt = {
    id: `apt-${Date.now()}`,
    status: 'scheduled',
    end_time,
    ...appointment
  };

  db.appointments.push(newAppt);
  saveDB(db);
  return newAppt;
};

// Helper to compute next checkup due date
export const calculateNextCheckup = (dateIssued, validityMonths) => {
  const date = new Date(dateIssued);
  date.setMonth(date.getMonth() + parseInt(validityMonths));
  return date.toISOString().split('T')[0];
};
