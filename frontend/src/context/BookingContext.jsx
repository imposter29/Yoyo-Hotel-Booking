import { createContext, useContext, useReducer } from 'react';

const BookingContext = createContext(null);

const initialState = {
  searchParams: {
    city: '',
    checkIn: '',
    checkOut: '',
    guestCount: 1,
  },
  selectedHotel: null,
  selectedRoomType: null,
  currentBooking: null,
  priceQuote: null,
};

function bookingReducer(state, action) {
  switch (action.type) {
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: { ...state.searchParams, ...action.payload } };
    case 'SELECT_HOTEL':
      return { ...state, selectedHotel: action.payload };
    case 'SELECT_ROOM_TYPE':
      return { ...state, selectedRoomType: action.payload };
    case 'SET_PRICE_QUOTE':
      return { ...state, priceQuote: action.payload };
    case 'SET_CURRENT_BOOKING':
      return { ...state, currentBooking: action.payload };
    case 'RESET_BOOKING':
      return { ...state, selectedRoomType: null, currentBooking: null, priceQuote: null };
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setSearchParams = (params) => dispatch({ type: 'SET_SEARCH_PARAMS', payload: params });
  const selectHotel = (hotel) => dispatch({ type: 'SELECT_HOTEL', payload: hotel });
  const selectRoomType = (rt) => dispatch({ type: 'SELECT_ROOM_TYPE', payload: rt });
  const setPriceQuote = (quote) => dispatch({ type: 'SET_PRICE_QUOTE', payload: quote });
  const setCurrentBooking = (booking) => dispatch({ type: 'SET_CURRENT_BOOKING', payload: booking });
  const resetBooking = () => dispatch({ type: 'RESET_BOOKING' });

  return (
    <BookingContext.Provider
      value={{ ...state, setSearchParams, selectHotel, selectRoomType, setPriceQuote, setCurrentBooking, resetBooking }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
