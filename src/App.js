import React, { useState, useEffect } from 'react';
import './App.css';
import { getPatients, getDoctors } from './db';
import PatientPortal from './PatientPortal';
import DoctorPortal from './DoctorPortal';
import ReceptionistPortal from './ReceptionistPortal';

function App() {
  const [theme, setTheme] = useState('dark');
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

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  useEffect(() => {
    document.body.classList.add('dark-theme');
  }, []);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const currentPatient = patients.find(p => p.id === activePatientId);
  const currentDoctor = doctors.find(d => d.id === activeDoctorId);

  // Navigation items per role
  const roleNav = {
    patient: [
      { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { id: 'book', icon: '📅', label: 'Book Appointment' },
      { id: 'prescriptions', icon: '👓', label: 'My Prescriptions' },
    ],
    doctor: [
      { id: 'appointments', icon: '🩺', label: 'Consultations' },
      { id: 'overrides', icon: '📋', label: 'Schedule Overrides' },
    ],
    receptionist: [
      { id: 'dashboard', icon: '📊', label: 'Daily Overview' },
      { id: 'walkin', icon: '🚶', label: 'Register Walk-in' },
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
    <div className="app-shell">
      
      {/* ==================== SIDEBAR ==================== */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="sidebar-brand-icon">👁️</div>
            <h1>OptiCare</h1>
          </div>
          <p>Vision Center Portal</p>
        </div>

        {/* Role Switcher */}
        <div className="sidebar-section-label">Simulation Mode</div>
        <div className="sidebar-nav">
          {['patient', 'doctor', 'receptionist'].map(r => (
            <button
              key={r}
              className={`sidebar-nav-item ${role === r ? 'active' : ''}`}
              onClick={() => setRole(r)}
            >
              <span className="nav-icon">
                {r === 'patient' ? '👤' : r === 'doctor' ? '🩺' : '🏥'}
              </span>
              {r.charAt(0).toUpperCase() + r.slice(1)} View
            </button>
          ))}
        </div>

        {/* Portal Navigation */}
        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {(roleNav[role] || []).map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer User Card */}
        <div className="sidebar-footer">
          {/* Context selector */}
          {role === 'patient' && patients.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginBottom: '4px' }}>Active Patient</label>
              <select 
                value={activePatientId} 
                onChange={e => setActivePatientId(e.target.value)}
                style={{ 
                  padding: '7px 10px', fontSize: '0.78rem', 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  color: 'rgba(255,255,255,0.8)',
                  borderRadius: '8px'
                }}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#1a1f36', color: '#fff' }}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'doctor' && doctors.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginBottom: '4px' }}>Active Optometrist</label>
              <select 
                value={activeDoctorId} 
                onChange={e => setActiveDoctorId(e.target.value)}
                style={{ 
                  padding: '7px 10px', fontSize: '0.78rem', 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  color: 'rgba(255,255,255,0.8)',
                  borderRadius: '8px'
                }}
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id} style={{ background: '#1a1f36', color: '#fff' }}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{getInitials(getCurrentUserName())}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{getCurrentUserName()}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="main-content">
        
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>{getPageTitle()}</h2>
            <p>{getPageSubtitle()}</p>
          </div>
          <div className="top-bar-right">
            <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div style={{ 
              padding: '6px 14px', 
              borderRadius: '8px', 
              background: 'var(--success-bg)', 
              color: 'var(--success)', 
              fontSize: '0.72rem', 
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
              Online
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-body">
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
              <p>Loading workspace data...</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          OptiCare Vision Center &copy; 2026 &mdash; Professional Optical Clinic Management System
        </footer>
      </div>
    </div>
  );
}

export default App;
