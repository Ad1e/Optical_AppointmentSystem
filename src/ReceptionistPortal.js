import React, { useState, useEffect } from 'react';
import { 
  getPatients, 
  getAppointments, 
  getDoctors, 
  addPatient, 
  addAppointment, 
  updateAppointmentStatus,
  checkSlotAvailability 
} from './db';

export default function ReceptionistPortal({ onRefreshTrigger }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Walk-in Form State
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinContact, setWalkinContact] = useState('');
  const [walkinDob, setWalkinDob] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [walkinType, setWalkinType] = useState('walk_in');
  const [walkinReason, setWalkinReason] = useState('Routine eye assessment');
  const [walkinError, setWalkinError] = useState('');
  const [walkinSuccess, setWalkinSuccess] = useState('');

  // Date Filter (Reception looks at selected date, defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setPatients(getPatients());
    setAppointments(getAppointments());
    const docs = getDoctors();
    setDoctors(docs);
    if (docs.length > 0 && !selectedDocId) {
      setSelectedDocId(docs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWalkinForm, activeTab, selectedDate]);

  const handleRegisterWalkin = (e) => {
    e.preventDefault();
    setWalkinError('');
    setWalkinSuccess('');

    if (!walkinName || !walkinContact || !walkinDob || !selectedDocId) {
      setWalkinError('Please complete all form fields.');
      return;
    }

    try {
      // 1. Create Patient Record
      const newPatient = addPatient({
        name: walkinName,
        contact: walkinContact,
        dob: walkinDob
      });

      // 2. Find first available timeslot for this doctor today
      const doc = doctors.find(d => d.id === selectedDocId);
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hours = doc.working_hours[dayOfWeek];
      
      if (!hours) {
        throw new Error(`Doctor is not practicing today (${dayOfWeek}). Please choose another date or doctor.`);
      }

      let testTime = hours.start;
      let slotFound = false;

      while (testTime < hours.end) {
        const check = checkSlotAvailability(selectedDocId, selectedDate, testTime);
        if (check.available) {
          slotFound = true;
          break;
        }

        // Advance by 30 mins
        let [h, m] = testTime.split(':').map(Number);
        m += 30;
        if (m >= 60) {
          m -= 60;
          h += 1;
        }
        testTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      if (!slotFound) {
        throw new Error('No available timeslot found for this doctor today. Please choose another doctor.');
      }

      // 3. Book appointment
      addAppointment({
        patient_id: newPatient.id,
        doctor_id: selectedDocId,
        date: selectedDate,
        start_time: testTime,
        type: walkinType,
        reason: walkinReason
      });

      setWalkinSuccess(`Successfully registered ${walkinName} and booked slot at ${testTime}!`);
      onRefreshTrigger();
      
      // Clear form
      setWalkinName('');
      setWalkinContact('');
      setWalkinDob('');

      setTimeout(() => {
        setWalkinSuccess('');
        setShowWalkinForm(false);
        setActiveTab('dashboard');
      }, 2000);

    } catch (err) {
      setWalkinError(err.message || 'Failed to register walk-in.');
    }
  };

  const handleUpdateStatus = (apptId, newStatus) => {
    updateAppointmentStatus(apptId, newStatus);
    setAppointments(getAppointments());
    onRefreshTrigger();
  };

  // Calculations for dashboard indicators (based on selectedDate)
  const apptsOnDate = appointments.filter(a => a.date === selectedDate);
  const totalBookings = apptsOnDate.length;
  const checkedInCount = apptsOnDate.filter(a => a.status === 'checked-in').length;
  const attendedCount = apptsOnDate.filter(a => a.status === 'attended').length;
  const activeDoctorsCount = doctors.filter(doc => {
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return doc.working_hours[dayOfWeek] !== null;
  }).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upper Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Reception Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Front desk scheduling panel. Manage patient checking, bookings, and walk-ins.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div>
            <label style={{ margin: 0, fontSize: '0.75rem' }}>View Schedule Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              style={{ padding: '6px 12px', fontSize: '0.9rem', maxWidth: '170px' }}
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowWalkinForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
          >
            ➕ Register Walk-in
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      {!showWalkinForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Today's Bookings</span>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '8px' }}>{totalBookings}</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Checked In</span>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: '8px' }}>{checkedInCount}</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Checked Out / Attended</span>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>{attendedCount}</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Practicing Doctors</span>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)', marginTop: '8px' }}>{activeDoctorsCount}</p>
          </div>
        </div>
      )}

      {/* SCHEDULE TABLE SHEET */}
      {!showWalkinForm && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Daily Appointment Manifest ({selectedDate})</h3>

          {apptsOnDate.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px' }}>Time Slot</th>
                    <th style={{ padding: '12px' }}>Patient Name</th>
                    <th style={{ padding: '12px' }}>Assigned Optometrist</th>
                    <th style={{ padding: '12px' }}>Purpose</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Dispatch Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apptsOnDate
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map(appt => {
                      const pat = patients.find(p => p.id === appt.patient_id);
                      const doc = doctors.find(d => d.id === appt.doctor_id);
                      
                      let badgeColor = 'badge-info';
                      if (appt.status === 'attended') badgeColor = 'badge-success';
                      if (appt.status === 'cancelled') badgeColor = 'badge-error';
                      if (appt.status === 'checked-in') badgeColor = 'badge-warning';
                      if (appt.status === 'no-show') badgeColor = 'badge-error';

                      return (
                        <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-color)', background: appt.status === 'checked-in' ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                          <td style={{ padding: '14px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                            {appt.start_time} - {appt.end_time}
                          </td>
                          <td style={{ padding: '14px', fontWeight: 600 }}>{pat?.name || 'Unknown Patient'}</td>
                          <td style={{ padding: '14px' }}>{doc?.name || 'Optometrist'}</td>
                          <td style={{ padding: '14px', fontStyle: 'italic' }}>"{appt.reason}"</td>
                          <td style={{ padding: '14px' }}>
                            <span className={`badge ${badgeColor}`}>{appt.status}</span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {appt.status === 'scheduled' && (
                                <>
                                  <button 
                                    className="btn-primary" 
                                    onClick={() => handleUpdateStatus(appt.id, 'checked-in')}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', boxShadow: 'none' }}
                                  >
                                    Check In
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    onClick={() => handleUpdateStatus(appt.id, 'no-show')}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  >
                                    No Show
                                  </button>
                                </>
                              )}
                              {appt.status === 'checked-in' && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>In Consultation Room</span>
                              )}
                              {appt.status !== 'cancelled' && appt.status !== 'attended' && appt.status !== 'checked-in' && (
                                <button 
                                  className="btn-secondary" 
                                  onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--error)' }}
                                >
                                  Cancel
                                </button>
                              )}
                              {appt.status === 'attended' && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>✓ Session Finished</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No appointments scheduled for this date.</p>
          )}
        </div>
      )}

      {/* WALK-IN REGISTRATION FORM */}
      {showWalkinForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '1.4rem' }}>New Walk-in Scheduler</h3>
            <button 
              className="btn-secondary" 
              onClick={() => setShowWalkinForm(false)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          </div>

          {walkinError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
              ⚠️ {walkinError}
            </div>
          )}

          {walkinSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
              🎉 {walkinSuccess}
            </div>
          )}

          <form onSubmit={handleRegisterWalkin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', marginBottom: '12px' }}>1. Patient Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label>Full Name</label>
                  <input type="text" placeholder="Firstname Lastname" value={walkinName} onChange={e => setWalkinName(e.target.value)} required />
                </div>
                <div>
                  <label>Contact Number</label>
                  <input type="tel" placeholder="09xxxxxxxxx" value={walkinContact} onChange={e => setWalkinContact(e.target.value)} required />
                </div>
                <div>
                  <label>Date of Birth</label>
                  <input type="date" value={walkinDob} onChange={e => setWalkinDob(e.target.value)} required />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', marginBottom: '12px' }}>2. Appointment Assignment</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label>Choose Doctor</label>
                  <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)} required>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Appointment Type</label>
                  <select value={walkinType} onChange={e => setWalkinType(e.target.value)}>
                    <option value="walk_in">Walk-in Consultation</option>
                    <option value="checkup">Routine Checkup</option>
                    <option value="follow_up">Emergency Check</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label>Reason / Symtoms Description</label>
              <input type="text" placeholder="Blurry vision, frame replacement, contact lens review" value={walkinReason} onChange={e => setWalkinReason(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '10px' }}>
              Register & Assign Next Available Slot
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
