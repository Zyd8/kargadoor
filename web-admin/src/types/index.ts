export type Role = 'USER' | 'DRIVER' | 'admin'
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'CANCELLED'
export type PaymentMethod = 'Cash' | 'GCash'

export interface Profile {
  ID: string
  ROLE: Role | null
  FULL_NAME: string | null
  PHONE_NUMBER: string | null
  EMAIL: string | null
  PUSH_TOKEN: string | null
  AVATAR_URL: string | null
  // Added via migration
  IS_APPROVED?: boolean | null
  DRIVER_STATUS?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}

export interface Package {
  ID: string
  SENDER_ID: string | null
  DRIVER_ID: string | null
  RECIPIENT_ADDRESS: string | null
  RECIPIENT_NAME: string | null
  RECIPIENT_NUMBER: string | null
  PICKUP_ADDRESS: string | null
  STATUS: OrderStatus | null
  PRICE: number | null
  VEHICLE_TYPE: string | null
  PAYMENT_METHOD: string | null
  ITEM_TYPES: string | null
  NOTES: string | null
  CREATED_AT: string | null
  ACCEPTED_AT: string | null
  COMPLETED_AT: string | null
  PICKUP_CONFIRMED_AT: string | null
  PICKUP_LAT: number | null
  PICKUP_LNG: number | null
  DROPOFF_LAT: number | null
  DROPOFF_LNG: number | null
  TRACKING_TOKEN: string | null
  // Joined
  sender?: Profile | null
  driver?: Profile | null
}

export interface Vehicle {
  ID: string
  DRIVER_ID: string | null
  PLATE: string | null
  MODEL: string | null
  TYPE: string | null
  IS_ACTIVE: boolean
  // Added via migration
  IS_APPROVED?: boolean | null
  // Joined
  driver?: Profile | null
}

export interface PricingConfig {
  ID: string
  VEHICLE_TYPE: string
  BASE_FARE: number
  PER_KM_RATE: number
  UPDATED_AT: string | null
}

export interface DashboardStats {
  totalUsers: number
  totalDrivers: number
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  pendingDriverApprovals: number
  pendingVehicleApprovals: number
}
