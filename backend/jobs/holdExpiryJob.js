const cron = require('node-cron');
const Booking = require('../models/Booking');
const InventoryCalendar = require('../models/InventoryCalendar');

/**
 * Job: expire HOLDs every 5 minutes.
 * Finds all bookings in 'hold' status whose holdExpiresAt has passed,
 * transitions them to 'expired', and releases inventory.
 */
function startHoldExpiryJob() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    console.log(`🔄 [HoldExpiryJob] Running at ${now.toISOString()}`);

    const expiredHolds = await Booking.find({
      status: 'hold',
      holdExpiresAt: { $lte: now },
    });

    for (const booking of expiredHolds) {
      try {
        booking.transitionTo('expired');
        await booking.save();

        // Release inventory for each booking item
        for (const item of booking.items) {
          const dates = getDateRange(item.checkIn, item.checkOut);
          await InventoryCalendar.updateMany(
            { roomType: item.roomType, date: { $in: dates } },
            { $inc: { availableCount: 1, heldCount: -1 } }
          );
        }

        console.log(`✅ Expired booking ${booking._id}, inventory released.`);
      } catch (err) {
        console.error(`❌ Failed to expire booking ${booking._id}:`, err.message);
      }
    }
  });

  console.log('🕐 Hold expiry job scheduled (every 5 minutes).');
}

function getDateRange(checkIn, checkOut) {
  const dates = [];
  const current = new Date(checkIn);
  while (current < checkOut) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

module.exports = { startHoldExpiryJob };
