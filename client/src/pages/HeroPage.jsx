import React from 'react';
import { useNavigate } from 'react-router-dom';
import CinematicScrollExperience from '../components/CinematicScrollExperience';
import { useAuth } from '../auth';
import './HeroPage.css';

export default function HeroPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAction = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="pv-hero-wrapper" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. SINGLE UNIFIED FIXED GLASS HEADER */}
      <header className="pv-header">
        <div className="pv-header-inner">
          {/* Logo & Brand: Uses the official logo image with NO duplicate text */}
          <div className="pv-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/chestx-logo.png"
              alt="Chest-X AI"
              style={{ height: 42, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Right Header Actions */}
          <div className="pv-header-actions">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.25)', fontSize: 11, fontWeight: 700, color: '#00f2fe', letterSpacing: '0.05em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f2fe', boxShadow: '0 0 8px #00f2fe' }} />
              <span>DenseNet-121 Ready</span>
            </div>

            {user ? (
              <>
                <button
                  type="button"
                  className="pv-btn-signin"
                  onClick={() => navigate('/')}
                >
                  Worklist ({user.full_name?.split(' ')[0]})
                </button>
                <button
                  type="button"
                  className="pv-btn-primary"
                  onClick={() => navigate('/new')}
                >
                  <span>New Study</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="pv-btn-signin"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="pv-btn-primary"
                  onClick={() => navigate('/login')}
                >
                  <span>Explore Platform</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="pv-avatar-btn"
              onClick={handleAction}
              aria-label="User Account"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CINEMATIC FRAME-BY-FRAME SCROLL EXPERIENCE */}
      <CinematicScrollExperience
        onExplore={handleAction}
        onLoginClick={() => navigate('/login')}
        onNavClick={() => handleAction()}
      />
    </div>
  );
}
