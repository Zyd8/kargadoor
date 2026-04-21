import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { isAdmin, loading, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  if (!loading && isAdmin) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(username, password)
    if (error) setError(error)
    setSubmitting(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orange:        #eb9d1c;
          --orange-dark:   #c78518;
          --orange-light:  #f0b33d;
          --orange-pale:   #fef8ee;
          --orange-pale2:  #f5d9a0;
          --white:         #FFFFFF;
          --gray-50:       #F9FAFB;
          --gray-100:      #F3F4F6;
          --gray-200:      #E5E7EB;
          --gray-400:      #9CA3AF;
          --gray-500:      #6B7280;
          --gray-700:      #374151;
          --gray-900:      #111827;
        }

        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--white);
        }
        @media (min-width: 900px) {
          .login-root { flex-direction: row; }
        }

        /* ───────── LEFT PANEL ───────── */
        .left-panel {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          background: var(--orange);
          position: relative;
          overflow: hidden;
          flex: 0 0 42%;
          min-width: 0;
          padding: clamp(24px, 4vw, 40px) clamp(28px, 4.5vw, 56px);
        }
        @media (min-width: 1100px) {
          .left-panel { flex: 0 0 44%; padding: 40px 56px; }
        }
        @media (min-width: 900px) { .left-panel { display: flex; } }

        .lp-circle-1 {
          position: absolute;
          bottom: -12vw;
          left: -8vw;
          width: min(480px, 55vw);
          height: min(480px, 55vw);
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
        }
        .lp-circle-2 {
          position: absolute;
          top: -8vw;
          right: -10vw;
          width: min(320px, 38vw);
          height: min(320px, 38vw);
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }

        .lp-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          mask-image: linear-gradient(135deg, transparent 10%, black 50%, transparent 100%);
        }

        .lp-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .lp-path {
          fill: none;
          stroke: rgba(255,255,255,0.18);
          stroke-width: 1.5;
          stroke-dasharray: 8 12;
          animation: dash 4s linear infinite;
        }
        .lp-path-2 {
          fill: none;
          stroke: rgba(255,255,255,0.1);
          stroke-width: 1;
          stroke-dasharray: 4 14;
          animation: dash 6s linear infinite reverse;
        }
        @keyframes dash { to { stroke-dashoffset: -80; } }

        .lp-top { position: relative; z-index: 2; }

        .lp-logo {
          height: clamp(32px, 3.2vw, 40px);
          width: auto;
          max-width: 180px;
          object-fit: contain;
          filter: brightness(0) invert(1);
          margin-bottom: clamp(32px, 5vw, 60px);
          opacity: 0;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
        }

        .lp-heading {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 3.2vw, 40px);
          font-weight: 800;
          color: var(--white);
          line-height: 1.12;
          letter-spacing: -0.03em;
          margin-bottom: clamp(12px, 1.5vw, 18px);
          opacity: 0;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s forwards;
        }

        .lp-sub {
          font-size: clamp(13px, 1.2vw, 15px);
          color: rgba(255,255,255,0.78);
          line-height: 1.65;
          max-width: min(290px, 100%);
          opacity: 0;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.35s forwards;
        }

        .lp-bottom { position: relative; z-index: 2; }

        .stats-row {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
          opacity: 0;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 clamp(16px, 2vw, 24px) 0 0;
        }
        .stat:not(:first-child) {
          padding-left: clamp(16px, 2vw, 24px);
          border-left: 1px solid rgba(255,255,255,0.25);
        }

        .stat-num {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 1.8vw, 24px);
          font-weight: 700;
          color: var(--white);
          letter-spacing: -0.02em;
        }
        .stat-lbl {
          font-size: 10px;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        @media (min-width: 1100px) { .stat-lbl { font-size: 11px; } }

        /* ───────── RIGHT PANEL ───────── */
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(28px, 6vw, 56px) clamp(24px, 5vw, 56px);
          min-height: min(100vh, 100dvh);
          background: var(--white);
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        @media (min-width: 900px) {
          .right-panel { min-height: auto; padding: 56px 64px; }
        }

        .rp-bg {
          position: absolute;
          bottom: -min(130px, 25vw);
          right: -min(130px, 25vw);
          width: min(380px, 70vw);
          height: min(380px, 70vw);
          border-radius: 50%;
          background: var(--orange-pale);
          pointer-events: none;
        }

        .mobile-logo {
          display: block;
          height: clamp(32px, 5vw, 40px);
          width: auto;
          max-width: 160px;
          object-fit: contain;
          margin-bottom: clamp(28px, 4vw, 44px);
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
        }
        @media (min-width: 900px) { .mobile-logo { display: none; } }

        .form-card {
          width: 100%;
          max-width: min(400px, calc(100vw - 48px));
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(18px);
          animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.2s forwards;
        }
        @media (min-width: 600px) {
          .form-card { max-width: 440px; }
        }
        @media (min-width: 900px) {
          .form-card { max-width: 460px; }
        }
        @media (min-width: 1200px) {
          .form-card { max-width: 480px; }
        }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--orange-pale);
          border: 1px solid var(--orange-pale2);
          border-radius: 100px;
          padding: 7px 15px;
          margin-bottom: clamp(18px, 2.5vw, 28px);
        }
        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--orange);
          animation: blink 2.2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .eyebrow-text {
          font-family: 'Syne', sans-serif;
          font-size: clamp(11px, 1.2vw, 12px);
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--orange-dark);
        }

        .form-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 3.5vw, 36px);
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin-bottom: 8px;
        }
        .form-sub {
          font-size: clamp(15px, 1.6vw, 17px);
          color: var(--gray-500);
          margin-bottom: clamp(28px, 4vw, 40px);
          line-height: 1.55;
        }

        .form-group { margin-bottom: clamp(18px, 2.2vw, 24px); }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--gray-500);
          margin-bottom: 8px;
          font-family: 'Syne', sans-serif;
          transition: color 0.18s;
        }
        @media (min-width: 600px) { .field-label { font-size: 12.5px; margin-bottom: 9px; } }
        .field-label.is-focused { color: var(--orange); }

        .input-wrap { position: relative; }

        .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: var(--gray-400);
          pointer-events: none;
          transition: color 0.18s;
        }
        .input-wrap:focus-within .input-icon { color: var(--orange); }

        .field-input {
          width: 100%;
          min-height: 50px;
          background: var(--gray-50);
          border: 1.5px solid var(--gray-200);
          border-radius: 12px;
          padding: 15px 18px 15px 46px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          color: var(--gray-900);
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          -webkit-appearance: none;
        }
        @media (max-width: 479px) {
          .field-input { font-size: 16px; min-height: 48px; padding: 13px 14px 13px 44px; }
        }
        .field-input::placeholder { color: var(--gray-400); font-size: 15px; }
        .field-input:focus {
          border-color: var(--orange);
          background: var(--white);
          box-shadow: 0 0 0 3.5px rgba(235,157,28,0.12);
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #FFF5F5;
          border: 1.5px solid #FED7D7;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 18px;
          animation: slideDown 0.28s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
          width: 16px;
          height: 16px;
          background: #FC8181;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .error-text { font-size: 13px; color: #C53030; line-height: 1.4; }

        .submit-btn {
          width: 100%;
          margin-top: 12px;
          min-height: 52px;
          padding: 15px 24px;
          background: var(--orange);
          border: none;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-size: clamp(14px, 1.3vw, 15px);
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--white);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: background 0.18s, transform 0.14s, box-shadow 0.18s;
          box-shadow: 0 6px 24px rgba(235,157,28,0.35);
        }
        @media (max-width: 479px) {
          .submit-btn { min-height: 50px; padding: 14px 18px; }
        }
        .submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.13) 0%, transparent 100%);
          pointer-events: none;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--orange-dark);
          transform: translateY(-1px);
          box-shadow: 0 10px 32px rgba(235,157,28,0.4);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          position: relative;
          z-index: 1;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          margin-top: clamp(28px, 4vw, 36px);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .footer-line { flex: 1; height: 1px; background: var(--gray-200); min-width: 0; }
        .footer-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .footer-text { font-size: clamp(11px, 1.1vw, 13px); color: var(--gray-400); letter-spacing: 0.04em; }
      `}</style>

      <div className="login-root">

        {/* ── Left branding panel ── */}
        <div className="left-panel">
          <div className="lp-dots" />
          <div className="lp-circle-1" />
          <div className="lp-circle-2" />

          <svg className="lp-svg" viewBox="0 0 440 700" preserveAspectRatio="none">
            <path className="lp-path"  d="M 40 100 Q 180 200 140 320 Q 100 440 260 510 Q 380 560 360 680" />
            <path className="lp-path-2" d="M 280 60 Q 380 180 320 340 Q 260 480 400 600" />
          </svg>

          <div className="lp-top">
            <img 
              src="/kargadoor_white_notext.png" 
              alt="Kargadoor" 
              className="lp-logo" 
              style={{ width: '350px', height: 'auto', marginBottom: '10px' }} 
            />
            <div className="lp-heading" style={{ fontSize: '4rem', fontWeight: 'bold', lineHeight: '1.1', marginBottom: '16px' }}>
              Logistics,<br />made simple.
            </div>
            <div className="lp-sub" style={{ fontSize: '1.5rem', maxWidth: '600px', opacity: 0.9 }}>
              Manage shipments, track deliveries, and oversee your entire logistics operation from one powerful admin dashboard.
            </div>
          </div>

          <div className="lp-bottom">
            <div className="stats-row">
              <div className="stat">
                <span className="stat-num">99.9%</span>
                <span className="stat-lbl">Uptime</span>
              </div>
              <div className="stat">
                <span className="stat-num">24/7</span>
                <span className="stat-lbl">Support</span>
              </div>
              <div className="stat">
                <span className="stat-num">150+</span>
                <span className="stat-lbl">Routes</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right login panel ── */}
        <div className="right-panel">
          <div className="rp-bg" />

          <img src="/kargadoor_logo.png" alt="Kargadoor" className="mobile-logo" />

          <div className="form-card">
            <div className="eyebrow">
              <div className="eyebrow-dot" />
              <span className="eyebrow-text">Admin Portal</span>
            </div>

            <div className="form-title">Welcome back</div>
            <div className="form-sub">Sign in to your admin account to continue.</div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username" className={`field-label${focused === 'username' ? ' is-focused' : ''}`}>
                  Username or Email
                </label>
                <div className="input-wrap">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="username"
                    className="field-input"
                    type="text"
                    placeholder="admin or admin@example.com"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onFocus={() => setFocused('username')}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className={`field-label${focused === 'password' ? ' is-focused' : ''}`}>
                  Password
                </label>
                <div className="input-wrap">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="password"
                    className="field-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="error-box">
                  <div className="error-icon">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="error-text">{error}</span>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={submitting}>
                <span className="btn-inner">
                  {submitting && <span className="spinner" />}
                  {submitting ? 'Signing in…' : 'Sign In'}
                </span>
              </button>
            </form>

            <div className="form-footer">
              <div className="footer-line" />
              <div className="footer-inner">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="footer-text">Secured connection</span>
              </div>
              <div className="footer-line" />
            </div>
          </div>
        </div>

      </div>
    </>
  )
}