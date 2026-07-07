import React, { useState, useEffect } from 'react';
import { 
  getDoctors, 
  getAppointments, 
  getPrescriptions, 
  addAppointment, 
  checkSlotAvailability, 
  calculateNextCheckup 
} from './db';

export default function PatientPortal({ patient, onRefreshTrigger }) {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Available timeslots cache
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    setDoctors(getDoctors());
    // Filter to only this patient's data
    setAppointments(getAppointments().filter(a => a.patient_id === patient.id));
    setPrescriptions(getPrescriptions().filter(p => p.patient_id === patient.id));
    
    if (getDoctors().length > 0) {
      setSelectedDoctorId(getDoctors()[0].id);
    }
  }, [patient, activeTab]);

  // Generate available timeslots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !bookingDate) {
      setAvailableSlots([]);
      return;
    }

    const doc = doctors.find(d => d.id === selectedDoctorId);
    if (!doc) return;

    const dayOfWeek = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = doc.working_hours[dayOfWeek];

    if (!hours) {
      setAvailableSlots([]);
      return;
    }

    // Generate timeslots every 30 minutes
    const slots = [];
    let current = hours.start;
    const end = hours.end;

    while (current < end) {
      const check = checkSlotAvailability(selectedDoctorId, bookingDate, current);
      slots.push({
        time: current,
        available: check.available,
        reason: check.reason
      });

      // Advance by 30 mins
      let [h, m] = current.split(':').map(Number);
      m += 30;
      if (m >= 60) {
        m -= 60;
        h += 1;
      }
      current = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    setAvailableSlots(slots);
    setSelectedTime(''); // Reset selection
  }, [selectedDoctorId, bookingDate, doctors]);

  // Find next upcoming appointment
  const upcomingAppointment = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'checked-in')
    .sort((a, b) => new Date(`${a.date}T${a.start_time}`) - new Date(`${b.date}T${b.start_time}`))[0];

  // Find latest prescription
  const latestRx = prescriptions.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued))[0];

  // Calculate next checkup status
  let checkupStatus = { text: 'No prescription history', color: 'badge-info' };
  if (latestRx) {
    const dueDateStr = calculateNextCheckup(latestRx.date_issued, latestRx.validity_months);
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      checkupStatus = { text: `Overdue (Due: ${dueDateStr})`, color: 'badge-error' };
    } else if (diffDays <= 30) {
      checkupStatus = { text: `Due Soon (Due: ${dueDateStr})`, color: 'badge-warning' };
    } else {
      checkupStatus = { text: `Up to date (Next checkup: ${dueDateStr})`, color: 'badge-success' };
    }
  }

  const handleBooking = (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (!bookingDate || !selectedTime || !selectedDoctorId) {
      setBookingError('Please fill out all booking fields.');
      return;
    }

    try {
      addAppointment({
        patient_id: patient.id,
        doctor_id: selectedDoctorId,
        date: bookingDate,
        start_time: selectedTime,
        type: bookingType,
        reason: bookingReason
      });

      setBookingSuccess('Appointment booked successfully!');
      setBookingReason('');
      setBookingDate('');
      setSelectedTime('');
      onRefreshTrigger(); // trigger updates in parent UI
      
      // Navigate back to dashboard after 1.5s
      setTimeout(() => {
        setActiveTab('dashboard');
        setBookingSuccess('');
      }, 1500);
    } catch (err) {
      setBookingError(err.message || 'Failed to book slot.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub Header / Welcome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Hello, {patient.name} 👋</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Welcome to your Patient Portal. Manage bookings and view optical records.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn-secondary ${activeTab === 'dashboard' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Dashboard
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'book' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('book')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Book Appointment
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'prescriptions' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            My Prescriptions
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Summary Status Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Appointment Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)' }}>Next Appointment</span>
                <span className="badge badge-success">Active</span>
              </div>
              {upcomingAppointment ? (
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
                    {doctors.find(d => d.id === upcomingAppointment.doctor_id)?.name || 'Optometrist'}
                  </h3>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                    📅 {upcomingAppointment.date} at {upcomingAppointment.start_time}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Reason: "{upcomingAppointment.reason}"
                  </p>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '8px' }}>No upcoming booking</h3>
                  <button className="btn-primary" onClick={() => setActiveTab('book')} style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', marginTop: '8px' }}>
                    Book One Now
                  </button>
                </div>
              )}
            </div>

            {/* Checkup status card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)' }}>Checkup Status</span>
                <span className={`badge ${checkupStatus.color}`}>{checkupStatus.text}</span>
              </div>
              {latestRx ? (
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Prescription Validity</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Last Issued: {latestRx.date_issued}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Based on standard {latestRx.validity_months}-month prescription lifespan.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>No prescription</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Book an appointment for an eye refraction checkup.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Eye Prescription Quick Card */}
          {latestRx && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.3rem' }}>Latest Prescription Specs</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Optometrist: {doctors.find(d => d.id === latestRx.doctor_id)?.name || 'Doctor'}
                </span>
              </div>

              {/* Optical Prescription Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Eye</th>
                      <th style={{ padding: '10px' }}>Sphere (SPH)</th>
                      <th style={{ padding: '10px' }}>Cylinder (CYL)</th>
                      <th style={{ padding: '10px' }}>Axis</th>
                      <th style={{ padding: '10px' }}>Add (ADD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'left' }}>Right (OD)</td>
                      <td style={{ padding: '12px' }}>{latestRx.od_sphere}</td>
                      <td style={{ padding: '12px' }}>{latestRx.od_cylinder}</td>
                      <td style={{ padding: '12px' }}>{latestRx.od_axis}°</td>
                      <td style={{ padding: '12px' }}>{latestRx.od_add}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'left' }}>Left (OS)</td>
                      <td style={{ padding: '12px' }}>{latestRx.os_sphere}</td>
                      <td style={{ padding: '12px' }}>{latestRx.os_cylinder}</td>
                      <td style={{ padding: '12px' }}>{latestRx.os_axis}°</td>
                      <td style={{ padding: '12px' }}>{latestRx.os_add}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Pupillary Distance (PD): </span>
                  <span>{latestRx.pd} mm</span>
                </div>
                {latestRx.notes && (
                  <div style={{ width: '100%', fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                    *Notes: {latestRx.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Appointment History List */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Appointment History</h3>
            {appointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {appointments
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(appt => {
                    const doc = doctors.find(d => d.id === appt.doctor_id);
                    let badgeClass = 'badge-info';
                    if (appt.status === 'attended') badgeClass = 'badge-success';
                    if (appt.status === 'cancelled') badgeClass = 'badge-error';
                    if (appt.status === 'checked-in') badgeClass = 'badge-warning';

                    return (
                      <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{doc?.name || 'Optometrist'}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {appt.date} • {appt.start_time} • {appt.type.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`badge ${badgeClass}`}>{appt.status}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No appointment history.</p>
            )}
          </div>

        </div>
      )}

      {/* BOOK APPOINTMENT TAB */}
      {activeTab === 'book' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Book Appointment Slot</h3>
          
          {bookingError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
              ⚠️ {bookingError}
            </div>
          )}

          {bookingSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
              🎉 {bookingSuccess}
            </div>
          )}

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Select Doctor */}
            <div>
              <label>Select Optometrist / Doctor</label>
              <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} - ({doc.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Select Date */}
              <div>
                <label>Select Appointment Date</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={bookingDate} 
                  onChange={e => setBookingDate(e.target.value)} 
                />
              </div>

              {/* Select Type */}
              <div>
                <label>Appointment Type</label>
                <select value={bookingType} onChange={e => setBookingType(e.target.value)}>
                  <option value="checkup">Routine Checkup</option>
                  <option value="follow_up">Follow-up Assessment</option>
                  <option value="walk_in">Walk-in Inquiry</option>
                </select>
              </div>
            </div>

            {/* Select Time Slots (Grid) */}
            {bookingDate && (
              <div>
                <label>Choose an Available Timeslot</label>
                {availableSlots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginTop: '8px' }}>
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: selectedTime === slot.time ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          background: selectedTime === slot.time 
                            ? 'var(--accent-glow)' 
                            : slot.available ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                          color: slot.available ? 'var(--text-primary)' : 'var(--text-muted)',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          fontSize: '0.85rem',
                          opacity: slot.available ? 1 : 0.6
                        }}
                        title={!slot.available ? slot.reason : 'Slot available'}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '6px', fontWeight: 500 }}>
                    ❌ This doctor is not practicing/available on this day of the week. Please choose another date.
                  </p>
                )}
              </div>
            )}

            {/* Visit Reason */}
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
              type="submit" 
              className="btn-primary" 
              disabled={!selectedTime || !bookingDate} 
              style={{ width: '100%', padding: '12px', marginTop: '10px', opacity: (!selectedTime || !bookingDate) ? 0.6 : 1 }}
            >
              Confirm Booking
            </button>
          </form>
        </div>
      )}

      {/* PRESCRIPTIONS TAB */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.4rem' }}>Optical Prescription History</h3>
          {prescriptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {prescriptions
                .sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued))
                .map((rx, idx) => {
                  const doc = doctors.find(d => d.id === rx.doctor_id);
                  const isLatest = idx === 0;

                  return (
                    <div key={rx.id} className="glass-panel" style={{ padding: '24px', border: isLatest ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Prescription Issued on {rx.date_issued}
                            {isLatest && <span className="badge badge-success">Latest Specs</span>}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Prescribed by: {doc?.name || 'Optometrist'} ({doc?.specialty})
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>NEXT CHECKUP DUE:</span>
                          <p style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                            {calculateNextCheckup(rx.date_issued, rx.validity_months)}
                          </p>
                        </div>
                      </div>

                      {/* RX details table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Eye</th>
                              <th style={{ padding: '8px' }}>Sphere (SPH)</th>
                              <th style={{ padding: '8px' }}>Cylinder (CYL)</th>
                              <th style={{ padding: '8px' }}>Axis</th>
                              <th style={{ padding: '8px' }}>Add (ADD)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'left' }}>Right (OD)</td>
                              <td style={{ padding: '10px' }}>{rx.od_sphere}</td>
                              <td style={{ padding: '10px' }}>{rx.od_cylinder}</td>
                              <td style={{ padding: '10px' }}>{rx.od_axis}°</td>
                              <td style={{ padding: '10px' }}>{rx.od_add}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'left' }}>Left (OS)</td>
                              <td style={{ padding: '10px' }}>{rx.os_sphere}</td>
                              <td style={{ padding: '10px' }}>{rx.os_cylinder}</td>
                              <td style={{ padding: '10px' }}>{rx.os_axis}°</td>
                              <td style={{ padding: '10px' }}>{rx.os_add}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '8px', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Pupillary Distance (PD): </span>
                          <span>{rx.pd} mm</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Validity Period: </span>
                          <span>{rx.validity_months} months</span>
                        </div>
                      </div>

                      {rx.notes && (
                        <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          <strong>Notes:</strong> {rx.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No prescriptions found on record.</p>
          )}
        </div>
      )}

    </div>
  );
}
