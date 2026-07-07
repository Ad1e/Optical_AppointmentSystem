import React, { useState, useEffect } from 'react';
import { CLINIC_CONFIG } from './config';
import { 
  getPatients, 
  getAppointments, 
  getDoctors, 
  addPatient, 
  addAppointment, 
  updateAppointmentStatus,
  checkSlotAvailability 
} from './db';
import { Icons } from './Icons';

export default function ReceptionistPortal({ onRefreshTrigger, activeTab, setActiveTab }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Walk-in Form State
  const [walkinName, setWalkinName] = useState('');
  const [walkinContact, setWalkinContact] = useState('');
  const [walkinDob, setWalkinDob] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [walkinType, setWalkinType] = useState('walk_in');
  const [walkinReason, setWalkinReason] = useState('Routine eye assessment');
  const [walkinError, setWalkinError] = useState('');
  const [walkinSuccess, setWalkinSuccess] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setPatients(getPatients());
    setAppointments(getAppointments());
    const docs = getDoctors();
    setDoctors(docs);
    if (docs.length > 0 && !selectedDocId) setSelectedDocId(docs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate]);

  const handleRegisterWalkin = (e) => {
    e.preventDefault();
    setWalkinError(''); setWalkinSuccess('');
    if (!walkinName || !walkinContact || !walkinDob || !selectedDocId) {
      setWalkinError('Please complete all form fields.');
      return;
    }

    try {
      const newPatient = addPatient({ name: walkinName, contact: walkinContact, dob: walkinDob });
      const doc = doctors.find(d => d.id === selectedDocId);
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hours = doc.working_hours[dayOfWeek];
      if (!hours) throw new Error(`Doctor is not practicing today (${dayOfWeek}).`);

      let testTime = hours.start;
      let slotFound = false;
      while (testTime < hours.end) {
        const check = checkSlotAvailability(selectedDocId, selectedDate, testTime);
        if (check.available) { slotFound = true; break; }
        let [h, m] = testTime.split(':').map(Number);
        m += CLINIC_CONFIG.scheduling.slotDurationMinutes;
        if (m >= 60) { const ha = Math.floor(m / 60); m = m % 60; h += ha; }
        testTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      if (!slotFound) throw new Error('No available timeslot found. Choose another doctor.');

      addAppointment({
        patient_id: newPatient.id, doctor_id: selectedDocId,
        date: selectedDate, start_time: testTime, type: walkinType, reason: walkinReason
      });

      setWalkinSuccess(`Registered ${walkinName} — booked at ${testTime}!`);
      onRefreshTrigger();
      setWalkinName(''); setWalkinContact(''); setWalkinDob('');
      setTimeout(() => { setWalkinSuccess(''); setActiveTab('dashboard'); }, 2000);
    } catch (err) { setWalkinError(err.message || 'Failed to register walk-in.'); }
  };

  const handleUpdateStatus = (apptId, newStatus) => {
    updateAppointmentStatus(apptId, newStatus);
    setAppointments(getAppointments());
    onRefreshTrigger();
  };

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
      
      {/* =================== DASHBOARD TAB =================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* Date selector & action bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <label style={{ margin: 0 }}>Viewing Date</label>
              <input 
                type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} 
                style={{ padding: '8px 14px', maxWidth: '180px', marginTop: '4px' }}
              />
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('walkin')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>+</span> Register Walk-in
            </button>
          </div>

          {/* Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="card stat-card animate-fade-in">
              <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Calendar /></div>
              <div className="stat-label">Today's Bookings</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{totalBookings}</div>
            </div>
            <div className="card stat-card animate-fade-in-delay-1">
              <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Override /></div>
              <div className="stat-label">Checked In</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{checkedInCount}</div>
            </div>
            <div className="card stat-card animate-fade-in-delay-2">
              <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.WalkIn /></div>
              <div className="stat-label">Attended</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{attendedCount}</div>
            </div>
            <div className="card stat-card animate-fade-in-delay-3">
              <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Stethoscope /></div>
              <div className="stat-label">Active Doctors</div>
              <div className="stat-value" style={{ color: 'var(--info)' }}>{activeDoctorsCount}</div>
            </div>
          </div>

          {/* Daily Manifest Table */}
          <div className="card card-padded">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>
              Daily Appointment Manifest — {selectedDate}
            </h3>

            {apptsOnDate.length > 0 ? (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th><th>Patient</th><th>Optometrist</th><th>Purpose</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
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
                          <tr key={appt.id} style={{ background: appt.status === 'checked-in' ? 'var(--warning-bg)' : 'transparent' }}>
                            <td style={{ fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{appt.start_time} – {appt.end_time}</td>
                            <td style={{ fontWeight: 600 }}>{pat?.name || 'Unknown'}</td>
                            <td>{doc?.name || 'Optometrist'}</td>
                            <td style={{ fontStyle: 'italic', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{appt.reason}"</td>
                            <td><span className={`badge ${badgeColor}`}>{appt.status}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {appt.status === 'scheduled' && (
                                  <>
                                    <button className="btn-primary" onClick={() => handleUpdateStatus(appt.id, 'checked-in')}
                                      style={{ padding: '5px 10px', fontSize: '0.72rem', background: 'var(--warning)', boxShadow: 'none' }}>
                                      Check In
                                    </button>
                                    <button className="btn-ghost" onClick={() => handleUpdateStatus(appt.id, 'no-show')}
                                      style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      No Show
                                    </button>
                                  </>
                                )}
                                {appt.status === 'checked-in' && (
                                  <span className="badge badge-warning badge-dot" style={{ fontSize: '0.68rem' }}>In Consultation</span>
                                )}
                                {appt.status !== 'cancelled' && appt.status !== 'attended' && appt.status !== 'checked-in' && (
                                  <button className="btn-ghost" onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                                    style={{ fontSize: '0.72rem', color: 'var(--error)' }}>
                                    Cancel
                                  </button>
                                )}
                                {appt.status === 'attended' && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>✓ Done</span>
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
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No appointments scheduled for this date.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================== WALK-IN REGISTRATION =================== */}
      {activeTab === 'walkin' && (
        <div className="card card-accent card-padded animate-fade-in" style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>New Walk-in Patient</h3>
            <button className="btn-secondary" onClick={() => setActiveTab('dashboard')} style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
              ← Back
            </button>
          </div>

          {walkinError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {walkinError}</div>}
          {walkinSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>🎉 {walkinSuccess}</div>}

          <form onSubmit={handleRegisterWalkin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '14px', fontWeight: 700 }}>1. Patient Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div><label>Full Name</label><input type="text" placeholder="Firstname Lastname" value={walkinName} onChange={e => setWalkinName(e.target.value)} required /></div>
                <div><label>Contact Number</label><input type="tel" placeholder="09xxxxxxxxx" value={walkinContact} onChange={e => setWalkinContact(e.target.value)} required /></div>
                <div><label>Date of Birth</label><input type="date" value={walkinDob} onChange={e => setWalkinDob(e.target.value)} required /></div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '14px', fontWeight: 700 }}>2. Appointment Assignment</h4>
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
              <label>Reason / Symptoms Description</label>
              <input type="text" placeholder="Blurry vision, frame replacement, contact lens review" value={walkinReason} onChange={e => setWalkinReason(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '13px', fontSize: '0.95rem' }}>
              Register & Assign Next Available Slot
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
