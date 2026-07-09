import React, { useState, useEffect } from 'react';
import { CLINIC_CONFIG } from '../config/config';
import { 
  getDoctors, 
  getAppointments, 
  getPrescriptions, 
  addAppointment, 
  checkSlotAvailability, 
  calculateNextCheckup,
  getRecords,
  rescheduleAppointment,
  updateAppointmentStatus
} from '../database/db';
import { Icons } from './Icons';

const opticareBanner = '/images/opticare_banner.png';
const retinalScan = '/images/retinal_scan.png';
const cornealTopography = '/images/corneal_topography.png';

export default function PatientPortal({ patient, onRefreshTrigger, activeTab, setActiveTab }) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);

  // Booking Stepper State
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingType, setBookingType] = useState('checkup');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Rescheduling State
  const [reschedulingApptId, setReschedulingApptId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');

  const services = [
    { id: "checkup", name: "Comprehensive Eye Exam", price: "₱1,200", duration: "30 mins", description: "Full digital diagnostic examination for corrective glasses and vision health check." },
    { id: "follow_up", name: "Contact Lens Fitting & Follow-Up", price: "₱1,500", duration: "45 mins", description: "Corneal measurement, trial lenses, and contact lens safety fitting." },
    { id: "walk_in", name: "Urgent Care & Eyewear Styling", price: "₱1,000", duration: "30 mins", description: "For sudden vision changes, irritation, or expert styling for frame upgrades." }
  ];

  // Refresh data on mount or tab change
  useEffect(() => {
    setDoctors(getDoctors());
    setAppointments(getAppointments().filter(a => a.patient_id === patient.id));
    setPrescriptions(getPrescriptions().filter(p => p.patient_id === patient.id));
    setRecords(getRecords().filter(r => r.patient_id === patient.id));
    if (getDoctors().length > 0) setSelectedDoctorId(getDoctors()[0].id);
    
    // Reset stepper when switching tabs
    setBookingStep(1);
    setBookingReceipt(null);
    setReschedulingApptId(null);
  }, [patient, activeTab]);

  // Generate available slots for booking
  useEffect(() => {
    if (!selectedDoctorId || !bookingDate) { setAvailableSlots([]); return; }
    const doc = doctors.find(d => d.id === selectedDoctorId);
    if (!doc) return;
    const dayOfWeek = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = doc.working_hours[dayOfWeek];
    if (!hours) { setAvailableSlots([]); return; }

    const slots = [];
    let current = hours.start;
    while (current < hours.end) {
      const check = checkSlotAvailability(selectedDoctorId, bookingDate, current);
      slots.push({ time: current, available: check.available, reason: check.reason });
      let [h, m] = current.split(':').map(Number);
      m += CLINIC_CONFIG.scheduling.slotDurationMinutes;
      if (m >= 60) { const ha = Math.floor(m / 60); m = m % 60; h += ha; }
      current = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    setAvailableSlots(slots);
    setSelectedTime('');
  }, [selectedDoctorId, bookingDate, doctors]);

  // Generate available slots for rescheduling
  useEffect(() => {
    if (!reschedulingApptId || !rescheduleDate) { setRescheduleSlots([]); return; }
    const appt = appointments.find(a => a.id === reschedulingApptId);
    if (!appt) return;
    const doc = doctors.find(d => d.id === appt.doctor_id);
    if (!doc) return;
    const dayOfWeek = new Date(rescheduleDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = doc.working_hours[dayOfWeek];
    if (!hours) { setRescheduleSlots([]); return; }

    const slots = [];
    let current = hours.start;
    while (current < hours.end) {
      const check = checkSlotAvailability(appt.doctor_id, rescheduleDate, current);
      const isCurrentSlot = appt.date === rescheduleDate && appt.start_time === current;
      slots.push({ time: current, available: check.available || isCurrentSlot, reason: check.reason });
      let [h, m] = current.split(':').map(Number);
      m += CLINIC_CONFIG.scheduling.slotDurationMinutes;
      if (m >= 60) { const ha = Math.floor(m / 60); m = m % 60; h += ha; }
      current = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    setRescheduleSlots(slots);
    setRescheduleTime('');
  }, [reschedulingApptId, rescheduleDate, doctors, appointments]);

  const upcomingAppointments = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'checked-in')
    .sort((a, b) => new Date(`${a.date}T${a.start_time}`) - new Date(`${b.date}T${b.start_time}`));

  const pastAppointments = appointments
    .filter(a => a.status !== 'scheduled' && a.status !== 'checked-in')
    .sort((a, b) => new Date(`${b.date}T${b.start_time}`) - new Date(`${a.date}T${a.start_time}`));

  const latestRx = prescriptions.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued))[0];

  let checkupStatus = { text: 'No prescription history', color: 'badge-info', icon: 'ℹ️' };
  if (latestRx) {
    const dueDateStr = calculateNextCheckup(latestRx.date_issued, latestRx.validity_months);
    const diffDays = Math.ceil((new Date(dueDateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) checkupStatus = { text: `Overdue — Due: ${dueDateStr}`, color: 'badge-error badge-dot', icon: '🔴' };
    else if (diffDays <= 30) checkupStatus = { text: `Due Soon — ${dueDateStr}`, color: 'badge-warning badge-dot', icon: '🟡' };
    else checkupStatus = { text: `Up to date — Next: ${dueDateStr}`, color: 'badge-success badge-dot', icon: '🟢' };
  }

  // Stepper Handlers
  const handleServiceSelect = (id) => {
    setBookingType(id);
    setBookingStep(2);
  };

  const handleDoctorSelect = (id) => {
    setSelectedDoctorId(id);
    setBookingStep(3);
  };

  const handleBooking = (e) => {
    if (e) e.preventDefault();
    setBookingError('');
    if (!bookingDate || !selectedTime || !selectedDoctorId) { 
      setBookingError('Please fill out all booking fields.'); 
      return; 
    }
    try {
      const appt = addAppointment({
        patient_id: patient.id, 
        doctor_id: selectedDoctorId,
        date: bookingDate, 
        start_time: selectedTime, 
        type: bookingType, 
        reason: bookingReason || `Routine ${bookingType}`
      });
      setBookingReceipt(appt);
      setBookingReason(''); 
      setBookingDate(''); 
      setSelectedTime('');
      onRefreshTrigger();
      setBookingStep(5);
    } catch (err) { 
      setBookingError(err.message || 'Failed to book slot.'); 
    }
  };

  // Rescheduling Handlers
  const handleStartReschedule = (apptId) => {
    const appt = appointments.find(a => a.id === apptId);
    if (appt) {
      setReschedulingApptId(apptId);
      setRescheduleDate(appt.date);
      setRescheduleTime(appt.start_time);
      setRescheduleError('');
      setRescheduleSuccess('');
    }
  };

  const handleConfirmReschedule = () => {
    setRescheduleError('');
    setRescheduleSuccess('');
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Please select a valid date and available time slot.');
      return;
    }
    try {
      rescheduleAppointment(reschedulingApptId, rescheduleDate, rescheduleTime);
      setRescheduleSuccess('Appointment rescheduled successfully!');
      onRefreshTrigger();
      setTimeout(() => {
        setReschedulingApptId(null);
        setRescheduleSuccess('');
      }, 1500);
    } catch (err) {
      setRescheduleError(err.message || 'Slot is unavailable.');
    }
  };

  // Cancellation Handler
  const handleCancelAppointment = (apptId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      updateAppointmentStatus(apptId, 'cancelled');
      onRefreshTrigger();
    }
  };

  const activeDoctor = doctors.find(d => d.id === selectedDoctorId);
  const activeService = services.find(s => s.id === bookingType);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* =================== DASHBOARD TAB =================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* Welcome banner */}
          <div className="card card-accent welcome-banner animate-fade-in" style={{ background: 'var(--accent-gradient-soft)' }}>
            <div className="welcome-banner-text">
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Welcome back, {patient.name.split(' ')[0]} 👋</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem', maxWidth: '500px' }}>
                Your visual health summary is ready. Review active slots, check prescription histories, or book a checkup.
              </p>
              <button className="btn-primary" onClick={() => setActiveTab('book')} style={{ padding: '10px 20px', marginTop: '16px' }}>
                Book Appointment
              </button>
            </div>
            <div className="welcome-banner-image" style={{ backgroundImage: `url(${opticareBanner})` }} />
          </div>

          {/* Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Next Appointment */}
            <div className="card stat-card animate-fade-in-delay-1" style={{ border: '1px solid var(--border-color)' }}>
              <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Calendar /></div>
              <div className="stat-label">Next Appointment</div>
              {upcomingAppointments.length > 0 ? (
                <>
                  <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '1.3rem' }}>
                    {doctors.find(d => d.id === upcomingAppointments[0].doctor_id)?.name || 'Optometrist'}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {upcomingAppointments[0].date} at {upcomingAppointments[0].start_time}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No upcoming booking</p>
              )}
            </div>

            {/* Checkup Status */}
            <div className="card stat-card animate-fade-in-delay-2" style={{ border: '1px solid var(--border-color)' }}>
              <div className="stat-icon" style={{ 
                background: checkupStatus.color.includes('error') ? 'var(--error-bg)' : 
                  checkupStatus.color.includes('warning') ? 'var(--warning-bg)' : 'var(--success-bg)',
                color: checkupStatus.color.includes('error') ? 'var(--error)' : 
                  checkupStatus.color.includes('warning') ? 'var(--warning)' : 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icons.Dashboard />
              </div>
              <div className="stat-label">Checkup Status</div>
              <span className={`badge ${checkupStatus.color}`} style={{ alignSelf: 'flex-start' }}>
                {checkupStatus.text}
              </span>
              {latestRx && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Last issued: {latestRx.date_issued}
                </p>
              )}
            </div>

            {/* Total Prescriptions */}
            <div className="card stat-card animate-fade-in-delay-3" style={{ border: '1px solid var(--border-color)' }}>
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Glasses /></div>
              <div className="stat-label">Prescriptions on File</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{prescriptions.length}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {appointments.length} total appointments
              </p>
            </div>
          </div>

          {/* Active / Rescheduling Appointments list */}
          <div className="card card-padded" style={{ border: '1px solid var(--border-color)' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Upcoming Scheduled Slots</h3>
            
            {reschedulingApptId && (
              <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px', border: '1px solid var(--accent-primary)' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>Reschedule Appointment</h4>
                {rescheduleError && <div className="alert alert-error" style={{ marginBottom: '12px' }}>⚠️ {rescheduleError}</div>}
                {rescheduleSuccess && <div className="alert alert-success" style={{ marginBottom: '12px' }}>🎉 {rescheduleSuccess}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>New Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Available Slots</label>
                    {rescheduleSlots.length > 0 ? (
                      <div className="timeslot-grid" style={{ marginTop: '8px' }}>
                        {rescheduleSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setRescheduleTime(slot.time)}
                            className={`timeslot-btn ${rescheduleTime === slot.time ? 'selected' : slot.available ? 'available' : 'taken'}`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Select a date to view available time slots.</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => setReschedulingApptId(null)}>Cancel</button>
                  <button className="btn-primary" onClick={handleConfirmReschedule} disabled={!rescheduleDate || !rescheduleTime}>Confirm Change</button>
                </div>
              </div>
            )}

            {upcomingAppointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.map(appt => {
                  const doc = doctors.find(d => d.id === appt.doctor_id);
                  return (
                    <div key={appt.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Calendar />
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '0.92rem' }}>{doc?.name || 'Optometrist'}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {appt.date} @ <strong>{appt.start_time} - {appt.end_time}</strong> · {services.find(s => s.id === appt.type)?.name || appt.type}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ghost" onClick={() => handleStartReschedule(appt.id)} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Reschedule</button>
                        <button className="btn-secondary" onClick={() => handleCancelAppointment(appt.id)} style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--error)' }}>Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-icon">📅</div>
                <p>No active scheduled appointments.</p>
              </div>
            )}
          </div>

          {/* Appointment History */}
          <div className="card card-padded" style={{ border: '1px solid var(--border-color)' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Appointment History</h3>
            {pastAppointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pastAppointments.map(appt => {
                  const doc = doctors.find(d => d.id === appt.doctor_id);
                  let badgeClass = 'badge-info';
                  if (appt.status === 'attended') badgeClass = 'badge-success';
                  if (appt.status === 'cancelled') badgeClass = 'badge-error';
                  if (appt.status === 'no-show') badgeClass = 'badge-error';

                  return (
                    <div key={appt.id} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '12px 16px', borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                      flexWrap: 'wrap', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: appt.status === 'attended' ? 'var(--success)' : 
                            appt.status === 'cancelled' ? 'var(--error)' : 'var(--text-muted)',
                          flexShrink: 0
                        }} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{doc?.name || 'Optometrist'}</p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {appt.date} · {appt.start_time} · {appt.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>{appt.status}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-icon">📋</div>
                <p>No appointment history yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================== GUIDED BOOK APPOINTMENT STEPS =================== */}
      {activeTab === 'book' && (
        <div className="card card-accent card-padded animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', border: '1px solid var(--border-color)' }}>
          
          {/* Guided progress indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20px', right: '20px', top: '15px', height: '2px', background: 'var(--border-color)', zIndex: 0 }} />
            
            {[1, 2, 3, 4, 5].map((num) => {
              const stepLabels = ["Service", "Doctor", "Schedule", "Details", "Receipt"];
              const isCurrent = bookingStep === num;
              const isCompleted = bookingStep > num;
              
              return (
                <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--accent-primary)' : isCompleted ? 'var(--accent-tertiary)' : 'var(--bg-secondary)',
                    border: '2px solid ' + (isCurrent || isCompleted ? 'var(--accent-primary)' : 'var(--border-color)'),
                    color: isCurrent ? 'white' : isCompleted ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>
                    {isCompleted ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: isCurrent ? 'bold' : 'normal', marginTop: '6px' }}>
                    {stepLabels[num - 1]}
                  </span>
                </div>
              );
            })}
          </div>

          {bookingError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {bookingError}</div>}

          {/* STEP 1: Select Service */}
          {bookingStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Select a Clinic Service</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Choose the type of optical or medical checkup you need.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {services.map(svc => (
                  <div 
                    key={svc.id} 
                    onClick={() => handleServiceSelect(svc.id)}
                    className="card card-padded" 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      border: bookingType === svc.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: bookingType === svc.id ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                      transition: 'all 0.2s ease',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px', textAlign: 'left' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{svc.name}</span>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px', lineHeight: 1.4 }}>{svc.description}</p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.15rem' }}>{svc.price}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{svc.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Choose Doctor */}
          {bookingStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Choose an Optometrist</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Select from our licensed clinical physicians.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {doctors.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => handleDoctorSelect(doc.id)}
                    className="card card-padded"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textCenter: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      border: selectedDoctorId === doc.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: selectedDoctorId === doc.id ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={doc.avatar} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <h5 style={{ fontWeight: 800, fontSize: '0.95rem' }}>{doc.name}</h5>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>{doc.specialty.split(' & ')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="btn-ghost" onClick={() => setBookingStep(1)} style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
                &larr; Back to Services
              </button>
            </div>
          )}

          {/* STEP 3: Pick Date & Time */}
          {bookingStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Select Schedule Date & Time</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Choose an available clinical slot.</p>
              </div>

              {activeDoctor && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <img src={activeDoctor.avatar} alt={activeDoctor.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{activeDoctor.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeDoctor.specialty}</p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Appointment Date</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={bookingDate} 
                    onChange={e => setBookingDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Choose Available Slot</label>
                  {bookingDate ? (
                    availableSlots.length > 0 ? (
                      <div className="timeslot-grid" style={{ marginTop: '8px' }}>
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`timeslot-btn ${selectedTime === slot.time ? 'selected' : slot.available ? 'available' : 'taken'}`}
                            title={!slot.available ? slot.reason : 'Slot available'}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '8px', fontWeight: 600 }}>Doctor is not available on this day.</p>
                    )
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Select date to check slots.</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContext: 'space-between', marginTop: '20px', width: '100%' }}>
                <button className="btn-ghost" onClick={() => setBookingStep(2)}>&larr; Back to Doctor</button>
                <button 
                  className="btn-primary" 
                  disabled={!bookingDate || !selectedTime}
                  onClick={() => setBookingStep(4)} 
                  style={{ marginLeft: 'auto' }}
                >
                  Verify Details &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Details & Reason */}
          {bookingStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Verify Details & Clinical Note</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Confirm your information and specify any symptoms.</p>
              </div>

              <div className="card card-padded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                  <span style={{ fontWeight: 'bold' }}>{patient.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Number:</span>
                  <span style={{ fontWeight: 'bold' }}>+63 {patient.contact}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Service:</span>
                  <span style={{ fontWeight: 'bold' }}>{activeService?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Doctor:</span>
                  <span style={{ fontWeight: 'bold' }}>{activeDoctor?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{bookingDate} at {selectedTime}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>Reason for Visit (Describe symptoms, blurriness, or frames style preferences)</label>
                <textarea 
                  rows="3" 
                  placeholder="Describe your eye concerns..." 
                  value={bookingReason} 
                  onChange={e => setBookingReason(e.target.value)}
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContext: 'space-between', marginTop: '20px', width: '100%' }}>
                <button className="btn-ghost" onClick={() => setBookingStep(3)}>&larr; Back to Schedule</button>
                <button className="btn-primary" onClick={handleBooking} style={{ marginLeft: 'auto' }}>
                  Confirm & Book Now
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Receipt Confirmation */}
          {bookingStep === 5 && bookingReceipt && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              <div style={{ fontSize: '3rem', color: 'var(--success)' }}>✓</div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Appointment Confirmed!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '440px', lineHeight: 1.5 }}>
                Your clinical checkup slot has been reserved. You can view, reschedule, or cancel this booking directly from your patient dashboard at any time.
              </p>

              <div className="card card-padded" style={{
                background: 'var(--bg-tertiary)',
                border: '1.5px dashed var(--accent-primary)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                  <span>TICKET ID:</span>
                  <span className="font-semibold" style={{ color: 'var(--accent-secondary)' }}>{bookingReceipt.id.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SERVICE:</span>
                    <p style={{ fontWeight: 'bold' }}>{activeService?.name}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DOCTOR:</span>
                    <p style={{ fontWeight: 'bold' }}>{activeDoctor?.name}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DATE & TIME:</span>
                    <p style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{bookingReceipt.date} @ {bookingReceipt.start_time} - {bookingReceipt.end_time}</p>
                  </div>
                </div>
              </div>

              <button className="btn-primary" onClick={() => setActiveTab('dashboard')} style={{ marginTop: '16px', padding: '12px 24px' }}>
                Go to Dashboard
              </button>
            </div>
          )}

        </div>
      )}

      {/* =================== PRESCRIPTIONS TAB =================== */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Optical Prescription History</h3>
          {prescriptions.length > 0 ? (
            prescriptions
              .sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued))
              .map((rx, idx) => {
                const doc = doctors.find(d => d.id === rx.doctor_id);
                const isLatest = idx === 0;

                return (
                  <div key={rx.id} className={`card card-padded animate-fade-in-delay-${Math.min(idx + 1, 3)}`} 
                    style={{ border: isLatest ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <div className="section-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <h4 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem' }}>
                          Prescription #{rx.id.toUpperCase()}
                          {isLatest && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Current / Active</span>}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Issued by <strong>{doc?.name || 'Optometrist'}</strong> on <strong>{rx.date_issued}</strong> (Validity: {rx.validity_months} months)
                        </p>
                      </div>
                      <div className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                        Next checkup: {calculateNextCheckup(rx.date_issued, rx.validity_months)}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
                      <div className="rx-eye-card" style={{ border: '1px solid var(--border-color)' }}>
                        <div className="lens-diagram">OD</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Right Eye (OD)</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                            {rx.od_sphere} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>SPH</span>
                          </p>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Cyl: <strong>{rx.od_cylinder}</strong> · Axis: <strong>{rx.od_axis}°</strong> · Add: {rx.od_add}
                          </p>
                        </div>
                      </div>

                      <div className="rx-eye-card" style={{ border: '1px solid var(--border-color)' }}>
                        <div className="lens-diagram">OS</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Left Eye (OS)</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                            {rx.os_sphere} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>SPH</span>
                          </p>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Cyl: <strong>{rx.os_cylinder}</strong> · Axis: <strong>{rx.os_axis}°</strong> · Add: {rx.os_add}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '16px' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Eye</th><th>Sphere (SPH)</th><th>Cylinder (CYL)</th><th>Axis</th><th>Add</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600 }}>Right (OD)</td>
                            <td>{rx.od_sphere}</td><td>{rx.od_cylinder}</td><td>{rx.od_axis}°</td><td>{rx.od_add}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }}>Left (OS)</td>
                            <td>{rx.os_sphere}</td><td>{rx.os_cylinder}</td><td>{rx.os_axis}°</td><td>{rx.os_add}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Pupillary Distance (PD): <strong>{rx.pd} mm</strong></span>
                      <span>Validity Period: <strong>{rx.validity_months} months</strong></span>
                    </div>

                    {rx.notes && (
                      <div style={{ marginTop: '14px', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)', borderLeft: '3px solid var(--accent-primary)' }}>
                        <strong>Diagnostic Notes:</strong> {rx.notes}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="card card-padded empty-state">
              <div className="empty-icon">👓</div>
              <p>No prescriptions found on record.</p>
            </div>
          )}
        </div>
      )}

      {/* =================== MEDICAL RECORDS TAB =================== */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="section-header">
            <h3 className="section-title">Diagnostic Scans & Retinal Images</h3>
            <span className="badge badge-info">{records.length} Scans Available</span>
          </div>

          {records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {records.map((rec) => {
                const imgSource = rec.image_key === 'retinal_scan' ? retinalScan : cornealTopography;

                return (
                  <div key={rec.id} className="card card-padded animate-fade-in" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '24px',
                    alignItems: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)'
                  }}>
                    {/* Scan Information */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <span className="badge badge-success" style={{ marginBottom: '8px' }}>Verified Record</span>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{rec.type}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                          Scan Date: <strong>{rec.date}</strong> | Doctor: <strong>{rec.doctor}</strong>
                        </p>
                      </div>

                      <div style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '16px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--border-color)',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        color: 'var(--text-secondary)'
                      }}>
                        <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Clinical Observations:</strong>
                        {rec.notes}
                      </div>
                    </div>

                    {/* Scan Image Container */}
                    <div style={{ 
                      position: 'relative',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      border: '1.5px solid var(--border-color)',
                      boxShadow: 'var(--shadow-md)',
                      background: '#040714',
                      height: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(rgba(13,148,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        pointerEvents: 'none',
                        zIndex: 2
                      }} />
                      
                      <img 
                        src={imgSource} 
                        alt={rec.type} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          opacity: 0.85
                        }} 
                      />

                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(10,14,26,0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        color: 'var(--accent-tertiary)',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        zIndex: 3
                      }}>
                        SYS_REF // {rec.id.toUpperCase()}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card card-padded empty-state">
              <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}><Icons.Document style={{ width: '48px', height: '48px' }} /></div>
              <p style={{ marginTop: '12px' }}>No medical scans or diagnostic images found on record.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
