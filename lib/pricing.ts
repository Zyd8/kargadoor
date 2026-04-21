export type PricingRow = {
  vehicleType: string;
  baseFare: number;
  perKmRate: number;
};

export type VehicleOption = {
  id: string;
  label: string;
  emoji: string;
  capacity: string;
  eta: string;
  basePrice: number;
};

const VEHICLE_META: Record<string, Omit<VehicleOption, 'id' | 'basePrice'>> = {
  motorcycle: { label: 'Motorcycle', emoji: '🏍️', capacity: 'Up to 15 kg', eta: '~15 min' },
  sedan: { label: 'Sedan', emoji: '🚗', capacity: 'Up to 30 kg', eta: '~18 min' },
  suv: { label: 'SUV', emoji: '🚙', capacity: 'Up to 60 kg', eta: '~20 min' },
  pickup: { label: 'Pickup', emoji: '🛻', capacity: 'Up to 150 kg', eta: '~25 min' },
  cargovan: { label: 'Cargo Van', emoji: '🚐', capacity: 'Up to 300 kg', eta: '~30 min' },
  l300: { label: 'L300', emoji: '🚛', capacity: 'Up to 500 kg', eta: '~30 min' },
  truck: { label: 'Truck', emoji: '🚚', capacity: '300 kg+', eta: '~45 min' },
};

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferMeta(vehicleType: string): Omit<VehicleOption, 'id' | 'basePrice'> {
  const key = vehicleType.trim().toLowerCase();
  if (VEHICLE_META[key]) return VEHICLE_META[key];
  if (key.includes('truck')) return { label: titleCase(vehicleType), emoji: '🚚', capacity: 'Heavy cargo', eta: '~40 min' };
  if (key.includes('van')) return { label: titleCase(vehicleType), emoji: '🚐', capacity: 'Medium cargo', eta: '~30 min' };
  if (key.includes('car') || key.includes('sedan') || key.includes('suv')) return { label: titleCase(vehicleType), emoji: '🚗', capacity: 'Up to 60 kg', eta: '~20 min' };
  if (key.includes('motor')) return { label: titleCase(vehicleType), emoji: '🏍️', capacity: 'Up to 15 kg', eta: '~15 min' };
  return { label: titleCase(vehicleType), emoji: '🚘', capacity: 'Varies', eta: '~20 min' };
}

export function buildVehicleOptionsFromPricing(rows: PricingRow[]): VehicleOption[] {
  return rows
    .filter((row) => row.vehicleType.trim().length > 0)
    .map((row) => {
      const type = row.vehicleType.trim();
      const meta = inferMeta(type);
      return {
        id: type,
        ...meta,
        basePrice: row.baseFare,
      };
    });
}
