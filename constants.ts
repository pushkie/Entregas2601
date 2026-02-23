
import { Restaurant, UserRole } from './types';

const defaultNames = [
  'Tradicional', 'Sicilia', 'Jacks', 'Chirasi', 'Ginza', 'Emporio', 
  'Nonna', 'Moureira', 'Mellizos', 'Stenbol', 'Saporita', 'Chifán', 
  'Gennaro', 'Oishi', 'Tasty', 'Lembranzas', 'Tajmahal', 'Milanesas'
];

export const INITIAL_RESTAURANTS: Restaurant[] = defaultNames.map((name, index) => ({
  id: String(index + 1),
  name,
  baseRate: 3.5,
  distanceRate: 1.5,
  isFavorite: false
})).sort((a, b) => a.name.localeCompare(b.name));

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Propietario',
  [UserRole.RIDER]: 'Repartidor',
  [UserRole.ADMIN]: 'Administrador',
};

export const STORAGE_KEYS = {
  DELIVERIES: 'delivery_app_deliveries',
  RESTAURANTS: 'delivery_app_restaurants',
  ROLE: 'delivery_app_role',
  RIDER_NAME: 'delivery_app_rider_name',
  LAST_BACKUP_DATE: 'delivery_app_last_backup_date', // Nueva clave
};
