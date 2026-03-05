/**
 * Maps app vehicle IDs (used in UI) to backend PRICING_CONFIG.VEHICLE_TYPE values.
 * The database and admin panel use backend names; the mobile app uses these app IDs.
 */
export const APP_VEHICLE_TO_BACKEND: Record<string, string> = {
  bike: 'bike',
  ebike: 'motorcycle',
  moto: 'motorcycle',
  sedan: 'car',
  suv: 'mpv',
  pickup: 'small truck',
  cargovan: 'van',
  truck: 'truck',
};

/**
 * Maps backend PRICING_CONFIG.VEHICLE_TYPE to app vehicle IDs that should show that pricing.
 */
export const BACKEND_TO_APP_VEHICLES: Record<string, string[]> = {
  bike: ['bike'],
  motorcycle: ['moto', 'ebike'],
  car: ['sedan'],
  mpv: ['suv'],
  van: ['cargovan'],
  l300: ['pickup'],
  'small truck': ['pickup'],
  'large truck': ['truck'],
  truck: ['truck'],
};

export type PricingRow = { baseFare: number; perKmRate: number };

/**
 * Resolve backend vehicle type for RPC/edge calls (get_delivery_quote, etc.).
 */
export function getBackendVehicleType(appVehicleId: string | null): string | null {
  if (!appVehicleId) return null;
  return APP_VEHICLE_TO_BACKEND[appVehicleId] ?? appVehicleId;
}
