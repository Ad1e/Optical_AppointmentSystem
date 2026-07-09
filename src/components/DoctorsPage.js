import React from 'react';

export default function DoctorsPage({ onBookForDoctor }) {
  const doctors = [
    {
      id: 'doc-1',
      name: "Dr. Sarah Santos, OD",
      specialty: "Primary Eye Care & Contact Lenses",
      experience: "12 years clinical practice",
      bio: "Dr. Santos specializes in custom contact lens fitting for astigmatism and presbyopia, as well as computer vision syndrome therapeutics.",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200",
      hours: {
        weekdays: "9:00 AM - 5:00 PM",
        saturday: "9:00 AM - 1:00 PM"
      }
    },
    {
      id: 'doc-2',
      name: "Dr. Marcus Cruz, OD",
      specialty: "Pediatric Optometry & Vision Therapy",
      experience: "8 years clinical practice",
      bio: "Dr. Cruz focuses on children's ocular visual efficiency, amblyopia therapy, and alignment checkups. He makes examinations comfortable and fun.",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200",
      hours: {
        weekdays: "10:00 AM - 6:00 PM",
        saturday: "10:00 AM - 6:00 PM"
      }
    },
    {
      id: 'doc-3',
      name: "Dr. Angela Lim, OD",
      specialty: "Geriatric Care & Low Vision Specialist",
      experience: "15 years clinical practice",
      bio: "Dr. Lim is certified in macular degeneration assistance, diabetic retinopathy screenings, and customized progressive lens design.",
      avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200",
      hours: {
        weekdays: "8:30 AM - 4:30 PM (Mon-Wed)",
        saturday: "Closed"
      }
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Clinical Staff Directory</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Learn about our certified optometrists and view their standard clinic schedules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {doctors.map((doc) => (
          <div key={doc.id} className="card card-padded" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '2px solid var(--border-color)',
                flexShrink: 0
              }}>
                <img src={doc.avatar} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{doc.name}</h3>
                <span className="badge badge-info" style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.7rem' }}>
                  {doc.specialty}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 650 }}>
                  {doc.experience}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {doc.bio}
              </p>
              
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Standard Working Hours:</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Mon - Fri:</span>
                  <span className="font-semibold">{doc.hours.weekdays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Saturday:</span>
                  <span className="font-semibold">{doc.hours.saturday}</span>
                </div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => onBookForDoctor(doc.id)} 
              style={{ width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}
            >
              Book Slot
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
