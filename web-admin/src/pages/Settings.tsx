import { useEffect, useState } from 'react'
import { MapPin, RefreshCw, AlertCircle, Save, Settings as SettingsIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

const RADIUS_KEY     = 'delivery_radius_meters'
const RADIUS_DEFAULT = 100

interface AppConfig {
  KEY: string
  VALUE: string
  DESCRIPTION: string | null
  UPDATED_AT: string | null
}

const PRESETS = [50, 100, 150, 200, 500]

export default function Settings() {
  const [config, setConfig]   = useState<AppConfig | null>(null)
  const [radius, setRadius]   = useState(RADIUS_DEFAULT.toString())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [hasTable, setHasTable] = useState(true)
  const [dirty, setDirty]     = useState(false)
  const { toast } = useToast()

  useEffect(() => { fetchConfig() }, [])

  async function fetchConfig() {
    setLoading(true)
    const { data, error } = await supabase.from('APP_CONFIG').select('*').eq('KEY', RADIUS_KEY).single()
    if (error) { setHasTable(false); setLoading(false); return }
    setHasTable(true)
    setConfig(data)
    setRadius(data?.VALUE ?? RADIUS_DEFAULT.toString())
    setDirty(false)
    setLoading(false)
  }

  function handleRadiusChange(val: string) {
    setRadius(val)
    setDirty(true)
  }

  async function save() {
    const val = parseInt(radius, 10)
    if (isNaN(val) || val < 10 || val > 10000) {
      toast({ variant: 'destructive', title: 'Invalid radius', description: 'Must be between 10 and 10,000 meters.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('APP_CONFIG').upsert({
      KEY: RADIUS_KEY, VALUE: val.toString(), UPDATED_AT: new Date().toISOString(),
    })
    if (error) { toast({ variant: 'destructive', title: 'Save failed', description: error.message }); setSaving(false); return }
    toast({ title: 'Settings saved', description: `Delivery radius set to ${val} m.` } as any)
    await fetchConfig()
    setSaving(false)
  }

  const radiusNum  = parseInt(radius, 10)
  const isValid    = !isNaN(radiusNum) && radiusNum >= 10 && radiusNum <= 10000
  // Map 10–10000 → 32–140px circle
  const circleSize = isValid ? Math.max(32, Math.min(140, (radiusNum / 10000) * 140 + 32)) : 32

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        :root {
          --orange:       #F47920;
          --orange-dark:  #D9640A;
          --orange-pale:  #FFF4EB;
          --orange-pale2: #FDDCBB;
          --white:        #FFFFFF;
          --gray-50:      #F9FAFB;
          --gray-100:     #F3F4F6;
          --gray-200:     #E5E7EB;
          --gray-300:     #D1D5DB;
          --gray-400:     #9CA3AF;
          --gray-500:     #6B7280;
          --gray-700:     #374151;
          --gray-900:     #111827;
          --green:        #059669;
          --green-bg:     #F0FDF4;
          --radius:       14px;
        }

        .settings-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .settings-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 28px 36px 0; flex-wrap: wrap; gap: 14px;
        }
        .settings-header__eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--orange); margin-bottom: 6px;
        }
        .settings-header__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange); animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .settings-header__title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.025em;
        }
        .settings-header__sub { font-size: 13.5px; color: var(--gray-500); margin-top: 4px; }

        .refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: 9px;
          padding: 9px 16px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 0.04em; color: var(--gray-700); cursor: pointer;
          transition: border-color .18s, box-shadow .18s, color .18s;
        }
        .refresh-btn:hover:not(:disabled) { border-color: var(--orange); color: var(--orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.08); }
        .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Content ── */
        .settings-content {
          padding: 22px 36px 40px;
          display: flex; flex-direction: column; gap: 18px;
          max-width: 680px;
        }

        /* ── Alert banner ── */
        .alert-banner {
          display: flex; align-items: flex-start; gap: 12px;
          border-radius: 11px; padding: 13px 16px;
          animation: slideDown 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .alert-banner--info    { background: #EFF6FF; border: 1.5px solid #BFDBFE; }
        .alert-banner--warning { background: #FFFBEB; border: 1.5px solid #FDE68A; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .alert-banner__icon {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .alert-banner--info    .alert-banner__icon { background: #DBEAFE; color: #2563EB; }
        .alert-banner--warning .alert-banner__icon { background: #FEF3C7; color: #D97706; }
        .alert-banner__title {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; margin-bottom: 4px;
        }
        .alert-banner--info    .alert-banner__title { color: #1E40AF; }
        .alert-banner--warning .alert-banner__title { color: #92400E; }
        .alert-banner__desc { font-size: 13px; line-height: 1.6; }
        .alert-banner--info    .alert-banner__desc { color: #1E40AF; opacity: 0.85; }
        .alert-banner--warning .alert-banner__desc { color: #92400E; opacity: 0.85; }
        .alert-banner__desc code {
          background: rgba(0,0,0,0.07); border-radius: 4px;
          padding: 1px 5px; font-size: 11px; font-family: ui-monospace, monospace;
        }
        .alert-banner__desc pre {
          margin-top: 8px; background: rgba(0,0,0,0.06); border-radius: 8px;
          padding: 10px 13px; font-size: 11.5px; font-family: ui-monospace, monospace;
          overflow-x: auto; line-height: 1.6;
        }

        /* ── Setting card ── */
        .setting-card {
          background: var(--white); border: 1.5px solid var(--gray-200);
          border-radius: var(--radius); overflow: hidden;
          opacity: 0; transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .setting-card__header {
          display: flex; align-items: center; gap: 13px;
          padding: 20px 24px 18px;
          border-bottom: 1.5px solid var(--gray-100);
        }
        .setting-card__icon {
          flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px;
          background: var(--orange-pale); border: 1.5px solid var(--orange-pale2);
          display: flex; align-items: center; justify-content: center;
          color: var(--orange);
        }
        .setting-card__title {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: var(--gray-900); letter-spacing: -0.01em;
        }
        .setting-card__desc {
          font-size: 13px; color: var(--gray-500); margin-top: 3px; line-height: 1.5;
        }
        .setting-card__body { padding: 22px 24px; display: flex; flex-direction: column; gap: 24px; }

        /* ── Radius row ── */
        .radius-row {
          display: flex; align-items: flex-start; gap: 32px; flex-wrap: wrap;
        }

        .radius-input-col { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }

        .field-label {
          font-family: 'Syne', sans-serif; font-size: 11.5px; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase; color: var(--gray-500);
        }

        .radius-input-wrap { display: flex; align-items: center; gap: 8px; }
        .radius-input {
          width: 120px; background: var(--gray-50); border: 1.5px solid var(--gray-200);
          border-radius: 10px; padding: 11px 13px;
          font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          color: var(--gray-900); outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
          -webkit-appearance: none;
        }
        .radius-input:focus {
          border-color: var(--orange); background: var(--white);
          box-shadow: 0 0 0 3.5px rgba(244,121,32,0.1);
        }
        .radius-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .radius-unit {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
          color: var(--gray-400); letter-spacing: 0.04em;
        }
        .radius-hint { font-size: 11.5px; color: var(--gray-400); }

        /* ── Visual preview ── */
        .radius-preview {
          flex: 1; min-width: 160px;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px;
          background: var(--gray-50); border: 1.5px solid var(--gray-200);
          border-radius: 12px; padding: 20px;
          min-height: 160px;
        }
        .preview-map {
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .preview-circle {
          border-radius: 50%;
          border: 2px dashed var(--orange);
          background: var(--orange-pale);
          transition: width 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .preview-pin {
          position: absolute;
          color: var(--orange-dark);
          filter: drop-shadow(0 2px 4px rgba(244,121,32,0.4));
        }
        .preview-rings {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 1px solid var(--orange);
          opacity: 0.2;
          animation: ringPulse 2.5s ease-out infinite;
        }
        .preview-rings-2 {
          animation-delay: 1.25s;
        }
        @keyframes ringPulse {
          0%   { transform: scale(1); opacity: 0.25; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .preview-label {
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          color: var(--orange-dark); letter-spacing: 0.02em;
        }
        .preview-label--invalid { color: var(--gray-400); }

        /* ── Presets ── */
        .presets-row { display: flex; flex-direction: column; gap: 8px; }
        .presets-label {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-400);
        }
        .presets-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .preset-chip {
          padding: 7px 14px; border-radius: 8px;
          border: 1.5px solid var(--gray-200); background: var(--white);
          font-family: 'Syne', sans-serif; font-size: 12.5px; font-weight: 600;
          color: var(--gray-600); cursor: pointer; letter-spacing: 0.02em;
          transition: all .15s;
        }
        .preset-chip:hover:not(:disabled) { border-color: var(--orange); color: var(--orange); background: var(--orange-pale); }
        .preset-chip.active { background: var(--orange); border-color: var(--orange); color: var(--white); }
        .preset-chip:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Save row ── */
        .save-row {
          display: flex; align-items: center; gap: 16px;
          padding-top: 20px; border-top: 1.5px solid var(--gray-100);
          flex-wrap: wrap;
        }
        .save-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 22px;
          background: var(--orange); border: none; border-radius: 10px;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--white); cursor: pointer;
          transition: background .18s, transform .14s, box-shadow .18s;
          box-shadow: 0 4px 18px rgba(244,121,32,0.28);
          position: relative; overflow: hidden;
        }
        .save-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
          pointer-events: none;
        }
        .save-btn:hover:not(:disabled) { background: var(--orange-dark); transform: translateY(-1px); box-shadow: 0 8px 28px rgba(244,121,32,0.35); }
        .save-btn:active:not(:disabled) { transform: translateY(0); }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

        .btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .save-meta { font-size: 12px; color: var(--gray-400); }
        .save-meta strong { color: var(--gray-600); font-weight: 600; }

        /* ── Dirty indicator ── */
        .dirty-dot {
          display: inline-block; width: 7px; height: 7px;
          border-radius: 50%; background: var(--orange);
          margin-right: 6px; animation: blink 1s ease-in-out infinite;
        }

        /* ── Skeleton ── */
        .skel {
          border-radius: 8px; display: block;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* ── Code card (integration note) ── */
        .code-card {
          background: var(--white); border: 1.5px solid var(--gray-200);
          border-radius: var(--radius); overflow: hidden;
          opacity: 0; transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.25s forwards;
        }
        .code-card__header {
          display: flex; align-items: center; gap: 11px;
          padding: 16px 20px; border-bottom: 1.5px solid var(--gray-100);
        }
        .code-card__icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: #EFF6FF; color: #2563EB;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .code-card__title {
          font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700; color: var(--gray-900);
        }
        .code-card__body { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
        .code-card__desc { font-size: 13px; color: var(--gray-500); line-height: 1.6; }
        .code-card__pre {
          background: var(--gray-900); border-radius: 10px;
          padding: 14px 16px; font-size: 12px;
          font-family: ui-monospace, 'Cascadia Code', monospace;
          color: #E5E7EB; overflow-x: auto; line-height: 1.7;
        }
        .code-card__pre .token-key    { color: #93C5FD; }
        .code-card__pre .token-str    { color: #86EFAC; }
        .code-card__pre .token-method { color: #FCA5A5; }
        .code-card__footer { padding: 12px 20px; border-top: 1.5px solid var(--gray-100); font-size: 12.5px; color: var(--gray-500); line-height: 1.6; }
      `}</style>

      <div className="settings-root">
        {/* Header */}
        <div className="settings-header">
          <div>
            <div className="settings-header__eyebrow">
              <div className="settings-header__dot" />
              Kargadoor Admin
            </div>
            <div className="settings-header__title">Settings</div>
            <div className="settings-header__sub">App-wide configuration for the logistics platform</div>
          </div>
          <button className="refresh-btn" onClick={fetchConfig} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="settings-content">

          {/* Migration warning */}
          {!hasTable && (
            <div className="alert-banner alert-banner--warning">
              <div className="alert-banner__icon"><AlertCircle size={15} /></div>
              <div>
                <div className="alert-banner__title">APP_CONFIG table not found</div>
                <div className="alert-banner__desc">
                  Run the SQL in <code>migrations/MIGRATION_REQUIRED.sql</code> to create the app configuration table.
                </div>
              </div>
            </div>
          )}

          {/* Delivery radius card */}
          <div className="setting-card">
            <div className="setting-card__header">
              <div className="setting-card__icon"><MapPin size={17} /></div>
              <div>
                <div className="setting-card__title">Delivery Radius</div>
                <div className="setting-card__desc">
                  How close (in meters) a driver must be to the dropoff before they can mark an order as delivered.
                </div>
              </div>
            </div>

            <div className="setting-card__body">
              {loading ? (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="skel" style={{ width: 80, height: 12 }} />
                    <span className="skel" style={{ width: 120, height: 46, borderRadius: 10 }} />
                    <span className="skel" style={{ width: 100, height: 10 }} />
                  </div>
                  <span className="skel" style={{ flex: 1, minWidth: 160, height: 160, borderRadius: 12 }} />
                </div>
              ) : (
                <>
                  <div className="radius-row">
                    {/* Input */}
                    <div className="radius-input-col">
                      <span className="field-label">Radius (meters)</span>
                      <div className="radius-input-wrap">
                        <input
                          type="number" min={10} max={10000} step={10}
                          className="radius-input"
                          value={radius}
                          onChange={e => handleRadiusChange(e.target.value)}
                          disabled={!hasTable}
                        />
                        <span className="radius-unit">m</span>
                      </div>
                      <span className="radius-hint">Min 10 m · Max 10,000 m</span>
                    </div>

                    {/* Visual preview */}
                    <div className="radius-preview">
                      <div className="preview-map">
                        <div
                          className="preview-circle"
                          style={{ width: circleSize, height: circleSize }}
                        />
                        {isValid && (
                          <>
                            <div className="preview-rings" style={{ width: circleSize, height: circleSize }} />
                            <div className="preview-rings preview-rings-2" style={{ width: circleSize, height: circleSize }} />
                          </>
                        )}
                        <MapPin size={18} className="preview-pin" />
                      </div>
                      <span className={`preview-label${!isValid ? ' preview-label--invalid' : ''}`}>
                        {isValid ? `${radiusNum} m radius` : 'Invalid value'}
                      </span>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="presets-row">
                    <span className="presets-label">Quick presets</span>
                    <div className="presets-chips">
                      {PRESETS.map(v => (
                        <button
                          key={v}
                          className={`preset-chip${radiusNum === v ? ' active' : ''}`}
                          onClick={() => handleRadiusChange(v.toString())}
                          disabled={!hasTable}
                        >
                          {v} m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <div className="save-row">
                    <button
                      className="save-btn"
                      onClick={save}
                      disabled={saving || !hasTable || !isValid}
                    >
                      {saving ? (
                        <><span className="btn-spinner" />Saving…</>
                      ) : (
                        <><Save size={14} />Save Changes</>
                      )}
                    </button>

                    <div className="save-meta">
                      {dirty && <span className="dirty-dot" />}
                      {config?.UPDATED_AT
                        ? <><strong>Last saved:</strong> {new Date(config.UPDATED_AT).toLocaleString()}</>
                        : <span>No changes saved yet</span>
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Integration note */}
          {hasTable && (
            <div className="code-card">
              <div className="code-card__header">
                <div className="code-card__icon"><AlertCircle size={14} /></div>
                <div className="code-card__title">Mobile App Integration</div>
              </div>
              <div className="code-card__body">
                <div className="code-card__desc">
                  The mobile app should fetch this value from the <code style={{ background:'var(--gray-100)',padding:'1px 5px',borderRadius:4,fontSize:12,fontFamily:'ui-monospace,monospace' }}>APP_CONFIG</code> table at startup:
                </div>
                <pre className="code-card__pre">{`supabase
  .<span class="token-method">from</span>(<span class="token-str">'APP_CONFIG'</span>)
  .<span class="token-method">select</span>(<span class="token-str">'VALUE'</span>)
  .<span class="token-method">eq</span>(<span class="token-key">'KEY'</span>, <span class="token-str">'delivery_radius_meters'</span>)
  .<span class="token-method">single</span>()`}</pre>
              </div>
              <div className="code-card__footer">
                Use the returned value (in meters) to check if the driver's GPS location is within range of the dropoff coordinates before enabling the "Mark as Delivered" button.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}