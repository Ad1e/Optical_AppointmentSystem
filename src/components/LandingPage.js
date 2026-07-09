import React from 'react';

export default function LandingPage({ onNavigateToBook, onNavigateToDoctors }) {
  const services = [
    {
      title: "Comprehensive Eye Exam",
      description: "Thorough assessment of your vision health and visual acuity using advanced computer-guided diagnostics.",
      price: "₱1,200",
      duration: "30 mins",
      icon: "👁️"
    },
    {
      title: "Contact Lens Fitting",
      description: "Precise measurements and customized fitting for soft, toric, multifocal, or rigid gas permeable lenses.",
      price: "₱1,500",
      duration: "45 mins",
      icon: "🔍"
    },
    {
      title: "Premium Frame Styling",
      description: "Personalized fitting consultation with our optical specialists to select frames matching your style.",
      price: "Free w/ lens purchase",
      duration: "30 mins",
      icon: "👓"
    },
    {
      title: "Pediatric Eye Checkup",
      description: "Specialized, friendly screening to identify and correct children's refractive errors early.",
      price: "₱1,000",
      duration: "30 mins",
      icon: "👶"
    }
  ];

  const doctors = [
    {
      name: "Dr. Sarah Santos, OD",
      specialty: "Primary Eye Care & Contact Lenses",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Dr. Marcus Cruz, OD",
      specialty: "Pediatric Optometry & Vision Therapy",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Dr. Angela Lim, OD",
      specialty: "Geriatric Care & Low Vision Specialist",
      avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200"
    }
  ];

  const testimonials = [
    {
      text: "The eye exam was incredibly thorough. Dr. Santos explained every scan, including the retinal photograph. Truly premium care!",
      author: "Juan Dela Cruz",
      role: "Patient since 2025"
    },
    {
      text: "My daughter was always scared of doctor visits, but Dr. Cruz was so warm and patient. The booking process was very smooth.",
      author: "Maria Clara",
      role: "Parent"
    },
    {
      text: "Wonderful customer service! They helped me style my new titanium frames and gave me very detailed care instructions.",
      author: "Jose Rizal",
      role: "Patient since 2024"
    }
  ];

  return (
    <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', gap: '80px', padding: '20px 0' }}>
      
      {/* Hero Section */}
      <section className="hero-section" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'center',
        padding: '60px 0',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
          <div className="badge badge-success" style={{ alignSelf: 'flex-start', background: 'var(--success-bg)', color: 'var(--success)', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            ✓ Accredited Medical Eye Care Clinic
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Advanced Diagnostics.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Personalized Vision.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '520px' }}>
            OptiCare Vision Center pairs clinical optometric expertise with state-of-the-art diagnostic imaging to deliver comprehensive checkups and custom progressive glasses.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <button className="btn-primary" onClick={onNavigateToBook} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
              Book Appointment
            </button>
            <button className="btn-secondary" onClick={onNavigateToDoctors} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
              Meet Optometrists
            </button>
          </div>
        </div>
        
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-2xl)',
          overflow: 'hidden',
          border: '4px solid var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <img 
            src="/images/opticare_banner.png" 
            alt="OptiCare Vision Banner" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800";
            }}
          />
        </div>
      </section>

      {/* Services Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Clinic Services</h2>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>Exceptional eye care tailored to your lifestyle</p>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem' }}>
            We offer comprehensive diagnostic checkups, contact lens customization, and specialty pediatric and geriatric vision services.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {services.map((svc, idx) => (
            <div key={idx} className="card card-padded" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '2rem' }}>{svc.icon}</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{svc.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{svc.description}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{svc.duration}</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{svc.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Doctors Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Optometrists</h2>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>Meet our licensed optical physicians</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
          {doctors.map((doc, idx) => (
            <div key={idx} className="card card-padded" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textCenter: 'center', gap: '16px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--border-color)' }}>
                <img src={doc.avatar} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{doc.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold', marginTop: '4px' }}>{doc.specialty}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Available on scheduled slots</p>
              </div>
              <button className="btn-ghost" onClick={onNavigateToBook} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                Book Slot &rarr;
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Reviews</h2>
          <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>Trusted by generations of families</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} className="card card-padded" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t.author}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking CTA Section */}
      <section className="card card-accent" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '60px 40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        borderRadius: 'var(--radius-2xl)'
      }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', tracking: '-0.02em' }}>
          Ready to experience clinical vision care?
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Schedule your eye exam in less than 2 minutes. Receive automatic checkup alerts, view digital ocular scan history, and keep prescription records on file.
        </p>
        <button className="btn-primary" onClick={onNavigateToBook} style={{ padding: '14px 32px', fontSize: '1rem' }}>
          Book Appointment Now
        </button>
      </section>

    </div>
  );
}
