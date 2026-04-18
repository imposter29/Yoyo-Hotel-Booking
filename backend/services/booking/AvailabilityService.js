const InventoryCalendar = require('../../models/InventoryCalendar');
const Room = require('../../models/Room');

//  Utility 

/** Strip time → UTC midnight (safe across timezones) */
function toUTCMidnight(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Return array of UTC-midnight dates: [checkIn, checkIn+1, … checkOut-1] */
function getDateRange(checkIn, checkOut) {
  const dates = [];
  const current = toUTCMidnight(checkIn);
  const end     = toUTCMidnight(checkOut);
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Check if at least one room of the given type is available
 * across the entire date range.
 *
 * @returns {boolean}
 */
async function checkAvailability(roomTypeId, checkIn, checkOut) {
  const dates = getDateRange(checkIn, checkOut);
  if (dates.length === 0) return false;

  const inventoryDocs = await InventoryCalendar.find({
    roomType: roomTypeId,
    date: { $gte: dates[0], $lte: dates[dates.length - 1] },
  });

  if (inventoryDocs.length < dates.length) return false; // missing entries = no availability

  return inventoryDocs.every((doc) => doc.availableCount > 0);
}

/**
 * Atomically reserve a room for the given date range.
 * Decrements availableCount / increments heldCount per day in the inventory calendar.
 *
 * @returns {Room|null} the reserved Room document, or null if unavailable
 */
async function reserveRoom(roomTypeId, checkIn, checkOut) {
  const dates = getDateRange(checkIn, checkOut);
  if (dates.length === 0) return null;

  // Use a session for atomic multi-doc update
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find an available room of this type
    const room = await Room.findOne({
      roomType: roomTypeId,
      isActive: true,
      status: 'available',
    }).session(session);

    if (!room) {
      await session.abortTransaction();
      return null;
    }

    // Check all inventory days are available
    const inventoryDocs = await InventoryCalendar.find({
      roomType: roomTypeId,
      date: { $in: dates },
      availableCount: { $gt: 0 },
    }).session(session);

    if (inventoryDocs.length < dates.length) {
      await session.abortTransaction();
      return null;
    }

    // Decrement availableCount, increment heldCount for each day
    await InventoryCalendar.updateMany(
      { roomType: roomTypeId, date: { $in: dates } },
      { $inc: { availableCount: -1, heldCount: 1 } },
      { session }
    );

    await session.commitTransaction();
    return room;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Release inventory when a hold expires or a booking is cancelled.
 */
async function releaseInventory(roomTypeId, checkIn, checkOut, fromStatus = 'held') {
  const dates = getDateRange(checkIn, checkOut);
  const inc =
    fromStatus === 'held'
      ? { availableCount: 1, heldCount: -1 }
      : { availableCount: 1, bookedCount: -1 };

  await InventoryCalendar.updateMany(
    { roomType: roomTypeId, date: { $in: dates } },
    { $inc: inc }
  );
}

module.exports = { checkAvailability, reserveRoom, releaseInventory };
