export interface UserPharmacy {
  _id: string;
  name: string;
  address: string;
  phone: string;
  isOpen: boolean;
  isActive: boolean;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client' | 'pharmacist' | 'driver' | 'admin';
  isActive: boolean;
  isApproved: boolean;
  rejectionReason?: string;
  pharmacyId?: string | UserPharmacy;
  address?: string;
  location?: { type: string; coordinates: [number, number] };
  profilePicture?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface GeoLocation {
  type: string;
  coordinates: [number, number];
}

export interface OpeningHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface Pharmacy {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  location: GeoLocation;
  isOpen: boolean;
  openingHours?: OpeningHours;
  isActive: boolean;
  licenseNumber?: string;
  description?: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  ownerId?: string;
  hasDelivery: boolean;
  deliveryRadius: number;
  deliveryFee: number;
  distance?: number;
  isOnDuty: boolean;
  dutyStart?: string;
  dutyEnd?: string;
  is24_7: boolean;
  openAllDays: boolean;
  isHospitalPharmacy: boolean;
  hospitalName?: string;
  chronicSpecialties: string[];
  createdAt: string;
}

export interface Medication {
  _id: string;
  name: string;
  genericName?: string;
  description: string;
  price: number;
  stock: number;
  pharmacyId: string | Pharmacy;
  category: string;
  requiresPrescription: boolean;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  isAvailable: boolean;
  imageUrl?: string;
  expiryDate?: string;
  minStock: number;
  isHospitalOnly: boolean;
  chronicDiseaseCategory?: string;
  createdAt: string;
}

export interface CartItem {
  medicationId: string | Medication;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  requiresPrescription: boolean;
}

export interface Cart {
  _id: string;
  userId: string;
  pharmacyId?: string | Pharmacy;
  items: CartItem[];
}

export interface OrderItem {
  medicationId: string | Medication;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export type OrderStatus =
  | 'pending_prescription'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'
  | 'prescription_rejected';

export type PrescriptionStatus = 'not_required' | 'pending_review' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'mobile_money' | 'orange_money' | 'card' | 'cash';

export interface Order {
  _id: string;
  userId: string | User;
  pharmacyId: string | Pharmacy;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  deliveryLocation?: GeoLocation;
  prescriptionUrl?: string;
  prescriptionStatus?: PrescriptionStatus;
  prescriptionRejectionReason?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface Delivery {
  _id: string;
  orderId: string | Order;
  driverId?: string | User;
  pickupLocation: { address: string; coordinates: [number, number] };
  deliveryLocation: { address: string; coordinates: [number, number] };
  status: DeliveryStatus;
  currentLocation?: { coordinates: [number, number]; updatedAt: string };
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  notes?: string;
  fee: number;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'delivery' | 'payment' | 'stock' | 'system';
  isRead: boolean;
  data?: any;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  senderRole: 'client' | 'pharmacist' | 'driver';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  clientId: string | User;
  pharmacyId: string | Pharmacy;
  lastMessage: string;
  lastMessageAt: string;
  clientUnread: number;
  pharmacyUnread: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items?: T[];
  pharmacies?: T[];
  medications?: T[];
  orders?: T[];
  notifications?: T[];
  total: number;
  page: number;
  pages: number;
}

export const CHRONIC_DISEASE_CATEGORIES = [
  { value: 'diabete', label: 'Diabète', color: 'blue' },
  { value: 'vih', label: 'VIH / SIDA', color: 'red' },
  { value: 'tuberculose', label: 'Tuberculose', color: 'orange' },
  { value: 'hypertension', label: 'Hypertension', color: 'purple' },
  { value: 'cancer', label: 'Cancer', color: 'pink' },
  { value: 'epilepsie', label: 'Épilepsie', color: 'indigo' },
  { value: 'drepanocytose', label: 'Drépanocytose', color: 'yellow' },
  { value: 'insuffisance_renale', label: 'Insuffisance rénale', color: 'teal' },
  { value: 'hepatite', label: 'Hépatite', color: 'amber' },
  { value: 'autre_chronique', label: 'Autre maladie chronique', color: 'gray' },
] as const;

export type ChronicDiseaseCategory = typeof CHRONIC_DISEASE_CATEGORIES[number]['value'];

export const MEDICATION_CATEGORIES = [
  { value: 'antibiotiques', label: 'Antibiotiques' },
  { value: 'analgésiques', label: 'Analgésiques' },
  { value: 'vitamines', label: 'Vitamines' },
  { value: 'cardiovasculaire', label: 'Cardiovasculaire' },
  { value: 'diabète', label: 'Diabète' },
  { value: 'respiratoire', label: 'Respiratoire' },
  { value: 'dermatologie', label: 'Dermatologie' },
  { value: 'gastroentérologie', label: 'Gastroentérologie' },
  { value: 'neurologie', label: 'Neurologie' },
  { value: 'autre', label: 'Autre' },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_prescription: 'Ordonnance en attente',
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  prescription_rejected: 'Ordonnance rejetée',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_prescription: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-purple-100 text-purple-800',
  in_delivery: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  prescription_rejected: 'bg-red-100 text-red-800',
};
