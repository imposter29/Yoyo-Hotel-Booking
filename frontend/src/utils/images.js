/**
 * Deterministic image picker — same ID always gets the same image.
 * Uses a simple hash of the ID string to pick consistently.
 */

const HOTEL_IMAGES = [
  '/images/hotel1.webp',
  '/images/hotel2.jpg',
  '/images/hotel3.webp',
];

const ROOM_IMAGES = [
  '/images/room1.jpg',
  '/images/room2.jpg',
];

function hashId(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getHotelImage(id) {
  return HOTEL_IMAGES[hashId(String(id)) % HOTEL_IMAGES.length];
}

export function getRoomImage(id) {
  return ROOM_IMAGES[hashId(String(id)) % ROOM_IMAGES.length];
}
