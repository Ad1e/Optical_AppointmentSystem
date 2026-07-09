import React, { useState, useEffect } from 'react';
import { CLINIC_CONFIG } from '../config/config';
import { 
  getPatients, 
  getAppointments, 
  getOverrides, 
  addOverride, 
  removeOverride, 
  addPrescription, 
  updateAppointmentStatus,
  getRecords
} from '../database/db';
import { Icons } from './Icons';

const retinalScan = '/images/retinal_scan.png';
const cornealTopography = '/images/corneal_topography.png';

export default function DoctorPortal({ doctor, onRefreshTrigger, activeTab, setActiveTab }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [overrides, setOverrides] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
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
  const [rxError, setRxError] = useState('');

  // Override Form State
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  useEffect(() => {
    setPatients(getPatients());
    setAppointments(getAppointments().filter(a => a.doctor_id === doctor.id));
    setOverrides(getOverrides().filter(o => o.doctor_id === doctor.id));
  }, [doctor, activeTab]);

  const handleOpenRxForm = (patientId, apptId = null) => {
    const pat = getPatients().find(p => p.id === patientId);
    if (!pat) return;
    setSelectedPatient(pat);
    setRelatedApptId(apptId);
    setShowRxForm(true);
    setOdSphere('0.00'); setOdCylinder('DS'); setOdAxis('0'); setOdAdd('0.00');
    setOsSphere('0.00'); setOsCylinder('DS'); setOsAxis('0'); setOsAdd('0.00');
    setPd('63'); setValidityMonths('12'); setRxNotes(''); setRxError('');
  };

  const handleSubmitRx = (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setRxError('');

    const validateRange = (val, limitType, label) => {
      const limits = CLINIC_CONFIG.validationLimits[limitType];
      if (limitType === 'cylinder' && (val.toUpperCase() === 'DS' || val.toUpperCase() === 'SPH')) {
        return { valid: true, value: val.toUpperCase() };
      }
      const num = parseFloat(val);
      if (isNaN(num)) return { valid: false, error: `${label} must be a valid decimal number.` };
      if (num < limits.min || num > limits.max) return { valid: false, error: `${label} must be between ${limits.min} and ${limits.max}.` };
      return { valid: true, value: num.toFixed(2) };
    };

    const odSphCheck = validateRange(odSphere, 'sphere', 'Right Eye SPH');
    if (!odSphCheck.valid) { setRxError(odSphCheck.error); return; }
    const osSphCheck = validateRange(osSphere, 'sphere', 'Left Eye SPH');
    if (!osSphCheck.valid) { setRxError(osSphCheck.error); return; }
    const odCylCheck = validateRange(odCylinder, 'cylinder', 'Right Eye CYL');
    if (!odCylCheck.valid) { setRxError(odCylCheck.error); return; }
    const osCylCheck = validateRange(osCylinder, 'cylinder', 'Left Eye CYL');
    if (!osCylCheck.valid) { setRxError(osCylCheck.error); return; }

    addPrescription({
      patient_id: selectedPatient.id, doctor_id: doctor.id,
      validity_months: parseInt(validityMonths),
      od_sphere: odSphCheck.value, od_cylinder: odCylCheck.value,
      od_axis: parseInt(odAxis), od_add: parseFloat(odAdd || 0).toFixed(2),
      os_sphere: osSphCheck.value, os_cylinder: osCylCheck.value,
      os_axis: parseInt(osAxis), os_add: parseFloat(osAdd || 0).toFixed(2),
      pd: parseInt(pd), notes: rxNotes
    });

    if (relatedApptId) updateAppointmentStatus(relatedApptId, 'attended');
    setRxSuccess(`Prescription saved for ${selectedPatient.name}!`);
    onRefreshTrigger();
    setTimeout(() => {
      setRxSuccess(''); setShowRxForm(false);
      setSelectedPatient(null); setRelatedApptId(null);
    }, 2000);
  };

  const handleMarkAttended = (apptId) => {
    updateAppointmentStatus(apptId, 'attended');
    setAppointments(getAppointments().filter(a => a.doctor_id === doctor.id));
    onRefreshTrigger();
  };

  const handleCreateOverride = (e) => {
    e.preventDefault();
    if (!overrideDate) return;
    addOverride({ doctor_id: doctor.id, date: overrideDate, note: overrideNote || 'Leave' });
    setOverrides(getOverrides().filter(o => o.doctor_id === doctor.id));
    setOverrideDate(''); setOverrideNote('');
    setOverrideSuccess('Calendar block added!');
    onRefreshTrigger();
    setTimeout(() => setOverrideSuccess(''), 2000);
  };

  const handleDeleteOverride = (id) => {
    removeOverride(id);
    setOverrides(getOverrides().filter(o => o.doctor_id === doctor.id));
    onRefreshTrigger();
  };

  const filteredAppointments = appointments.filter(appt => {
    const patientName = patients.find(p => p.id === appt.patient_id)?.name || '';
    return patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Doctor Profile Header */}
      <div className="card card-padded animate-fade-in" style={{ background: 'var(--accent-gradient-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={doctor.avatar} alt={doctor.name} 
            style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--accent-primary)', boxShadow: '0 4px 16px var(--accent-glow)' }} 
          />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{doctor.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Stethoscope style={{ width: '15px', height: '15px' }} /> {doctor.specialty}</p>
          </div>
        </div>
      </div>

      {/* =================== APPOINTMENTS TAB =================== */}
      {activeTab === 'appointments' && !showRxForm && (
        <div className="card card-padded animate-fade-in">
          <div className="section-header">
            <h3 className="section-title">Assigned Consultations</h3>
            <input 
              type="text" placeholder="🔍 Search patients..." 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ maxWidth: '260px' }}
            />
          </div>

          {filteredAppointments.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
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
                        <tr key={appt.id}>
                          <td style={{ fontWeight: 600 }}>{pat?.name || 'Unknown'}</td>
                          <td>{appt.date}</td>
                          <td>{appt.start_time}</td>
                          <td style={{ textTransform: 'capitalize' }}>{appt.type.replace('_', ' ')}</td>
                          <td><span className={`badge ${statusBadge}`}>{appt.status}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {appt.status !== 'attended' && appt.status !== 'cancelled' && (
                                <>
                                  <button className="btn-primary" onClick={() => handleOpenRxForm(appt.patient_id, appt.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                                    Refract & Rx
                                  </button>
                                  <button className="btn-secondary" onClick={() => handleMarkAttended(appt.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                                    Done
                                  </button>
                                </>
                              )}
                              {appt.status === 'attended' && (
                                <button className="btn-ghost" onClick={() => handleOpenRxForm(appt.patient_id)}
                                  style={{ fontSize: '0.78rem' }}>
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
            <div className="empty-state">
              <div className="empty-icon">🩺</div>
              <p>No consultations found matching criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* =================== RX ENTRY FORM =================== */}
      {activeTab === 'appointments' && showRxForm && selectedPatient && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
          
          {/* Refraction Sheet Card */}
          <div className="card card-accent card-padded animate-fade-in" style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Refraction Sheet: {selectedPatient.name}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>DOB: {selectedPatient.dob} | Contact: {selectedPatient.contact}</p>
              </div>
              <button className="btn-secondary" onClick={() => setShowRxForm(false)} style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
                Cancel
              </button>
            </div>

            {rxSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>🎉 {rxSuccess}</div>}
            {rxError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {rxError}</div>}

            <form onSubmit={handleSubmitRx} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Right Eye */}
              <div style={{ border: '1.5px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <span className="lens-diagram" style={{ width: '32px', height: '32px', fontSize: '0.65rem' }}>OD</span>
                  Right Eye (Ocular Dexter)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <div><label>Sphere (SPH)</label><input type="text" placeholder="-2.50" value={odSphere} onChange={e => setOdSphere(e.target.value)} required /></div>
                  <div><label>Cylinder (CYL)</label><input type="text" placeholder="-0.50 / DS" value={odCylinder} onChange={e => setOdCylinder(e.target.value)} required /></div>
                  <div><label>Axis (°)</label><input type="number" min={CLINIC_CONFIG.validationLimits.axis.min} max={CLINIC_CONFIG.validationLimits.axis.max} placeholder="180" value={odAxis} onChange={e => setOdAxis(e.target.value)} required /></div>
                  <div><label>Add (ADD)</label><input type="text" placeholder="+1.50" value={odAdd} onChange={e => setOdAdd(e.target.value)} required /></div>
                </div>
              </div>

              {/* Left Eye */}
              <div style={{ border: '1.5px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <span className="lens-diagram" style={{ width: '32px', height: '32px', fontSize: '0.65rem' }}>OS</span>
                  Left Eye (Ocular Sinister)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <div><label>Sphere (SPH)</label><input type="text" placeholder="-2.25" value={osSphere} onChange={e => setOsSphere(e.target.value)} required /></div>
                  <div><label>Cylinder (CYL)</label><input type="text" placeholder="DS" value={osCylinder} onChange={e => setOsCylinder(e.target.value)} required /></div>
                  <div><label>Axis (°)</label><input type="number" min={CLINIC_CONFIG.validationLimits.axis.min} max={CLINIC_CONFIG.validationLimits.axis.max} placeholder="0" value={osAxis} onChange={e => setOsAxis(e.target.value)} required /></div>
                  <div><label>Add (ADD)</label><input type="text" placeholder="+1.50" value={osAdd} onChange={e => setOsAdd(e.target.value)} required /></div>
                </div>
              </div>

              {/* PD & Validity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label>Pupillary Distance (PD) - mm</label>
                  <input type="number" min={CLINIC_CONFIG.validationLimits.pd.min} max={CLINIC_CONFIG.validationLimits.pd.max} placeholder="63" value={pd} onChange={e => setPd(e.target.value)} required />
                </div>
                <div>
                  <label>Prescription Validity Period</label>
                  <select value={validityMonths} onChange={e => setValidityMonths(e.target.value)}>
                    {CLINIC_CONFIG.validityPeriods.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label>Special Instructions / Notes</label>
                <textarea rows="3" placeholder="Progressive lenses, blue light coating, prism settings..." value={rxNotes} onChange={e => setRxNotes(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '13px', fontSize: '0.95rem' }}>
                Save Prescription Specs
              </button>
            </form>
          </div>

          {/* Right Column: Diagnostic Scans Preview */}
          <div className="card card-padded animate-fade-in-delay-1" style={{ position: 'sticky', top: '96px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Patient Diagnostic Scans
            </h3>
            
            {getRecords().filter(r => r.patient_id === selectedPatient.id).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {getRecords().filter(r => r.patient_id === selectedPatient.id).map(rec => {
                  const imgSource = rec.image_key === 'retinal_scan' ? retinalScan : cornealTopography;
                  return (
                    <div key={rec.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--bg-primary)' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{rec.type}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date: {rec.date}</p>
                      
                      <div style={{ position: 'relative', height: '120px', borderRadius: '4px', overflow: 'hidden', margin: '8px 0', border: '1px solid var(--border-color)', background: '#000' }}>
                        <img src={imgSource} alt={rec.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '2px', fontFamily: 'monospace' }}>
                          {rec.id.toUpperCase()}
                        </div>
                      </div>
                      
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{rec.notes.substring(0, 100)}..."
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Icons.Document style={{ width: '32px', height: '32px', opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.82rem' }}>No clinical scans on record for this patient.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =================== SCHEDULE OVERRIDES TAB =================== */}
      {activeTab === 'overrides' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Create Override */}
          <div className="card card-accent card-padded animate-fade-in" style={{ height: 'fit-content' }}>
            <h3 className="section-title" style={{ marginBottom: '20px' }}>Block Schedule Date</h3>
            
            {overrideSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{overrideSuccess}</div>}

            <form onSubmit={handleCreateOverride} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Leave / Sick Date</label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={overrideDate} onChange={e => setOverrideDate(e.target.value)} required />
              </div>
              <div>
                <label>Reason / Note</label>
                <input type="text" placeholder="Vacation, seminar, clinic closed..." value={overrideNote} onChange={e => setOverrideNote(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '11px' }}>
                Block Calendar Day
              </button>
            </form>
          </div>

          {/* List Overrides */}
          <div className="card card-padded animate-fade-in-delay-1">
            <h3 className="section-title" style={{ marginBottom: '20px' }}>Active Calendar Blocks</h3>
            {overrides.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {overrides.map(ovr => (
                  <div key={ovr.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '14px 16px', border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' 
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ovr.date}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ovr.note}</p>
                    </div>
                    <button onClick={() => handleDeleteOverride(ovr.id)} 
                      style={{ background: 'var(--error-bg)', border: 'none', color: 'var(--error)', fontSize: '0.78rem', fontWeight: 700, padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><Icons.Override style={{ width: '48px', height: '48px' }} /></div>
                <p>No blocked dates scheduled.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
