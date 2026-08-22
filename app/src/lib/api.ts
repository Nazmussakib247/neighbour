/**
 * API client for the Neighbour PHP backend.
 *
 * Every fetcher returns null (or []) on failure so pages can gracefully
 * fall back to the bundled demo data when the backend isn't running.
 */
import type { Service, Provider, Review, Category } from '@/data/marketplaceData';

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost/neighbour/api';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'client' | 'professional' | 'admin';
  avatar?: string | null;
  location?: string | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  user?: User;
  message?: string;
  id?: number | string;
  distribution?: { stars: number; percent: number }[];
  total?: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include', // send/receive the PHP session cookie
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return body;
}

/* ---------------- Row shapes returned by the PHP API ---------------- */

interface ServiceRow {
  id: number | string;
  title: string;
  description: string;
  price: number | string;
  price_unit: string;
  image: string | null;
  is_featured: number | boolean;
  category_name: string;
  professional_id: number | string;
  professional_name: string;
  avatar: string | null;
  location: string | null;
  rating: number | string;
  review_count: number | string;
  is_top_pro: number | boolean;
}

interface ProfessionalRow {
  id: number | string;
  user_id: number | string;
  title: string;
  bio: string | null;
  years_experience: number | string;
  credentials: string | null;
  is_top_pro: number | boolean;
  rating: number | string;
  review_count: number | string;
  full_name: string;
  avatar: string | null;
  location: string | null;
  tags?: string | null;
  min_price?: number | string | null;
  min_price_unit?: string | null;
  services?: {
    id: number | string;
    title: string;
    description: string;
    price: number | string;
    price_unit: string;
  }[];
}

interface ReviewRow {
  id: number | string;
  rating: number | string;
  comment: string | null;
  service_tag: string | null;
  created_at: string;
  author: string;
}

interface CategoryRow {
  id: number | string;
  name: string;
  slug: string;
  icon: string;
  service_count: number | string;
}

/* ---------------- Mappers (snake_case DB -> camelCase UI) ---------------- */

const FALLBACK_IMAGES: Record<string, string> = {
  'Home Cleaning': '/images/service-cleaning.jpg',
  Plumbing: '/images/service-plumbing.jpg',
  Photography: '/images/service-photography.jpg',
  Handyman: '/images/service-assembly.jpg',
  Fitness: '/images/service-yoga.jpg',
};

function mapService(row: ServiceRow): Service {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category_name,
    price: Number(row.price),
    priceUnit: row.price_unit,
    image: row.image || FALLBACK_IMAGES[row.category_name] || '/images/step-1-find.jpg',
    provider: {
      id: Number(row.professional_id),
      name: row.professional_name,
      avatar: row.avatar || '/images/hero-professional.jpg',
      title: '',
      verified: true,
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      yearsExp: 0,
      location: row.location ?? '',
      bio: '',
      services: [],
      credentials: [],
      tags: [],
      topPro: Boolean(Number(row.is_top_pro)),
      heroImage: row.image || '/images/hero-professional.jpg',
    },
    location: row.location ?? '',
    distance: '',
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    description: row.description ?? '',
    featured: Boolean(Number(row.is_featured)),
  };
}

function mapProfessional(row: ProfessionalRow): Provider {
  return {
    id: Number(row.id),
    userId: row.user_id != null ? Number(row.user_id) : undefined,
    name: row.full_name,
    avatar: row.avatar || '/images/hero-professional.jpg',
    title: row.title,
    verified: true,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    yearsExp: Number(row.years_experience),
    location: row.location ?? '',
    bio: row.bio ?? '',
    services: (row.services && row.services.length
      ? row.services.map((s) => ({
          id: Number(s.id),
          name: s.title,
          price: Number(s.price),
          priceUnit: s.price_unit,
          description: s.description ?? '',
        }))
      : row.min_price != null
        // Directory rows carry only a starting price, not the full service list.
        ? [{ name: '', price: Number(row.min_price), priceUnit: row.min_price_unit || 'hr', description: '' }]
        : []),
    credentials: row.credentials ? row.credentials.split(',').map((c) => c.trim()) : [],
    tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
    topPro: Boolean(Number(row.is_top_pro)),
    heroImage: row.avatar || '/images/hero-professional.jpg',
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: Number(row.id),
    author: row.author,
    avatar: row.author
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    date: new Date(row.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    rating: Number(row.rating),
    text: row.comment ?? '',
    serviceTag: row.service_tag ?? '',
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.slug,
    name: row.name,
    icon: row.icon,
    count: Number(row.service_count),
  };
}

/* ---------------- Public fetchers (null/[] on failure) ---------------- */

export async function fetchServices(params?: { category?: string; featured?: boolean }): Promise<Service[] | null> {
  try {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.featured) qs.set('featured', '1');
    qs.set('limit', '50');
    const res = await request<ServiceRow[]>(`/services.php?${qs}`);
    return (res.data ?? []).map(mapService);
  } catch {
    return null;
  }
}

export async function fetchProfessional(id: number): Promise<Provider | null> {
  try {
    const res = await request<ProfessionalRow>(`/professionals.php?id=${id}`);
    return res.data ? mapProfessional(res.data) : null;
  } catch {
    return null;
  }
}

export async function fetchProfessionals(): Promise<Provider[] | null> {
  try {
    const res = await request<ProfessionalRow[]>('/professionals.php?limit=50');
    return (res.data ?? []).map(mapProfessional);
  } catch {
    return null;
  }
}

/* ---------------- Favorites (logged-in users) ---------------- */

export async function fetchFavorites(): Promise<number[] | null> {
  try {
    const res = await request<number[]>('/favorites.php');
    return (res.data ?? []).map(Number);
  } catch {
    return null;
  }
}

export async function fetchFavoriteProviders(): Promise<Provider[] | null> {
  try {
    const res = await request<ProfessionalRow[]>('/favorites.php?detailed=1');
    return (res.data ?? []).map(mapProfessional);
  } catch {
    return null;
  }
}

/* ---------------- Messaging (logged-in users) ---------------- */

export interface Conversation {
  userId: number;
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface ChatThread {
  user: { id: number; full_name: string; avatar: string | null; role: string };
  messages: ChatMessage[];
}

interface ConversationRow {
  user_id: number | string;
  full_name: string;
  avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number | string;
}

interface ChatMessageRow {
  id: number | string;
  sender_id: number | string;
  content: string;
  is_read: number | boolean;
  created_at: string;
}

export async function fetchConversations(): Promise<Conversation[] | null> {
  try {
    const res = await request<ConversationRow[]>('/messages.php');
    return (res.data ?? []).map((c) => ({
      userId: Number(c.user_id),
      name: c.full_name,
      avatar: c.avatar,
      lastMessage: c.last_message,
      lastAt: c.last_at,
      unread: Number(c.unread),
    }));
  } catch {
    return null;
  }
}

export async function fetchThread(userId: number): Promise<ChatThread | null> {
  try {
    const res = await request<{ user: ChatThread['user']; messages: ChatMessageRow[] }>(
      `/messages.php?with=${userId}`
    );
    if (!res.data) return null;
    return {
      user: res.data.user,
      messages: (res.data.messages ?? []).map((m) => ({
        id: Number(m.id),
        senderId: Number(m.sender_id),
        content: m.content,
        createdAt: m.created_at,
        isRead: Boolean(Number(m.is_read)),
      })),
    };
  } catch {
    return null;
  }
}

export async function sendMessage(receiverId: number, content: string): Promise<void> {
  await request<never>('/messages.php', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId, content }),
  });
}

export async function addFavorite(professionalId: number): Promise<void> {
  await request<never>('/favorites.php', {
    method: 'POST',
    body: JSON.stringify({ professional_id: professionalId }),
  });
}

export async function removeFavorite(professionalId: number): Promise<void> {
  await request<never>(`/favorites.php?professional_id=${professionalId}`, { method: 'DELETE' });
}

export async function fetchCategories(): Promise<Category[] | null> {
  try {
    const res = await request<CategoryRow[]>('/categories.php');
    return (res.data ?? []).map(mapCategory);
  } catch {
    return null;
  }
}

export interface ReviewsResult {
  reviews: Review[];
  distribution: { stars: number; percent: number }[];
  total: number;
}

export async function fetchReviews(professionalId: number): Promise<ReviewsResult | null> {
  try {
    const res = await request<ReviewRow[]>(`/reviews.php?professional_id=${professionalId}`);
    return {
      reviews: (res.data ?? []).map(mapReview),
      distribution: res.distribution ?? [],
      total: res.total ?? 0,
    };
  } catch {
    return null;
  }
}

export interface StatTrend {
  pct: number;
  up: boolean;
}

export interface SalesByService {
  service: string;
  category: string;
  bookings: number;
  gross: number;
  commission: number;
}

export interface SalesByCategory {
  name: string;
  bookings: number;
  gross: number;
  commission: number;
}

export interface AdminStats {
  totalUsers: number;
  activeServices: number;
  avgRating: number;
  pendingProviders?: number;
  grossSales?: number;
  revenue: number; // platform commission (15% of gross)
  commissionRate?: number;
  trends?: {
    users: StatTrend;
    services: StatTrend;
    sales: StatTrend;
    revenue: StatTrend;
  };
  salesByService?: SalesByService[];
  salesByCategory?: SalesByCategory[];
  userGrowth: number[];
  revenueData: number[];
  revenueWeek?: number[];
  revenueWeekLabels?: string[];
  revenueYear?: number[];
  revenueYearLabels?: string[];
  categoryDistribution: { name: string; value: number }[];
  recentBookings: {
    id: number;
    customer: string;
    service: string;
    professional: string;
    date: string;
    amount: number;
    status: string;
  }[];
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  try {
    const res = await request<AdminStats>('/stats.php');
    return res.data ?? null;
  } catch {
    return null;
  }
}

/* ---------------- Admin: bookings ---------------- */

interface AdminBookingRow {
  id: number | string;
  service_title: string;
  client_name: string;
  professional_name: string;
  booking_date: string;
  total_amount: number | string;
  status: string;
  payment_status: string;
}

export interface AdminBooking {
  id: number;
  customer: string;
  service: string;
  professional: string;
  date: string;
  amount: number;
  status: string; // raw backend status, e.g. 'in_progress'
  paymentStatus: string;
}

export async function fetchAdminBookings(limit = 50): Promise<AdminBooking[] | null> {
  try {
    const res = await request<AdminBookingRow[]>(`/bookings.php?limit=${limit}`);
    return (res.data ?? []).map((b) => ({
      id: Number(b.id),
      customer: b.client_name,
      service: b.service_title,
      professional: b.professional_name,
      date: String(b.booking_date),
      amount: Number(b.total_amount),
      status: b.status,
      paymentStatus: b.payment_status,
    }));
  } catch {
    return null;
  }
}

export async function updateBooking(
  id: number,
  changes: { status?: string; payment_status?: string }
): Promise<void> {
  const qs = new URLSearchParams({ id: String(id) });
  if (changes.status) qs.set('status', changes.status);
  if (changes.payment_status) qs.set('payment_status', changes.payment_status);
  await request<never>(`/bookings.php?${qs}`, { method: 'PUT' });
}

/* ---------------- Admin: services ---------------- */

export async function createService(payload: {
  professional_id?: number; // required for admin; ignored for professionals (own profile is used)
  category_id: number;
  title: string;
  description?: string;
  price: number;
  price_unit?: string;
  image?: string;
  is_featured?: boolean;
}): Promise<{ id: number }> {
  const res = await request<never>('/services.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { id: Number(res.id) };
}

/* ---------------- Admin: lookup lists for forms ---------------- */

export interface CategoryOption {
  id: number;
  name: string;
}

export async function fetchCategoryOptions(): Promise<CategoryOption[] | null> {
  try {
    const res = await request<(CategoryRow & { id: number | string })[]>('/categories.php');
    return (res.data ?? []).map((c) => ({ id: Number(c.id), name: c.name }));
  } catch {
    return null;
  }
}

export interface ProfessionalOption {
  id: number;
  name: string;
  title: string;
}

export async function fetchProfessionalOptions(): Promise<ProfessionalOption[] | null> {
  try {
    const res = await request<ProfessionalRow[]>('/professionals.php');
    return (res.data ?? []).map((p) => ({
      id: Number(p.id),
      name: p.full_name,
      title: p.title,
    }));
  } catch {
    return null;
  }
}

/* ---------------- Professional: own services ---------------- */

export interface MyService {
  id: number;
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  categoryName: string;
  isFeatured: boolean;
}

interface MyServiceRow {
  id: number | string;
  title: string;
  description: string | null;
  price: number | string;
  price_unit: string;
  category_name: string;
  is_featured: number | boolean;
}

export async function fetchMyServices(): Promise<MyService[] | null> {
  try {
    const res = await request<MyServiceRow[]>('/services.php?mine=1');
    return (res.data ?? []).map((s) => ({
      id: Number(s.id),
      title: s.title,
      description: s.description ?? '',
      price: Number(s.price),
      priceUnit: s.price_unit,
      categoryName: s.category_name,
      isFeatured: Boolean(Number(s.is_featured)),
    }));
  } catch {
    return null;
  }
}

export async function updateService(
  id: number,
  payload: {
    title?: string;
    description?: string;
    price?: number;
    price_unit?: string;
    image?: string;
    is_featured?: boolean;
  }
): Promise<void> {
  await request<never>(`/services.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: number): Promise<void> {
  await request<never>(`/services.php?id=${id}`, { method: 'DELETE' });
}

/* ---------------- Professional: own bookings ---------------- */

interface ProBookingRow {
  id: number | string;
  service_title: string;
  client_name: string;
  category_name: string;
  booking_date: string;
  booking_time: string;
  notes: string | null;
  total_amount: number | string;
  status: string;
  payment_status: string;
}

export interface ProBooking {
  id: number;
  service: string;
  client: string;
  category: string;
  date: string;
  time: string;
  notes: string;
  amount: number;
  status: string; // raw backend status, e.g. 'in_progress'
  paymentStatus: string;
}

export async function fetchMyBookings(): Promise<ProBooking[] | null> {
  try {
    const res = await request<ProBookingRow[]>('/bookings.php');
    return (res.data ?? []).map((b) => ({
      id: Number(b.id),
      service: b.service_title,
      client: b.client_name,
      category: b.category_name,
      date: String(b.booking_date),
      time: String(b.booking_time ?? '').slice(0, 5),
      notes: b.notes ?? '',
      amount: Number(b.total_amount),
      status: b.status,
      paymentStatus: b.payment_status,
    }));
  } catch {
    return null;
  }
}

/* ---------------- Client: own bookings & reviews ---------------- */

interface ClientBookingRow {
  id: number | string;
  service_title: string;
  professional_name: string;
  professional_id: number | string;
  category_name: string;
  booking_date: string;
  booking_time: string;
  notes: string | null;
  total_amount: number | string;
  status: string;
  payment_status: string;
  review_id: number | string | null;
}

export interface ClientBooking {
  id: number;
  service: string;
  professional: string;
  professionalId: number;
  category: string;
  date: string;
  time: string;
  notes: string;
  amount: number;
  status: string; // raw backend status, e.g. 'in_progress'
  paymentStatus: string;
  reviewed: boolean;
}

export async function fetchClientBookings(): Promise<ClientBooking[] | null> {
  try {
    const res = await request<ClientBookingRow[]>('/bookings.php');
    return (res.data ?? []).map((b) => ({
      id: Number(b.id),
      service: b.service_title,
      professional: b.professional_name,
      professionalId: Number(b.professional_id),
      category: b.category_name,
      date: String(b.booking_date),
      time: String(b.booking_time ?? '').slice(0, 5),
      notes: b.notes ?? '',
      amount: Number(b.total_amount),
      status: b.status,
      paymentStatus: b.payment_status,
      reviewed: b.review_id != null,
    }));
  } catch {
    return null;
  }
}

export interface SlotInfo {
  available: boolean;
  start: string | null; // "09:00"
  end: string | null;   // "17:00"
  booked: string[];     // ["10:00", "15:00"]
}

export async function fetchBookingSlots(professionalId: number, date: string): Promise<SlotInfo | null> {
  try {
    const res = await request<SlotInfo>(`/bookings.php?slots=1&professional_id=${professionalId}&date=${date}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function createReview(payload: {
  booking_id: number;
  rating: number;
  comment?: string;
  service_tag?: string;
}): Promise<{ id: number }> {
  const res = await request<never>('/reviews.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { id: Number(res.id) };
}

/* ---------------- Image upload (any logged-in user) ---------------- */

export async function uploadImage(file: File, purpose: 'avatar' | 'service'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('purpose', purpose);
  const res = await fetch(`${API_URL}/upload.php`, {
    method: 'POST',
    credentials: 'include',
    body: form, // browser sets the multipart Content-Type itself
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new ApiError(body.error ?? `Upload failed (${res.status})`, res.status);
  }
  return body.url;
}

/* ---------------- Notifications (any logged-in user) ---------------- */

export interface Notification {
  id: number;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsPayload {
  items: {
    id: number | string;
    message: string;
    link: string | null;
    is_read: number | boolean;
    created_at: string;
  }[];
  unread: number;
}

export async function fetchNotifications(): Promise<{ items: Notification[]; unread: number } | null> {
  try {
    const res = await request<NotificationsPayload>('/notifications.php');
    if (!res.data) return null;
    return {
      items: res.data.items.map((n) => ({
        id: Number(n.id),
        message: n.message,
        link: n.link,
        read: Boolean(Number(n.is_read)),
        createdAt: n.created_at,
      })),
      unread: Number(res.data.unread),
    };
  } catch {
    return null;
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await request<never>('/notifications.php?all=1', { method: 'PUT' });
  } catch {
    // non-critical
  }
}

/* ---------------- Account (any logged-in user) ---------------- */

export async function updateAccount(payload: {
  full_name?: string;
  phone?: string;
  location?: string;
  current_password?: string;
  new_password?: string;
}): Promise<User> {
  const res = await request<never>('/auth.php?action=update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.user) throw new ApiError('Update failed', 500);
  return res.user;
}

/* ---------------- Professional: own profile ---------------- */

export interface MyProfile {
  full_name: string;
  title: string;
  bio: string;
  years_experience: number;
  location: string;
  phone: string;
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  try {
    const res = await request<ProfessionalRow & { phone?: string | null }>('/professionals.php?me=1');
    if (!res.data) return null;
    return {
      full_name: res.data.full_name,
      title: res.data.title ?? '',
      bio: res.data.bio ?? '',
      years_experience: Number(res.data.years_experience) || 0,
      location: res.data.location ?? '',
      phone: res.data.phone ?? '',
    };
  } catch {
    return null;
  }
}

export async function updateMyProfile(payload: {
  title?: string;
  bio?: string;
  years_experience?: number;
  location?: string;
  phone?: string;
  full_name?: string;
}): Promise<void> {
  await request<never>('/professionals.php', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* ---------------- Professional: weekly availability ---------------- */

export interface AvailabilityDay {
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  is_available: boolean;
}

interface AvailabilityRow {
  day_of_week: number | string;
  start_time: string;
  end_time: string;
  is_available: number | boolean;
}

export async function fetchMyAvailability(): Promise<AvailabilityDay[] | null> {
  try {
    const res = await request<AvailabilityRow[]>('/availability.php');
    return (res.data ?? []).map((r) => ({
      day_of_week: Number(r.day_of_week),
      start_time: String(r.start_time).slice(0, 5),
      end_time: String(r.end_time).slice(0, 5),
      is_available: Boolean(Number(r.is_available)),
    }));
  } catch {
    return null;
  }
}

export async function updateMyAvailability(days: AvailabilityDay[]): Promise<void> {
  await request<never>('/availability.php', {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

/* ---------------- Admin: users ---------------- */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  idCardNumber: string;
  role: string;
  location: string;
  active: boolean;
  approvalStatus: ApprovalStatus;
  proTitle: string | null;
  createdAt: string;
}

interface AdminUserRow {
  id: number | string;
  full_name: string;
  email: string;
  phone: string | null;
  id_card_number: string | null;
  role: string;
  location: string | null;
  is_active: number | boolean;
  approval_status: ApprovalStatus | null;
  pro_title: string | null;
  created_at: string;
}

export async function fetchUsers(): Promise<AdminUser[] | null> {
  try {
    const res = await request<AdminUserRow[]>('/users.php?limit=100');
    return (res.data ?? []).map((u) => ({
      id: Number(u.id),
      name: u.full_name,
      email: u.email,
      phone: u.phone ?? '',
      idCardNumber: u.id_card_number ?? '',
      role: u.role,
      location: u.location ?? '',
      active: Boolean(Number(u.is_active)),
      approvalStatus: (u.approval_status ?? 'approved') as ApprovalStatus,
      proTitle: u.pro_title,
      createdAt: String(u.created_at).slice(0, 10),
    }));
  } catch {
    return null;
  }
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  await request<never>(`/users.php?id=${id}&active=${active ? 1 : 0}`, { method: 'PUT' });
}

export async function setUserApproval(id: number, status: ApprovalStatus): Promise<void> {
  await request<never>(`/users.php?id=${id}&approval=${status}`, { method: 'PUT' });
}

export async function adminCreateUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: 'client' | 'professional';
  phone?: string;
  location?: string;
  title?: string;
  bio?: string;
  years_experience?: number;
  id_card_number?: string;
}): Promise<{ id: number }> {
  const res = await request<never>('/users.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { id: Number(res.id) };
}

/* ---------------- Mutations (throw ApiError on failure) ---------------- */

export async function createBooking(payload: {
  service_id: number;
  professional_id: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
  notes?: string;
  total_amount?: number;
}): Promise<{ id: number }> {
  const res = await request<never>('/bookings.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { id: Number(res.id) };
}

/* ---------------- Auth ---------------- */

export async function apiLogin(email: string, password: string): Promise<User> {
  const res = await request<never>('/auth.php?action=login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.user) throw new ApiError('Login failed', 500);
  return res.user;
}

export interface RegisterResult {
  user: User | null;
  pending: boolean; // true for providers awaiting admin approval (not logged in)
  message: string;
}

export async function apiRegister(payload: {
  full_name: string;
  email: string;
  password: string;
  role?: 'client' | 'professional';
  phone?: string;
  location?: string;
  title?: string;
  bio?: string;
  id_card_number?: string;
}): Promise<RegisterResult> {
  const res = await request<never>('/auth.php?action=register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const pending = Boolean((res as { pending?: boolean }).pending);
  if (!res.user && !pending) throw new ApiError('Registration failed', 500);
  return { user: res.user ?? null, pending, message: res.message ?? '' };
}

export async function apiForgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
  const res = await request<never>('/auth.php?action=forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return {
    message: res.message ?? 'Reset code generated.',
    devToken: (res as { dev_token?: string }).dev_token,
  };
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  await request<never>('/auth.php?action=reset', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function apiLogout(): Promise<void> {
  try {
    await request('/auth.php?action=logout', { method: 'POST' });
  } catch {
    // ignore — clearing local state is enough
  }
}

export async function apiVerify(): Promise<User | null> {
  try {
    const res = await request<never>('/auth.php?action=verify');
    return res.user ?? null;
  } catch {
    return null;
  }
}
