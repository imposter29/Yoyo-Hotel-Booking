import api from './api';

export const hotelService = {
  getHotels: (params) => api.get('/hotels', { params }),
  getHotel: (id) => api.get(`/hotels/${id}`),
  createHotel: (data) => api.post('/hotels', data),
  updateHotel: (id, data) => api.patch(`/hotels/${id}`, data),
  deleteHotel: (id) => api.delete(`/hotels/${id}`),
};
