// Central API service layer
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('yoyo_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

//  Auth 
export const authAPI = {
  register:       (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:          (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe:          () => request('/auth/me'),
  logout:         async () => {
    try { await request('/auth/logout', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('yoyo_token');
  },
  updateProfile:  (body) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/change-password', { method: 'PATCH', body: JSON.stringify(body) }),
};

//  Hotels 
export const hotelsAPI = {
  search:  (params) => { const qs = new URLSearchParams(params).toString(); return request(`/hotels?${qs}`); },
  getAll:  (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/hotels?${qs}`); },
  getById: (id) => request(`/hotels/${id}`),
  submit:  (body) => request('/hotels/submit', { method: 'POST', body: JSON.stringify(body) }),
  create:  (body) => request('/hotels', { method: 'POST', body: JSON.stringify(body) }),
  update:  (id, body) => request(`/hotels/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:  (id) => request(`/hotels/${id}`, { method: 'DELETE' }),
};

//  Room Types 
export const roomTypesAPI = {
  getAll:   (hotelId) => request(`/room-types?hotelId=${hotelId}`),
  getById:  (id) => request(`/room-types/${id}`),
  create:   (body) => request('/room-types', { method: 'POST', body: JSON.stringify(body) }),
  update:   (id, body) => request(`/room-types/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:   (id) => request(`/room-types/${id}`, { method: 'DELETE' }),
  addRoom:  (id, body) => request(`/room-types/${id}/rooms`, { method: 'POST', body: JSON.stringify(body) }),
  getRooms: (id) => request(`/room-types/${id}/rooms`),
};

//  Bookings 
export const bookingsAPI = {
  checkAvailability: (body) => request('/bookings/check', { method: 'POST', body: JSON.stringify(body) }),
  create:            (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  getMyBookings:     () => request('/bookings/my'),
  getById:           (id) => request(`/bookings/${id}`),
  cancel:            (id, body = {}) => request(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(body) }),
  applyCoupon:       (id, code) => request(`/bookings/${id}/apply-coupon`, { method: 'PATCH', body: JSON.stringify({ code }) }),
};

//  Payments 
export const paymentsAPI = {
  initiate:     (body) => request('/payments/initiate', { method: 'POST', body: JSON.stringify(body) }),
  confirm:      (paymentId) => request(`/payments/${paymentId}/confirm`, { method: 'POST' }),
  getByBooking: (bookingId) => request(`/payments/booking/${bookingId}`),
  refund:       (paymentId) => request(`/payments/${paymentId}/refund`, { method: 'POST' }),
};

//  Reviews 
export const reviewsAPI = {
  getAll:  (hotelId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/hotels/${hotelId}/reviews?${qs}`);
  },
  create:  (hotelId, body) => request(`/hotels/${hotelId}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
  delete:  (hotelId, reviewId) => request(`/hotels/${hotelId}/reviews/${reviewId}`, { method: 'DELETE' }),
};

//  Cities 
export const citiesAPI = {
  getAll:   (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/cities?${qs}`); },
  getStats: () => request('/cities/stats'),
};

//  Deals 
export const dealsAPI = {
  getAll:   () => request('/deals'),
  getById:  (id) => request(`/deals/${id}`),
  validate: (code) => request(`/deals/validate/${code}`),
  create:   (body) => request('/deals', { method: 'POST', body: JSON.stringify(body) }),
  update:   (id, body) => request(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:   (id) => request(`/deals/${id}`, { method: 'DELETE' }),
};

//  Newsletter 
export const newsletterAPI = {
  subscribe:      (email) => request('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email }) }),
  unsubscribe:    (email) => request('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ email }) }),
  getSubscribers: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/newsletter/subscribers?${qs}`); },
};

//  Admin 
export const adminAPI = {
  getAnalytics:        () => request('/admin/analytics'),
  getUsers:            (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/admin/users?${qs}`); },
  getUserById:         (id) => request(`/admin/users/${id}`),
  updateUser:          (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAllBookings:       (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/admin/bookings?${qs}`); },
  updateBookingStatus: (id, status) => request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getHotels:           (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/admin/hotels?${qs}`); },
  getPendingHotels:    () => request('/admin/hotels/pending'),
  createHotel:         (body) => request('/admin/hotels', { method: 'POST', body: JSON.stringify(body) }),
  approveHotel:        (id) => request(`/admin/hotels/${id}/approve`, { method: 'PATCH' }),
  rejectHotel:         (id, reason) => request(`/admin/hotels/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  getReviews:          (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/admin/reviews?${qs}`); },
  updateHotelRooms:    (hotelId, totalRooms) => request(`/admin/hotels/${hotelId}/rooms`, { method: 'PATCH', body: JSON.stringify({ totalRooms }) }),
};

//  Hotel Listing Submission 
export const listingAPI = {
  submit: (body) => request('/hotels/submit', { method: 'POST', body: JSON.stringify(body) }),
};
