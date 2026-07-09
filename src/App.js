import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { getPatients, getDoctors } from './database/db';
import PatientPortal from './components/PatientPortal';
import DoctorPortal from './components/DoctorPortal';
import ReceptionistPortal from './components/ReceptionistPortal';
import LandingPage from './components/LandingPage';
import DoctorsPage from './components/DoctorsPage';
import { Icons } from './components/Icons';

function App() {
  const [activeSection, setActiveSection] = useState('home'); // home, doctors, book, dashboard, staff
  const [role, setRole] = useState('doctor'); // doctor, receptionist (staff roles)
  const [preselectedDoctorId, setPreselectedDoctorId] = useState('');
  
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activePatientId, setActivePatientId] = useState('');
  const [activeDoctorId, setActiveDoctorId] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync state with active patient / doctor
  useEffect(() => {
    const pats = getPatients();
    const docs = getDoctors();
    setPatients(pats);
    setDoctors(docs);
    
    // Set default active patient and doctor
    if (pats.length > 0 && !activePatientId) {
      setActivePatientId(pats[0].id);
    }
    if (docs.length > 0 && !activeDoctorId) {
      setActiveDoctorId(docs[0].id);
    }
  }, [refreshTrigger, activePatientId, activeDoctorId]);

  // Listen for storage events to synchronize multiple tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'optical_clinic_db_v2' || e.key === 'optical_clinic_db_v1') {
        triggerRefresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load active patient from localStorage if they just booked
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPatientId = localStorage.getItem('opticare_active_patient_id');
      if (storedPatientId) {
        setActivePatientId(storedPatientId);
        localStorage.removeItem('opticare_active_patient_id'); // clear it
      }
    }
  }, [activeSection]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const currentPatient = patients.find(p => p.id === activePatientId);
  const currentDoctor = doctors.find(d => d.id === activeDoctorId);

  // Dashboard Sub-tabs
  const [activeTab, setActiveTab] = useState('dashboard');

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPageTitle = () => {
    switch (activeSection) {
      case 'home':
        return 'OptiCare Vision Center';
      case 'doctors':
        return 'Our Optometrists';
      case 'book':
        return 'Appointment Booking Flow';
      case 'dashboard':
        return 'Patient Health Dashboard';
      case 'staff':
        return role === 'doctor' ? 'Optometrist Medical Workspace' : 'Clinic Reception Dashboard';
      default:
        return 'OptiCare Clinic';
    }
  };

  const getPageSubtitle = () => {
    switch (activeSection) {
      case 'home':
        return 'Premium clinical eye assessments & corrective lens center';
      case 'doctors':
        return 'Meet our certified doctors and optometric practitioners';
      case 'book':
        return 'Select a service and confirm your clinical checkup slot';
      case 'dashboard':
        return `View visual prescriptions, diagnostic medical scans, and active bookings for ${currentPatient?.name || 'Patient'}`;
      case 'staff':
        return role === 'doctor' 
          ? `Consultation schedules and prescription entry logs for ${currentDoctor?.name || 'Doctor'}` 
          : 'Walk-in booking queues, schedule overrides, and daily overview controls';
      default:
        return 'Advanced Clinical Vision Care';
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <nav className="navbar" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="navbar-container" style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          
          {/* Logo & Brand */}
          <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('home')}>
            <div className="navbar-brand-logo">
              <div className="navbar-brand-icon" style={{ background: 'var(--accent-gradient)' }}>
                <Icons.Clinic />
              </div>
              <div>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>OptiCare</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Vision Center</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="navbar-nav">
            <button 
              className={`navbar-nav-item ${activeSection === 'home' ? 'active' : ''}`}
              onClick={() => setActiveSection('home')}
            >
              Home
            </button>
            <button 
              className={`navbar-nav-item ${activeSection === 'doctors' ? 'active' : ''}`}
              onClick={() => setActiveSection('doctors')}
            >
              Doctors
            </button>
            <button 
              className={`navbar-nav-item ${activeSection === 'book' ? 'active' : ''}`}
              onClick={() => { setActiveSection('book'); setPreselectedDoctorId(''); setActiveTab('book'); }}
            >
              Book Appointment
            </button>
            <button 
              className={`navbar-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveSection('dashboard'); setActiveTab('dashboard'); }}
            >
              Patient Dashboard
            </button>
            <button 
              className={`navbar-nav-item ${activeSection === 'staff' ? 'active' : ''}`}
              onClick={() => { setActiveSection('staff'); setActiveTab('appointments'); }}
              style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', borderRadius: 0 }}
            >
              Staff Portal ⚙️
            </button>
          </div>

          {/* Contextual Dropdowns & Profiles */}
          <div className="navbar-controls">
            
            {/* 1. Patient Profile Selector (Dashboard Section) */}
            {activeSection === 'dashboard' && patients.length > 0 && (
              <div className="navbar-selector">
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>View Profile:</label>
                <select value={activePatientId} onChange={e => { setActivePatientId(e.target.value); triggerRefresh(); }}>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Staff Role Selector (Staff Workspace Section) */}
            {activeSection === 'staff' && (
              <>
                <div className="navbar-selector">
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Staff Workspace:</label>
                  <select value={role} onChange={e => { setRole(e.target.value); setActiveTab(e.target.value === 'doctor' ? 'appointments' : 'dashboard'); }}>
                    <option value="doctor">Optometrist</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                </div>
                {role === 'doctor' && doctors.length > 0 && (
                  <div className="navbar-selector">
                    <select value={activeDoctorId} onChange={e => { setActiveDoctorId(e.target.value); triggerRefresh(); }}>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* User Avatar Initials */}
            <div className="navbar-user-card">
              <div className="navbar-user-avatar" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                {activeSection === 'staff' 
                  ? (role === 'doctor' ? getInitials(currentDoctor?.name) : 'FD') 
                  : getInitials(currentPatient?.name)}
              </div>
            </div>
            
          </div>
        </div>
      </nav>

      {/* ==================== SUB-HEADER SECTION ==================== */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)', 
        padding: '24px 36px' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContext: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{getPageTitle()}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{getPageSubtitle()}</p>
          </div>
          
          {/* Sub-tabs for Dashboard or Portals */}
          {activeSection === 'dashboard' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn-ghost ${activeTab === 'dashboard' ? 'btn-active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Dashboard Home</button>
              <button className={`btn-ghost ${activeTab === 'prescriptions' ? 'btn-active' : ''}`} onClick={() => setActiveTab('prescriptions')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Prescriptions</button>
              <button className={`btn-ghost ${activeTab === 'records' ? 'btn-active' : ''}`} onClick={() => setActiveTab('records')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Medical Diagnostics</button>
            </div>
          )}

          {activeSection === 'staff' && role === 'doctor' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn-ghost ${activeTab === 'appointments' ? 'btn-active' : ''}`} onClick={() => setActiveTab('appointments')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Consultations</button>
              <button className={`btn-ghost ${activeTab === 'overrides' ? 'btn-active' : ''}`} onClick={() => setActiveTab('overrides')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Working Overrides</button>
            </div>
          )}

          {activeSection === 'staff' && role === 'receptionist' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={`btn-ghost ${activeTab === 'dashboard' ? 'btn-active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Daily Overview</button>
              <button className={`btn-ghost ${activeTab === 'walkin' ? 'btn-active' : ''}`} onClick={() => setActiveTab('walkin')} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>Register Walk-in</button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="main-content" style={{ flex: 1, padding: '40px 36px', background: 'var(--bg-primary)' }}>
        <main style={{ maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          
          {activeSection === 'home' && (
            <LandingPage 
              onNavigateToBook={() => { setActiveSection('book'); setPreselectedDoctorId(''); }}
              onNavigateToDoctors={() => setActiveSection('doctors')}
            />
          )}

          {activeSection === 'doctors' && (
            <DoctorsPage 
              onBookForDoctor={(docId) => {
                setPreselectedDoctorId(docId);
                setActiveSection('book');
              }}
            />
          )}

          {activeSection === 'book' && currentPatient && (
            <PatientPortal 
              patient={currentPatient}
              onRefreshTrigger={triggerRefresh}
              activeTab="book"
              preselectedDoctorId={preselectedDoctorId}
              setPreselectedDoctorId={setPreselectedDoctorId}
            />
          )}

          {activeSection === 'dashboard' && currentPatient && (
            <PatientPortal 
              patient={currentPatient} 
              onRefreshTrigger={triggerRefresh} 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}

          {activeSection === 'staff' && (
            role === 'doctor' || role === 'receptionist' ? (
              role === 'doctor' && currentDoctor ? (
                <DoctorPortal 
                  doctor={currentDoctor} 
                  onRefreshTrigger={triggerRefresh}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : (
                <ReceptionistPortal 
                  onRefreshTrigger={triggerRefresh}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )
            ) : (
              <div className="card card-padded empty-state">
                <div className="empty-icon">🔒</div>
                <p>Access Denied: Unauthorized staff permission.</p>
              </div>
            )
          )}

        </main>
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '24px 36px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContext: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p>&copy; {new Date().getFullYear()} OptiCare Vision Center. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveSection('home')}>Home</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveSection('doctors')}>Optometrists</span>
            <span style={{ cursor: 'pointer' }} onClick={() => { setActiveSection('book'); setPreselectedDoctorId(''); }}>Book Clinic Slot</span>
            <span style={{ cursor: 'pointer' }} onClick={() => { setActiveSection('dashboard'); setActiveTab('dashboard'); }}>Patient Dashboard</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
