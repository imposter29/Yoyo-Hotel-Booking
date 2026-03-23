import { useState } from 'react';
import { bookingService } from '../services/bookingService';

export function useBookingFlow() {
  const [priceQuote, setPriceQuote] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkAvailability = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await bookingService.checkAvailability(params);
      setPriceQuote(data.data);
      return data;
    } catch (err) {
      setError(err.message || 'Availability check failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await bookingService.createBooking(params);
      setBooking(data.data.booking);
      return data.data;
    } catch (err) {
      setError(err.message || 'Booking creation failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id, reason) => {
    setLoading(true);
    try {
      await bookingService.cancelBooking(id, reason);
    } catch (err) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setLoading(false);
    }
  };

  return { priceQuote, booking, loading, error, checkAvailability, createBooking, cancelBooking };
}
