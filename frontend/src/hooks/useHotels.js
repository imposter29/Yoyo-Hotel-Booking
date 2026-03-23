import { useState, useCallback } from 'react';
import { hotelService } from '../services/hotelService';

export function useHotels() {
  const [hotels, setHotels] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHotels = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await hotelService.getHotels(params);
      setHotels(data.data.hotels);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message || 'Failed to fetch hotels');
    } finally {
      setLoading(false);
    }
  }, []);

  return { hotels, total, pages, loading, error, fetchHotels };
}
