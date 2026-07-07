import React, { useState, useEffect } from 'react';
import { CLINIC_CONFIG } from './config';
import { 
  getDoctors, 
  getAppointments, 
  getPrescriptions, 
  addAppointment, 
  checkSlotAvailability, 
  calculateNextCheckup 
} from './db';

export default function PatientPortal({ patient, onRefreshTrigger, activeTab, setActiveTab }) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingType, setBookingType] = useState('checkup');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    setDoctors(getDoctors());
    setAppointments(getAppointments().filter(a => a.patient_id === patient.id));
    setPrescriptions(getPrescriptions().filter(p => p.patient_id === patient.id));
    if (getDoctors().length > 0) setSelectedDoctorId(getDoctors()[0].id);
  }, [patient, activeTab]);

  // Generate timeslots
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

  const upcomingAppointment = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'checked-in')
    .sort((a, b) => new Date(`${a.date}T${a.start_time}`) - new Date(`${b.date}T${b.start_time}`))[0];

  const latestRx = prescriptions.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued))[0];

  let checkupStatus = { text: 'No prescription history', color: 'badge-info', icon: 'ℹ️' };
  if (latestRx) {
    const dueDateStr = calculateNextCheckup(latestRx.date_issued, latestRx.validity_months);
    const diffDays = Math.ceil((new Date(dueDateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) checkupStatus = { text: `Overdue — Due: ${dueDateStr}`, color: 'badge-error badge-dot', icon: '🔴' };
    else if (diffDays <= 30) checkupStatus = { text: `Due Soon — ${dueDateStr}`, color: 'badge-warning badge-dot', icon: '🟡' };
    else checkupStatus = { text: `Up to date — Next: ${dueDateStr}`, color: 'badge-success badge-dot', icon: '🟢' };
  }

  const handleBooking = (e) => {
    e.preventDefault();
    setBookingError(''); setBookingSuccess('');
    if (!bookingDate || !selectedTime || !selectedDoctorId) { setBookingError('Please fill out all booking fields.'); return; }
    try {
      addAppointment({
        patient_id: patient.id, doctor_id: selectedDoctorId,
        date: bookingDate, start_time: selectedTime, type: bookingType, reason: bookingReason
      });
      setBookingSuccess('Appointment booked successfully!');
      setBookingReason(''); setBookingDate(''); setSelectedTime('');
      onRefreshTrigger();
      setTimeout(() => { setActiveTab('dashboard'); setBookingSuccess(''); }, 1500);
    } catch (err) { setBookingError(err.message || 'Failed to book slot.'); }
  };

  // === RENDER ===
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* =================== DASHBOARD TAB =================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* Welcome banner */}
          <div className="card card-accent card-padded animate-fade-in" style={{ 
            background: 'var(--accent-gradient-soft)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome back, {patient.name.split(' ')[0]} 👋</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                  Here's your eye care summary. Stay on top of your optical health.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('book')} style={{ padding: '10px 20px' }}>
                📅 Book Appointment
              </button>
            </div>
          </div>

          {/* Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Next Appointment */}
            <div className="card stat-card animate-fade-in-delay-1">
              <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>📅</div>
              <div className="stat-label">Next Appointment</div>
              {upcomingAppointment ? (
                <>
                  <div className="stat-value" style={{ color: 'var(--info)', fontSize: '1.3rem' }}>
                    {doctors.find(d => d.id === upcomingAppointment.doctor_id)?.name || 'Optometrist'}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {upcomingAppointment.date} at {upcomingAppointment.start_time}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No upcoming booking</p>
              )}
            </div>

            {/* Checkup Status */}
            <div className="card stat-card animate-fade-in-delay-2">
              <div className="stat-icon" style={{ 
                background: checkupStatus.color.includes('error') ? 'var(--error-bg)' : 
                  checkupStatus.color.includes('warning') ? 'var(--warning-bg)' : 'var(--success-bg)',
                color: checkupStatus.color.includes('error') ? 'var(--error)' : 
                  checkupStatus.color.includes('warning') ? 'var(--warning)' : 'var(--success)'
              }}>
                {checkupStatus.icon}
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
            <div className="card stat-card animate-fade-in-delay-3">
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>👓</div>
              <div className="stat-label">Prescriptions on File</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{prescriptions.length}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {appointments.length} total appointments
              </p>
            </div>
          </div>

          {/* Latest Prescription Quick Card */}
          {latestRx && (
            <div className="card card-padded animate-fade-in-delay-2">
              <div className="section-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Latest Prescription
                    <span className="badge badge-success">Current</span>
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Prescribed by {doctors.find(d => d.id === latestRx.doctor_id)?.name || 'Optometrist'}
                  </p>
                </div>
                <button className="btn-ghost" onClick={() => setActiveTab('prescriptions')}>
                  View All →
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
                {/* Right Eye */}
                <div className="rx-eye-card">
                  <div className="lens-diagram">OD</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Right Eye (OD)</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                      {latestRx.od_sphere} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>SPH</span>
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Cyl: <strong>{latestRx.od_cylinder}</strong> · Axis: <strong>{latestRx.od_axis}°</strong>
                    </p>
                  </div>
                </div>

                {/* Left Eye */}
                <div className="rx-eye-card">
                  <div className="lens-diagram">OS</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Left Eye (OS)</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                      {latestRx.os_sphere} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>SPH</span>
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Cyl: <strong>{latestRx.os_cylinder}</strong> · Axis: <strong>{latestRx.os_axis}°</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '12px 0 0', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>PD: <strong>{latestRx.pd} mm</strong></span>
                <span>Add OD: <strong>{latestRx.od_add}</strong></span>
                <span>Add OS: <strong>{latestRx.os_add}</strong></span>
              </div>
            </div>
          )}

          {/* Appointment History */}
          <div className="card card-padded">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Appointment History</h3>
            {appointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {appointments
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(appt => {
                    const doc = doctors.find(d => d.id === appt.doctor_id);
                    let badgeClass = 'badge-info';
                    if (appt.status === 'attended') badgeClass = 'badge-success';
                    if (appt.status === 'cancelled') badgeClass = 'badge-error';
                    if (appt.status === 'checked-in') badgeClass = 'badge-warning';

                    return (
                      <div key={appt.id} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '14px 16px', borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                        transition: 'all 0.15s ease', flexWrap: 'wrap', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: appt.status === 'attended' ? 'var(--success)' : 
                              appt.status === 'cancelled' ? 'var(--error)' : 'var(--info)',
                            flexShrink: 0
                          }} />
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc?.name || 'Optometrist'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {appt.date} · {appt.start_time} · {appt.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span className={`badge ${badgeClass}`}>{appt.status}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No appointment history yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================== BOOK APPOINTMENT TAB =================== */}
      {activeTab === 'book' && (
        <div className="card card-accent card-padded animate-fade-in" style={{ maxWidth: '800px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Book Appointment Slot</h3>
          
          {bookingError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {bookingError}</div>}
          {bookingSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>🎉 {bookingSuccess}</div>}

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label>Select Optometrist / Doctor</label>
              <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} — {doc.specialty}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label>Appointment Date</label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
              </div>
              <div>
                <label>Appointment Type</label>
                <select value={bookingType} onChange={e => setBookingType(e.target.value)}>
                  <option value="checkup">Routine Checkup</option>
                  <option value="follow_up">Follow-up Assessment</option>
                  <option value="walk_in">Walk-in Inquiry</option>
                </select>
              </div>
            </div>

            {bookingDate && (
              <div>
                <label>Choose an Available Timeslot</label>
                {availableSlots.length > 0 ? (
                  <div className="timeslot-grid" style={{ marginTop: '8px' }}>
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`timeslot-btn ${
                          selectedTime === slot.time ? 'selected' : 
                          slot.available ? 'available' : 'taken'
                        }`}
                        title={!slot.available ? slot.reason : 'Slot available'}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '6px', fontWeight: 500 }}>
                    Doctor is not available on this day. Choose another date.
                  </p>
                )}
              </div>
            )}

            <div>
              <label>Reason for Visit</label>
              <textarea 
                rows="3" 
                placeholder="Describe any vision issues or reasons for checkup..." 
                value={bookingReason} 
                onChange={e => setBookingReason(e.target.value)}
              />
            </div>

            <button 
              type="submit" className="btn-primary" 
              disabled={!selectedTime || !bookingDate} 
              style={{ width: '100%', padding: '13px', opacity: (!selectedTime || !bookingDate) ? 0.5 : 1 }}
            >
              Confirm Booking
            </button>
          </form>
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
                    style={{ border: isLatest ? '1.5px solid var(--accent-primary)' : undefined }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          Issued: {rx.date_issued}
                          {isLatest && <span className="badge badge-success">Latest</span>}
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          By: {doc?.name || 'Optometrist'} ({doc?.specialty})
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next Checkup</span>
                        <p style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                          {calculateNextCheckup(rx.date_issued, rx.validity_months)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div className="rx-eye-card">
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

                      <div className="rx-eye-card">
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

                    {/* Detailed specs table */}
                    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Eye</th><th>Sphere</th><th>Cylinder</th><th>Axis</th><th>Add</th>
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
                      <span>PD: <strong>{rx.pd} mm</strong></span>
                      <span>Validity: <strong>{rx.validity_months} months</strong></span>
                    </div>

                    {rx.notes && (
                      <div style={{ marginTop: '14px', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                        <strong>Notes:</strong> {rx.notes}
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
    </div>
  );
}
