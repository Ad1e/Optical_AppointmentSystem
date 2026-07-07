import React, { useState, useEffect } from 'react';
import './App.css';
import { getPatients, getDoctors } from './db';
import PatientPortal from './PatientPortal';
import DoctorPortal from './DoctorPortal';
import ReceptionistPortal from './ReceptionistPortal';

function App() {
  const [theme, setTheme] = useState('dark');
  const [role, setRole] = useState('patient'); // patient, doctor, receptionist
  
  // Simulated Logged-in user context
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activePatientId, setActivePatientId] = useState('');
  const [activeDoctorId, setActiveDoctorId] = useState('');
  
  // Trigger component refresh when sub-components update db
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const pats = getPatients();
    const docs = getDoctors();
    setPatients(pats);
    setDoctors(docs);

    if (pats.length > 0 && !activePatientId) {
      setActivePatientId(pats[0].id);
    }
    if (docs.length > 0 && !activeDoctorId) {
      setActiveDoctorId(docs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Handle Theme Toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  // Run initial theme set
  useEffect(() => {
    document.body.classList.add('dark-theme');
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const currentPatient = patients.find(p => p.id === activePatientId);
  const currentDoctor = doctors.find(d => d.id === activeDoctorId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Simulation Ribbon at Top */}
      <div style={{ 
        backgroundColor: 'var(--bg-tertiary)', 
        borderBottom: '1px solid var(--border-color)', 
        padding: '10px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.85rem',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>⚙️ SIMULATION CONTROLS:</span>
          <span style={{ color: 'var(--text-secondary)' }}>Act as Role:</span>
          <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            {['patient', 'doctor', 'receptionist'].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  background: role === r ? 'var(--accent-primary)' : 'none',
                  color: role === r ? '#ffffff' : 'var(--text-primary)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  fontWeight: 600
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* User Context Selector based on role */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {role === 'patient' && patients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Patient Profile:</span>
              <select 
                value={activePatientId} 
                onChange={e => setActivePatientId(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'doctor' && doctors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Optometrist Profile:</span>
              <select 
                value={activeDoctorId} 
                onChange={e => setActiveDoctorId(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>

      {/* Main Clinic Container */}
      <div style={{ flex: 1, padding: '32px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        
        {/* Main Branding Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--info) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
              OptiCare Clinic System
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '2px' }}>Professional Refraction & Scheduling Web Portal</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Status: ONLINE-FIRST</span>
            <span>Local Database Mock Active</span>
          </div>
        </header>

        {/* Dynamic Portal Router Panel */}
        <main className="glass-panel" style={{ padding: '32px', minHeight: '500px' }}>
          {role === 'patient' && currentPatient ? (
            <PatientPortal patient={currentPatient} onRefreshTrigger={triggerRefresh} />
          ) : role === 'doctor' && currentDoctor ? (
            <DoctorPortal doctor={currentDoctor} onRefreshTrigger={triggerRefresh} />
          ) : role === 'receptionist' ? (
            <ReceptionistPortal onRefreshTrigger={triggerRefresh} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading simulator workspace data...
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '24px', 
        borderTop: '1px solid var(--border-color)', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        marginTop: 'auto'
      }}>
        OptiCare Vision Center &copy; 2026. Made for Solo Development Workspace demo.
      </footer>

    </div>
  );
}

export default App;
