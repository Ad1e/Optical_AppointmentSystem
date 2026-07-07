import React, { useState, useEffect } from 'react';
import { 
  getPatients, 
  getAppointments, 
  getOverrides, 
  addOverride, 
  removeOverride, 
  addPrescription, 
  updateAppointmentStatus 
} from './db';

export default function DoctorPortal({ doctor, onRefreshTrigger }) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [overrides, setOverrides] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Prescription Form State
  const [showRxForm, setShowRxForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [relatedApptId, setRelatedApptId] = useState(null);
  
  // Rx Fields
  const [odSphere, setOdSphere] = useState('0.00');
  const [odCylinder, setOdCylinder] = useState('DS');
  const [odAxis, setOdAxis] = useState('0');
  const [odAdd, setOdAdd] = useState('0.00');
  
  const [osSphere, setOsSphere] = useState('0.00');
  const [osCylinder, setOsCylinder] = useState('DS');
  const [osAxis, setOsAxis] = useState('0');
  const [osAdd, setOsAdd] = useState('0.00');
  
  const [pd, setPd] = useState('63');
  const [validityMonths, setValidityMonths] = useState('12');
  const [rxNotes, setRxNotes] = useState('');
  const [rxSuccess, setRxSuccess] = useState('');

  // Override Form State
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  useEffect(() => {
    setPatients(getPatients());
    setAppointments(getAppointments().filter(a => a.doctor_id === doctor.id));
    setOverrides(getOverrides().filter(o => o.doctor_id === doctor.id));
  }, [doctor, activeTab, rxSuccess, overrideSuccess]);

  const handleCreateOverride = (e) => {
    e.preventDefault();
    if (!overrideDate || !overrideNote) return;

    addOverride({
      doctor_id: doctor.id,
      date: overrideDate,
      is_available: false,
      note: overrideNote
    });

    setOverrideDate('');
    setOverrideNote('');
    setOverrideSuccess('Schedule override registered!');
    onRefreshTrigger();

    setTimeout(() => setOverrideSuccess(''), 2000);
  };

  const handleDeleteOverride = (id) => {
    removeOverride(id);
    setOverrides(getOverrides().filter(o => o.doctor_id === doctor.id));
    onRefreshTrigger();
  };

  const handleOpenRxForm = (patientId, apptId = null) => {
    const pat = patients.find(p => p.id === patientId);
    setSelectedPatient(pat);
    setRelatedApptId(apptId);
    setShowRxForm(true);
    
    // Reset inputs
    setOdSphere('0.00');
    setOdCylinder('DS');
    setOdAxis('0');
    setOdAdd('0.00');
    setOsSphere('0.00');
    setOsCylinder('DS');
    setOsAxis('0');
    setOsAdd('0.00');
    setPd('63');
    setValidityMonths('12');
    setRxNotes('');
  };

  const handleSubmitRx = (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    addPrescription({
      patient_id: selectedPatient.id,
      doctor_id: doctor.id,
      validity_months: parseInt(validityMonths),
      od_sphere: odSphere,
      od_cylinder: odCylinder,
      od_axis: odAxis,
      od_add: odAdd,
      os_sphere: osSphere,
      os_cylinder: osCylinder,
      os_axis: osAxis,
      os_add: osAdd,
      pd: pd,
      notes: rxNotes
    });

    // If related to an appointment, mark it as attended
    if (relatedApptId) {
      updateAppointmentStatus(relatedApptId, 'attended');
    }

    setRxSuccess(`Successfully saved prescription for ${selectedPatient.name}!`);
    onRefreshTrigger();

    setTimeout(() => {
      setRxSuccess('');
      setShowRxForm(false);
      setSelectedPatient(null);
      setRelatedApptId(null);
    }, 2000);
  };

  const handleMarkAttended = (apptId) => {
    updateAppointmentStatus(apptId, 'attended');
    setAppointments(getAppointments().filter(a => a.doctor_id === doctor.id));
    onRefreshTrigger();
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(appt => {
    const patientName = patients.find(p => p.id === appt.patient_id)?.name || '';
    return patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={doctor.avatar} 
            alt={doctor.name} 
            style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} 
          />
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{doctor.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>👨‍⚕️ {doctor.specialty}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn-secondary ${activeTab === 'appointments' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('appointments'); setShowRxForm(false); }}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Appointments / Patients
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'overrides' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('overrides'); setShowRxForm(false); }}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Schedule Overrides
          </button>
        </div>
      </div>

      {/* APPOINTMENTS & PATIENTS TAB */}
      {activeTab === 'appointments' && !showRxForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Assigned Consultations</h3>
            <input 
              type="text" 
              placeholder="🔍 Search patients by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>

          {filteredAppointments.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px' }}>Patient Name</th>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Time</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments
                    .sort((a, b) => new Date(`${b.date}T${b.start_time}`) - new Date(`${a.date}T${a.start_time}`))
                    .map(appt => {
                      const pat = patients.find(p => p.id === appt.patient_id);
                      let statusBadge = 'badge-info';
                      if (appt.status === 'attended') statusBadge = 'badge-success';
                      if (appt.status === 'cancelled') statusBadge = 'badge-error';
                      if (appt.status === 'checked-in') statusBadge = 'badge-warning';

                      return (
                        <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px', fontWeight: 600 }}>{pat?.name || 'Unknown Patient'}</td>
                          <td style={{ padding: '14px' }}>{appt.date}</td>
                          <td style={{ padding: '14px' }}>{appt.start_time}</td>
                          <td style={{ padding: '14px', textTransform: 'capitalize' }}>{appt.type.replace('_', ' ')}</td>
                          <td style={{ padding: '14px' }}>
                            <span className={`badge ${statusBadge}`}>{appt.status}</span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {appt.status !== 'attended' && appt.status !== 'cancelled' && (
                                <>
                                  <button 
                                    className="btn-primary" 
                                    onClick={() => handleOpenRxForm(appt.patient_id, appt.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  >
                                    Refract & Rx
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    onClick={() => handleMarkAttended(appt.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  >
                                    Done
                                  </button>
                                </>
                              )}
                              {appt.status === 'attended' && (
                                <button 
                                  className="btn-secondary"
                                  onClick={() => handleOpenRxForm(appt.patient_id)}
                                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                >
                                  Update Rx
                                </button>
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
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No consultations found matching criteria.</p>
          )}

        </div>
      )}

      {/* RX ENTRY FORM WORKSPACE */}
      {activeTab === 'appointments' && showRxForm && selectedPatient && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>Refraction Sheet: {selectedPatient.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>DOB: {selectedPatient.dob} | Contact: {selectedPatient.contact}</p>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => setShowRxForm(false)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          </div>

          {rxSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 500 }}>
              🎉 {rxSuccess}
            </div>
          )}

          <form onSubmit={handleSubmitRx} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Right Eye Specs */}
            <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', marginBottom: '14px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                👁️ Right Eye (Ocular Dexter / OD)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                <div>
                  <label>Sphere (SPH)</label>
                  <input type="text" placeholder="-2.50" value={odSphere} onChange={e => setOdSphere(e.target.value)} required />
                </div>
                <div>
                  <label>Cylinder (CYL)</label>
                  <input type="text" placeholder="-0.50 / DS" value={odCylinder} onChange={e => setOdCylinder(e.target.value)} required />
                </div>
                <div>
                  <label>Axis (°)</label>
                  <input type="number" min="0" max="180" placeholder="180" value={odAxis} onChange={e => setOdAxis(e.target.value)} required />
                </div>
                <div>
                  <label>Add (ADD)</label>
                  <input type="text" placeholder="+1.50" value={odAdd} onChange={e => setOdAdd(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Left Eye Specs */}
            <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', marginBottom: '14px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                👁️ Left Eye (Ocular Sinister / OS)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                <div>
                  <label>Sphere (SPH)</label>
                  <input type="text" placeholder="-2.25" value={osSphere} onChange={e => setOsSphere(e.target.value)} required />
                </div>
                <div>
                  <label>Cylinder (CYL)</label>
                  <input type="text" placeholder="DS" value={osCylinder} onChange={e => setOsCylinder(e.target.value)} required />
                </div>
                <div>
                  <label>Axis (°)</label>
                  <input type="number" min="0" max="180" placeholder="0" value={osAxis} onChange={e => setOsAxis(e.target.value)} required />
                </div>
                <div>
                  <label>Add (ADD)</label>
                  <input type="text" placeholder="+1.50" value={osAdd} onChange={e => setOsAdd(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* PD & Validity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label>Pupillary Distance (PD) - mm</label>
                <input type="number" min="40" max="80" placeholder="63" value={pd} onChange={e => setPd(e.target.value)} required />
              </div>
              <div>
                <label>Prescription Validity Period</label>
                <select value={validityMonths} onChange={e => setValidityMonths(e.target.value)}>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label>Special Instructions / Notes</label>
              <textarea 
                rows="3" 
                placeholder="Suggest progressive lenses, blue light coating, prism settings, etc." 
                value={rxNotes} 
                onChange={e => setRxNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '10px' }}>
              Save Prescription Specs
            </button>
          </form>
        </div>
      )}

      {/* SCHEDULE OVERRIDES TAB */}
      {activeTab === 'overrides' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* Register Override */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Block Schedule Date
            </h3>
            
            {overrideSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500 }}>
                {overrideSuccess}
              </div>
            )}

            <form onSubmit={handleCreateOverride} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Leave / Sick Date</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={overrideDate} 
                  onChange={e => setOverrideDate(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label>Reason / Note</label>
                <input 
                  type="text" 
                  placeholder="e.g. Vacation, Attending seminar, Clinic closed" 
                  value={overrideNote} 
                  onChange={e => setOverrideNote(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px' }}>
                Block Calendar Day
              </button>
            </form>
          </div>

          {/* List Overrides */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Active Calendar Blocks
            </h3>
            {overrides.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overrides.map(ovr => (
                  <div key={ovr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ovr.date}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ovr.note}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteOverride(ovr.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No blocked dates scheduled.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
