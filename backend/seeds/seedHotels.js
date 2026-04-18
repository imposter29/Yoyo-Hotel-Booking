/**
 * Hotel CSV Seeder
 *
 * Usage:
 *   node seeds/seedHotels.js                      → seed from seeds/data/hotels.csv
 *   node seeds/seedHotels.js --file my_data.csv   → seed from a specific file path
 *   node seeds/seedHotels.js --destroy            → wipe all hotels, roomTypes, rooms, inventory
 *
 * CSV FORMAT (one row per room type — hotel info repeated per room type):
 * See seeds/data/hotels.example.csv for the full column reference.
 *
 * Key columns:
 *   hotel_name, city, country, star_rating, description, ...
 *   room_type_name, base_rate, max_occupancy, room_count, ...
 *
 * Hotels with the same `hotel_name` + `city` are grouped into one Hotel document
 * with multiple RoomType children.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const InventoryCalendar = require('../models/InventoryCalendar');
const User = require('../models/User');

//  Resolve CSV file path 
const fileArgIdx = process.argv.indexOf('--file');
const csvPath = fileArgIdx !== -1
  ? path.resolve(process.argv[fileArgIdx + 1])
  : path.join(__dirname, 'data', 'hotels.csv');

//  Parse CSV → array of row objects 
function loadCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`  CSV file not found: ${filePath}`);
    console.error(`    Place your CSV at seeds/data/hotels.csv`);
    console.error(`    Or run: node seeds/seedHotels.js --file /path/to/your/file.csv`);
    console.error(`    See seeds/data/hotels.example.csv for the expected columns.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, {
    columns: true,           // first row = header
    skip_empty_lines: true,
    trim: true,
    cast: (value, context) => {
      // Auto-cast numbers and booleans
      if (value === '' || value === null) return '';
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      if (!isNaN(value) && value !== '') return Number(value);
      return value;
    },
  });
}

//  Group flat CSV rows into hotel → roomTypes structure 
function groupRows(rows) {
  const hotelMap = new Map();

  for (const row of rows) {
    const key = `${row.hotel_name}__${row.city}`.toLowerCase();

    if (!hotelMap.has(key)) {
      hotelMap.set(key, {
        // Hotel fields
        name: row.hotel_name,
        description: row.description || '',
        address: {
          street: row.street || '',
          city: row.city || '',
          state: row.state || '',
          country: row.country || 'India',
          postalCode: String(row.postal_code || ''),
        },
        starRating: Number(row.star_rating) || 3,
        contactEmail: row.contact_email || '',
        contactPhone: String(row.contact_phone || ''),
        amenities: row.hotel_amenities
          ? String(row.hotel_amenities).split('|').map((s) => s.trim()).filter(Boolean)
          : [],
        images: buildImages(row),
        policies: {
          checkInTime: row.check_in_time || '14:00',
          checkOutTime: row.check_out_time || '11:00',
          petFriendly: row.pet_friendly === true || row.pet_friendly === 'true',
          smokingAllowed: row.smoking_allowed === true || row.smoking_allowed === 'true',
        },
        location: row.longitude && row.latitude
          ? { type: 'Point', coordinates: [Number(row.longitude), Number(row.latitude)] }
          : undefined,
        roomTypes: [],
      });
    }

    // Attach room type if columns present
    if (row.room_type_name) {
      hotelMap.get(key).roomTypes.push({
        name: row.room_type_name,
        description: row.room_type_description || '',
        maxOccupancy: Number(row.max_occupancy) || 2,
        baseRatePerNight: Number(row.base_rate) || 999,
        currency: row.currency || 'INR',
        amenities: row.room_amenities
          ? String(row.room_amenities).split('|').map((s) => s.trim()).filter(Boolean)
          : [],
        bedConfiguration: row.bed_type
          ? [{ bedType: row.bed_type.toLowerCase(), count: Number(row.bed_count) || 1 }]
          : [],
        images: row.room_image_url
          ? [{ url: row.room_image_url, caption: row.room_type_name }]
          : [],
        cancellationPolicy: {
          freeCancellationHours: Number(row.free_cancellation_hours) || 24,
        },
        roomCount: Number(row.room_count) || 5,  // virtual — used for seeding
      });
    }
  }

  return Array.from(hotelMap.values());
}

// Build images array from image_url_1..5 columns or single image_url column
function buildImages(row) {
  const imgs = [];
  // Support up to 5 image columns: image_url_1, image_url_2, ...
  for (let i = 1; i <= 5; i++) {
    const url = row[`image_url_${i}`];
    if (url) imgs.push({ url, caption: row.hotel_name, isPrimary: i === 1 });
  }
  // Fallback: single image_url column
  if (imgs.length === 0 && row.image_url) {
    imgs.push({ url: row.image_url, caption: row.hotel_name, isPrimary: true });
  }
  return imgs;
}

//  Seed 90-day inventory for a room 
async function seedInventory(roomId, roomTypeId, days = 90) {
  const docs = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    docs.push({ room: roomId, roomType: roomTypeId, date, isAvailable: true });
  }
  await InventoryCalendar.insertMany(docs, { ordered: false }).catch(() => {});
}

//  Main seed 
async function seed() {
  await connectDB();
  console.log(`\n  Seeder starting…`);
  console.log(`    CSV: ${csvPath}\n`);

  const rows = loadCSV(csvPath);
  const hotels = groupRows(rows);
  console.log(`    Parsed ${rows.length} rows → ${hotels.length} unique hotels\n`);

  // Ensure a superadmin exists to own the hotels
  let admin = await User.findOne({ role: 'superadmin' });
  if (!admin) {
    console.log('   No superadmin found — creating seed admin user…');
    admin = await User.create({
      firstName: 'Seed',
      lastName: 'Admin',
      email: 'admin@yoyo.com',
      passwordHash: 'Admin@1234',
      role: 'superadmin',
    });
    console.log(`     Created admin: admin@yoyo.com / Admin@1234\n`);
  }

  let hotelsCreated = 0, skipped = 0, roomTypesCreated = 0, roomsCreated = 0;

  for (const hotelData of hotels) {
    const { roomTypes: roomTypesData, ...hotelFields } = hotelData;

    // Skip duplicates
    const existing = await Hotel.findOne({
      name: hotelFields.name,
      'address.city': hotelFields.address.city,
    });
    if (existing) {
      console.log(`⏭   Skipping "${hotelFields.name}" in ${hotelFields.address.city} (already exists)`);
      skipped++;
      continue;
    }

    const hotel = await Hotel.create({ ...hotelFields, managedBy: admin._id });
    hotelsCreated++;
    console.log(`  ${hotel.name} — ${hotel.address.city}, ${hotel.address.country}`);

    for (const rtData of (roomTypesData || [])) {
      const { roomCount = 5, ...rtFields } = rtData;

      const roomType = await RoomType.create({ ...rtFields, hotel: hotel._id });
      roomTypesCreated++;

      for (let i = 1; i <= roomCount; i++) {
        const room = await Room.create({
          hotel: hotel._id,
          roomType: roomType._id,
          roomNumber: `${roomType.name.charAt(0).toUpperCase()}${String(i).padStart(3, '0')}`,
          floor: Math.ceil(i / 5),
          status: 'available',
        });
        roomsCreated++;
        await seedInventory(room._id, roomType._id, 90);
      }

      console.log(`       ${roomType.name}: ${roomCount} rooms @ ₹${rtFields.baseRatePerNight}/night`);
    }
  }

  console.log('\n');
  console.log('  Seeding complete!');
  console.log(`    Hotels created:  ${hotelsCreated}`);
  console.log(`    Skipped:         ${skipped}`);
  console.log(`    Room types:      ${roomTypesCreated}`);
  console.log(`    Rooms:           ${roomsCreated}`);
  console.log(`    Inventory:       90 days per room`);
  console.log('\n');

  await mongoose.disconnect();
  process.exit(0);
}

//  Destroy 
async function destroy() {
  await connectDB();
  console.log('\n  Destroying all hotel data…');
  const [h, rt, r, ic] = await Promise.all([
    Hotel.deleteMany({}),
    RoomType.deleteMany({}),
    Room.deleteMany({}),
    InventoryCalendar.deleteMany({}),
  ]);
  console.log(`    Deleted: ${h.deletedCount} hotels, ${rt.deletedCount} room types, ${r.deletedCount} rooms, ${ic.deletedCount} inventory entries`);
  await mongoose.disconnect();
  process.exit(0);
}

//  Entry point 
if (process.argv.includes('--destroy')) {
  destroy().catch(console.error);
} else {
  seed().catch(console.error);
}
