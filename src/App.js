import React, { useState, useEffect } from 'react';
import './App.css';
import { getPatients, getDoctors } from './db';
import PatientPortal from './PatientPortal';
import DoctorPortal from './DoctorPortal';
import ReceptionistPortal from './ReceptionistPortal';
import { Icons } from './Icons';

function App() {
  const [role, setRole] = useState('patient');
  
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activePatientId, setActivePatientId] = useState('');
  const [activeDoctorId, setActiveDoctorId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const pats = getPatients();
    const docs = getDoctors();
    setPatients(pats);
    setDoctors(docs);
    if (pats.length > 0 && !activePatientId) setActivePatientId(pats[0].id);
    if (docs.length > 0 && !activeDoctorId) setActiveDoctorId(docs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    document.body.classList.add('dark-theme');
  }, []);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const currentPatient = patients.find(p => p.id === activePatientId);
  const currentDoctor = doctors.find(d => d.id === activeDoctorId);

  // Navigation items per role
  const roleNav = {
    patient: [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { id: 'book', icon: 'book', label: 'Book Appointment' },
      { id: 'prescriptions', icon: 'prescriptions', label: 'My Prescriptions' },
      { id: 'records', icon: 'records', label: 'Medical Records' },
    ],
    doctor: [
      { id: 'appointments', icon: 'appointments', label: 'Consultations' },
      { id: 'overrides', icon: 'overrides', label: 'Schedule Overrides' },
    ],
    receptionist: [
      { id: 'dashboard', icon: 'dashboard', label: 'Daily Overview' },
      { id: 'walkin', icon: 'walkin', label: 'Register Walk-in' },
    ],
  };

  // Get active portal's tab state setter
  const [activeTab, setActiveTab] = useState('dashboard');

  // Reset tab when role changes
  useEffect(() => {
    const firstTab = roleNav[role]?.[0]?.id || 'dashboard';
    setActiveTab(firstTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCurrentUserName = () => {
    if (role === 'patient') return currentPatient?.name || 'Patient';
    if (role === 'doctor') return currentDoctor?.name || 'Doctor';
    return 'Front Desk Staff';
  };

  const getPageTitle = () => {
    if (role === 'patient') return 'Patient Portal';
    if (role === 'doctor') return 'Doctor Workspace';
    return 'Reception Dashboard';
  };

  const getPageSubtitle = () => {
    if (role === 'patient') return 'Manage your eye care appointments and records';
    if (role === 'doctor') return 'Manage consultations and prescriptions';
    return 'Front desk scheduling and patient management';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <nav className="navbar">
        <div className="navbar-container">
          
          {/* Logo & Brand */}
          <div className="navbar-brand">
            <div className="navbar-brand-logo">
              <div className="navbar-brand-icon">
                <Icons.Clinic />
              </div>
              <div>
                <h1>OptiCare</h1>
                <p>Vision Center</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="navbar-nav">
            {(roleNav[role] || []).map(item => (
              <button
                key={item.id}
                className={`navbar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.id === 'dashboard' && <Icons.Dashboard />}
                {item.id === 'book' && <Icons.Calendar />}
                {item.id === 'prescriptions' && <Icons.Glasses />}
                {item.id === 'records' && <Icons.Document />}
                {item.id === 'appointments' && <Icons.Stethoscope />}
                {item.id === 'overrides' && <Icons.Override />}
                {item.id === 'walkin' && <Icons.WalkIn />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Controls & Mode Switches */}
          <div className="navbar-controls">
            
            {/* Simulation Role Selector */}
            <div className="navbar-selector">
              <label>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Optometrist</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>

            {/* Profile Dropdowns */}
            {role === 'patient' && patients.length > 0 && (
              <div className="navbar-selector">
                <select value={activePatientId} onChange={e => setActivePatientId(e.target.value)}>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'doctor' && doctors.length > 0 && (
              <div className="navbar-selector">
                <select value={activeDoctorId} onChange={e => setActiveDoctorId(e.target.value)}>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}



            {/* User Badge */}
            <div className="navbar-user-card">
              <div className="navbar-user-avatar">{getInitials(getCurrentUserName())}</div>
              <div className="navbar-user-info" style={{ display: 'none' }}>
                <span className="navbar-user-name">{getCurrentUserName()}</span>
                <span className="navbar-user-role">{role}</span>
              </div>
            </div>
            
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="main-content">
        
        {/* Sub Header Section */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          borderBottom: '1px solid var(--border-color)', 
          padding: '20px 36px' 
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{getPageTitle()}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>{getPageSubtitle()}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <main className="content-body" style={{ maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          {role === 'patient' && currentPatient ? (
            <PatientPortal 
              patient={currentPatient} 
              onRefreshTrigger={triggerRefresh} 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : role === 'doctor' && currentDoctor ? (
            <DoctorPortal 
              doctor={currentDoctor} 
              onRefreshTrigger={triggerRefresh}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : role === 'receptionist' ? (
            <ReceptionistPortal 
              onRefreshTrigger={triggerRefresh}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <p>Loading clinic workspace data...</p>
            </div>
          )}
        </main>



      </div>
    </div>
  );
}

export default App;
