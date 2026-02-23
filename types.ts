
export enum UserRole {
  OWNER = 'OWNER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED'
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  baseRate: number;
  distanceRate: number;
  isFavorite?: boolean;
}

export interface Delivery {
  id: string;
  date: string;
  restaurantId: string;
  ordersCount: number;
  distanceUnits: number;
  totalEuros: number;
  status: DeliveryStatus;
  riderId: string;
  riderName: string;
  notes?: string;
}

export interface AppState {
  role: UserRole;
  deliveries: Delivery[];
  restaurants: Restaurant[];
  currentRiderName: string;
}