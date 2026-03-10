const EventEmitter = require('events');

/**
 * NotificationService — Observer pattern via Node's EventEmitter.
 * Booking events are emitted here; listeners handle email/SMS/push notifications
 * asynchronously without blocking the main request flow.
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._registerListeners();
  }

  _registerListeners() {
    this.on('booking.confirmed', this._onBookingConfirmed.bind(this));
    this.on('booking.cancelled', this._onBookingCancelled.bind(this));
    this.on('booking.hold_expired', this._onHoldExpired.bind(this));
    this.on('payment.completed', this._onPaymentCompleted.bind(this));
  }

  async _onBookingConfirmed({ bookingId, guestEmail, referenceNumber }) {
    console.log(`📧 [Notification] Sending confirmation email to ${guestEmail} for booking ${referenceNumber}`);
    // TODO: integrate with Nodemailer / SendGrid
  }

  async _onBookingCancelled({ bookingId, guestEmail }) {
    console.log(`📧 [Notification] Sending cancellation email to ${guestEmail} for booking ${bookingId}`);
  }

  async _onHoldExpired({ bookingId }) {
    console.log(`⏰ [Notification] Hold expired for booking ${bookingId}`);
  }

  async _onPaymentCompleted({ bookingId, amount }) {
    console.log(`💳 [Notification] Payment of ${amount} completed for booking ${bookingId}`);
  }
}

// Singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;
