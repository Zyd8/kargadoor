import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return `₱${amount.toFixed(2)}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export const VEHICLE_EMOJIS: Record<string, string> = {
  bike: '🚲',
  motorcycle: '🏍️',
  car: '🚗',
  mpv: '🚐',
  van: '🚌',
  l300: '🚐',
  'small truck': '🚚',
  'large truck': '🚛',
  truck: '🚚',
}

export const ALL_VEHICLE_TYPES = [
  { type: 'bike', label: 'Bike', emoji: '🚲' },
  { type: 'motorcycle', label: 'Motorcycle', emoji: '🏍️' },
  { type: 'car', label: 'Car', emoji: '🚗' },
  { type: 'mpv', label: 'MPV', emoji: '🚐' },
  { type: 'van', label: 'Van', emoji: '🚌' },
  { type: 'l300', label: 'L300', emoji: '🚐' },
  { type: 'small truck', label: 'Small Truck', emoji: '🚚' },
  { type: 'large truck', label: 'Large Truck', emoji: '🚛' },
]
