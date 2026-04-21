import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, Pencil, X, Check, Tag, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PricingConfig } from '@/types'
import { ALL_VEHICLE_TYPES, formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface EditState {
  vehicleType: string
  baseFare: string
  perKmRate: string
}

export default function Pricing() {
  const [configs, setConfigs]   = useState<PricingConfig[]>([])
  const [loading, setLoading]   = useState(true)
  const [hasTable, setHasTable] = useState(true)
  const [editing, setEditing]   = useState<EditState | null>(null)
  const [saving, setSaving]     = useState(false)
  const { toast } = useToast()

  useEffect(() => { fetchPricing() }, [])

  async function fetchPricing() {
    setLoading(true)
    const { data, error } = await supabase.from('PRICING_CONFIG').select('*').order('VEHICLE_TYPE')
    if (error) { setHasTable(false); setLoading(false); return }
    setHasTable(true)
    setConfigs(data ?? [])
    setLoading(false)
  }

  function startEdit(vehicleType: string, baseFare: number, perKmRate: number) {
    setEditing({ vehicleType, baseFare: baseFare.toString(), perKmRate: perKmRate.toString() })
  }

  function cancelEdit() { setEditing(null) }

  async function saveEdit() {
    if (!editing) return
    const base  = parseFloat(editing.baseFare)
    const perKm = parseFloat(editing.perKmRate)
    if (isNaN(base) || isNaN(perKm) || base < 0 || perKm < 0) {
      toast({ variant: 'destructive', title: 'Invalid values', description: 'Fares must be positive numbers.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('PRICING_CONFIG').upsert({
      VEHICLE_TYPE: editing.vehicleType,
      BASE_FARE: base,
      PER_KM_RATE: perKm,
      UPDATED_AT: new Date().toISOString(),
    }, { onConflict: 'VEHICLE_TYPE' })

    if (error) { toast({ variant: 'destructive', title: 'Save failed', description: error.message }); setSaving(false); return }

    toast({ title: 'Pricing updated', description: `${editing.vehicleType} rates saved.` } as any)
    setConfigs(prev => {
      const exists = prev.find(c => c.VEHICLE_TYPE === editing.vehicleType)
      if (exists) return prev.map(c => c.VEHICLE_TYPE === editing.vehicleType
        ? { ...c, BASE_FARE: base, PER_KM_RATE: perKm, UPDATED_AT: new Date().toISOString() } : c)
      return [...prev, { ID: crypto.randomUUID(), VEHICLE_TYPE: editing.vehicleType, BASE_FARE: base, PER_KM_RATE: perKm, UPDATED_AT: new Date().toISOString() }]
    })
    setEditing(null)
    setSaving(false)
  }

  const rows = ALL_VEHICLE_TYPES.map(vt => {
    const config = configs.find(c => c.VEHICLE_TYPE === vt.type)
    return { ...vt, baseFare: config?.BASE_FARE ?? 0, perKmRate: config?.PER_KM_RATE ?? 0, updatedAt: config?.UPDATED_AT ?? null }
  })

  // Live preview when editing
  const previewTotal = (base: string, perKm: string) =>
    formatCurrency((parseFloat(base) || 0) + (parseFloat(perKm) || 0) * 5)

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

        .pricing-root {
          font-family: 'DM Sans', sans-serif;
          color: var(--gray-900);
          min-height: 100vh;
          background: var(--gray-50);
        }

        /* ── Header ── */
        .pricing-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 28px 36px 0; flex-wrap: wrap; gap: 14px;
        }
        .pricing-header__eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--orange); margin-bottom: 6px;
        }
        .pricing-header__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange); animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .pricing-header__title {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: var(--gray-900); letter-spacing: -0.025em;
        }
        .pricing-header__sub { font-size: 13.5px; color: var(--gray-500); margin-top: 4px; }

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
        .pricing-content { padding: 22px 36px 40px; display: flex; flex-direction: column; gap: 18px; }

        /* ── Info banner ── */
        .info-banner {
          display: flex; align-items: flex-start; gap: 14px;
          background: var(--orange-pale); border: 1.5px solid var(--orange-pale2);
          border-radius: 12px; padding: 16px 18px;
          opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s forwards;
        }
        @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

        .info-banner__icon {
          flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px;
          background: var(--orange-pale2); color: var(--orange-dark);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .info-banner__title {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
          color: var(--orange-dark); margin-bottom: 4px;
        }
        .info-banner__desc { font-size: 13px; color: var(--orange-dark); opacity: 0.8; line-height: 1.6; }
        .info-banner__formula {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(244,121,32,0.12); border-radius: 6px;
          padding: 3px 10px; margin-top: 6px;
          font-family: ui-monospace, monospace; font-size: 12px; color: var(--orange-dark); font-weight: 600;
        }

        /* ── Alert ── */
        .alert-banner {
          display: flex; align-items: flex-start; gap: 12px;
          background: #EFF6FF; border: 1.5px solid #BFDBFE;
          border-radius: 11px; padding: 13px 16px;
          animation: slideDown 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .alert-banner__icon {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
          background: #DBEAFE; color: #2563EB;
          display: flex; align-items: center; justify-content: center;
        }
        .alert-banner__title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #1E40AF; margin-bottom: 3px; }
        .alert-banner__desc { font-size: 13px; color: #1E40AF; opacity: 0.8; line-height: 1.55; }
        .alert-banner__desc code {
          background: rgba(0,0,0,0.07); border-radius: 4px;
          padding: 1px 5px; font-size: 11px; font-family: ui-monospace, monospace;
        }

        /* ── Table panel ── */
        .table-panel {
          background: var(--white); border: 1.5px solid var(--gray-200); border-radius: var(--radius);
          overflow: hidden; opacity: 0; transform: translateY(12px);
          animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s forwards;
        }

        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead tr { background: var(--gray-50); border-bottom: 1.5px solid var(--gray-200); }
        .data-table th {
          padding: 11px 18px; text-align: left;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-400); white-space: nowrap;
        }
        .data-table th:first-child { padding-left: 22px; }
        .data-table th:last-child  { padding-right: 22px; text-align: right; }

        .data-table tbody tr {
          border-bottom: 1px solid var(--gray-100); transition: background 0.12s;
          opacity: 0; animation: rowIn 0.35s ease forwards;
        }
        .data-table tbody tr:last-child { border-bottom: none; }
        .data-table tbody tr:hover { background: var(--gray-50); }
        .data-table tbody tr.row--editing { background: var(--orange-pale) !important; }
        @keyframes rowIn { to { opacity:1; } }

        .data-table td { padding: 14px 18px; font-size: 13.5px; color: var(--gray-700); vertical-align: middle; }
        .data-table td:first-child { padding-left: 22px; }
        .data-table td:last-child  { padding-right: 22px; }

        /* Vehicle type cell */
        .vtype-cell { display: flex; align-items: center; gap: 10px; }
        .vtype-emoji-wrap {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--orange-pale); border: 1.5px solid var(--orange-pale2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; line-height: 1; flex-shrink: 0;
        }
        .vtype-label { font-weight: 600; text-transform: capitalize; color: var(--gray-900); font-size: 13.5px; }

        /* Fare value */
        .fare-val {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--gray-900); letter-spacing: -0.01em;
        }
        .fare-unit { font-size: 11px; color: var(--gray-400); font-weight: 400; margin-left: 2px; }

        /* Sample price */
        .sample-pill {
          display: inline-flex; align-items: center;
          background: var(--green-bg); color: var(--green);
          border-radius: 7px; padding: 4px 10px;
          font-family: 'Syne', sans-serif; font-size: 12.5px; font-weight: 700;
        }
        .sample-pill--editing {
          background: var(--orange-pale); color: var(--orange-dark);
          border: 1.5px solid var(--orange-pale2);
          animation: pricePop 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes pricePop { from{transform:scale(0.9)} to{transform:scale(1)} }

        /* Date */
        .date-val { font-size: 12px; color: var(--gray-400); white-space: nowrap; }

        /* Inline edit inputs */
        .edit-input {
          width: 100px; background: var(--white);
          border: 1.5px solid var(--orange); border-radius: 8px;
          padding: 7px 10px; font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 600; color: var(--gray-900);
          outline: none; box-shadow: 0 0 0 3px rgba(244,121,32,0.1);
          transition: border-color .15s, box-shadow .15s;
        }
        .edit-input:focus { box-shadow: 0 0 0 3.5px rgba(244,121,32,0.15); }

        /* Action buttons */
        .action-cell { display: flex; justify-content: flex-end; gap: 6px; }

        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--gray-200);
          background: var(--white); display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--gray-500); transition: all .15s;
        }
        .icon-btn:hover { border-color: var(--orange); color: var(--orange); background: var(--orange-pale); }
        .icon-btn--save {
          background: var(--orange); border-color: var(--orange); color: var(--white);
        }
        .icon-btn--save:hover { background: var(--orange-dark); border-color: var(--orange-dark); color: var(--white); }
        .icon-btn--save:disabled { opacity: 0.65; cursor: not-allowed; }
        .icon-btn--cancel:hover { border-color: #DC2626; color: #DC2626; background: #FEF2F2; }

        /* Skeleton */
        .skel {
          border-radius: 6px; display: block;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

        /* Result footer */
        .table-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 22px; border-top: 1px solid var(--gray-100);
        }
        .table-footer__note { font-size: 11.5px; color: var(--gray-400); letter-spacing: 0.02em; }
        .table-footer__tag {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'Syne', sans-serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase; color: var(--orange);
        }
      `}</style>

      <div className="pricing-root">
        {/* Header */}
        <div className="pricing-header">
          <div>
            <div className="pricing-header__eyebrow">
              <div className="pricing-header__dot" />
              Kargadoor Admin
            </div>
            <div className="pricing-header__title">Pricing Configuration</div>
            <div className="pricing-header__sub">Set base fares and per-km rates for each vehicle type</div>
          </div>
          <button className="refresh-btn" onClick={fetchPricing} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="pricing-content">

          {/* Migration alert */}
          {!hasTable && (
            <div className="alert-banner">
              <div className="alert-banner__icon"><AlertCircle size={15} /></div>
              <div>
                <div className="alert-banner__title">PRICING_CONFIG table not found</div>
                <div className="alert-banner__desc">
                  Run the SQL in <code>migrations/MIGRATION_REQUIRED.sql</code> to create the pricing configuration table.
                </div>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="info-banner">
            <div className="info-banner__icon"><Info size={15} /></div>
            <div>
              <div className="info-banner__title">How pricing works</div>
              <div className="info-banner__desc">
                The total order price is calculated using the Haversine formula between pickup and dropoff coordinates.
              </div>
              <div className="info-banner__formula">
                Total = Base Fare + (Per-km Rate × distance km)
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Type</th>
                  <th>Base Fare (₱)</th>
                  <th>Per Km (₱)</th>
                  <th>Sample · 5 km</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && ALL_VEHICLE_TYPES.map((vt, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="skel" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                        <span className="skel" style={{ height: 14, width: 80 }} />
                      </div>
                    </td>
                    {[70, 70, 80, 90, 40].map((w, j) => (
                      <td key={j}><span className="skel" style={{ height: 14, width: w }} /></td>
                    ))}
                  </tr>
                ))}

                {!loading && rows.map((row, idx) => {
                  const isEditing = editing?.vehicleType === row.type
                  const samplePrice = isEditing
                    ? previewTotal(editing!.baseFare, editing!.perKmRate)
                    : formatCurrency(row.baseFare + row.perKmRate * 5)

                  return (
                    <tr
                      key={row.type}
                      className={isEditing ? 'row--editing' : ''}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {/* Vehicle */}
                      <td>
                        <div className="vtype-cell">
                          <div className="vtype-emoji-wrap">{row.emoji}</div>
                          <span className="vtype-label">{row.label}</span>
                        </div>
                      </td>

                      {/* Base fare */}
                      <td>
                        {isEditing ? (
                          <input
                            type="number" min="0" step="0.01"
                            className="edit-input"
                            value={editing!.baseFare}
                            onChange={e => setEditing(prev => prev ? { ...prev, baseFare: e.target.value } : prev)}
                            autoFocus
                          />
                        ) : (
                          <span className="fare-val">{formatCurrency(row.baseFare)}</span>
                        )}
                      </td>

                      {/* Per km */}
                      <td>
                        {isEditing ? (
                          <input
                            type="number" min="0" step="0.01"
                            className="edit-input"
                            value={editing!.perKmRate}
                            onChange={e => setEditing(prev => prev ? { ...prev, perKmRate: e.target.value } : prev)}
                          />
                        ) : (
                          <span className="fare-val">{formatCurrency(row.perKmRate)}<span className="fare-unit">/km</span></span>
                        )}
                      </td>

                      {/* Sample */}
                      <td>
                        <span className={`sample-pill${isEditing ? ' sample-pill--editing' : ''}`}>
                          {samplePrice}
                        </span>
                      </td>

                      {/* Updated */}
                      <td>
                        <span className="date-val">{row.updatedAt ? formatDate(row.updatedAt) : '—'}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        {hasTable && (
                          <div className="action-cell">
                            {isEditing ? (
                              <>
                                <button
                                  className="icon-btn icon-btn--save"
                                  onClick={saveEdit}
                                  disabled={saving}
                                  title="Save"
                                >
                                  {saving
                                    ? <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'block' }} />
                                    : <Check size={14} />
                                  }
                                </button>
                                <button className="icon-btn icon-btn--cancel" onClick={cancelEdit} title="Cancel">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                className="icon-btn"
                                onClick={() => startEdit(row.type, row.baseFare, row.perKmRate)}
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!loading && (
              <div className="table-footer">
                <span className="table-footer__note">Click the pencil icon to edit any vehicle's pricing</span>
                <span className="table-footer__tag"><Tag size={11} /> {rows.length} vehicle types</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}