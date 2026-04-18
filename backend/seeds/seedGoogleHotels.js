/**
 * Google Hotel Data Seeder
 *
 * Reads: /Users/rithwikkuchana/Desktop/Projects/Yoyo-Hotel-Booking/Google Hotel Data Clean v2.csv
 *
 * CSV columns:
 *   Hotel_Name, Hotel_Rating, City, Feature_1..9, Hotel_Price
 *
 * Strategy:
 *  - One Hotel doc per unique (Hotel_Name + City)
 *  - Skip duplicate names in same city
 *  - Derive star_rating from Feature columns (looks for "X-star hotel")
 *  - Collect all features as amenities (mapped to our schema values)
 *  - Create one "Standard Room" RoomType per hotel using Hotel_Price as the base rate
 *  - Generate 5 physical Room docs + 90 days inventory per room
 *
 * Usage:
 *   node seeds/seedGoogleHotels.js               → seeds from default path
 *   node seeds/seedGoogleHotels.js --destroy      → wipes all hotel data
 *   node seeds/seedGoogleHotels.js --limit 50     → seeds only the first 50 unique hotels
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

//  Config 
const CSV_PATH = path.join(
  __dirname,
  '../../Google Hotel Data Clean v2.csv'
);

const CITY_COORDS = {
  kochi:       [76.2673, 9.9312],
  trivandrum:  [76.9366, 8.5241],
  kumarakom:   [76.4316, 9.6158],
  pune:        [73.8567, 18.5204],
  chennai:     [80.2707, 13.0827],
  delhi:       [77.1025, 28.7041],
  bhubaneswar: [85.8245, 20.2961],
  goa:         [74.1240, 15.2993],
  mumbai:      [72.8777, 19.0760],
  lucknow:     [80.9462, 26.8467],
  kolkata:     [88.3639, 22.5726],
  bangalore:   [77.5946, 12.9716],
  hyderabad:   [78.4867, 17.3850],
  pondicherry: [79.8083, 11.9416],
  patna:       [85.1376, 25.5941],
  nagpur:      [79.0882, 21.1458],
  indore:      [75.8577, 22.7196],
  jaipur:      [75.7873, 26.9124],
  nashik:      [73.7898, 19.9975],
  kanpur:      [80.3319, 26.4499],
  chandigarh:  [76.7794, 30.7333],
  guwahati:    [91.7362, 26.1445],
  mangalore:   [74.8560, 12.9141],
  mysore:      [76.6394, 12.2958],
  dehradun:    [78.0322, 30.3165],
  srinagar:    [74.7973, 34.0837],
  jamshedpur:  [86.2029, 22.8046],
  gwalior:     [78.1828, 26.2183],
  amravati:    [77.7523, 20.9320],
  durgapur:    [87.3195, 23.5204],
  ranchi:      [85.3094, 23.3441],
  aurangabad:  [75.3433, 19.8762],
  ahmedabad:   [72.5714, 23.0225],
  amritsar:    [74.8728, 31.6340],
  ludhiana:    [75.8573, 30.9010],
  meerut:      [77.7064, 28.9845],
  vadodara:    [73.2090, 22.3072],
};

// Map feature strings → our amenity schema values
const FEATURE_TO_AMENITY = {
  'wi-fi': 'wifi', 'free wi-fi': 'wifi', 'wi fi': 'wifi',
  'pool': 'pool', 'hot tub': 'pool',
  'gym': 'gym', 'fitness center': 'gym',
  'parking': 'parking', 'free parking': 'parking', 'paid parking': 'parking',
  'spa': 'spa',
  'restaurant': 'restaurant',
  'bar': 'bar',
  'air conditioning': 'ac',
  'breakfast': 'breakfast', 'free breakfast': 'breakfast',
  'airport shuttle': 'concierge',
  'room service': 'restaurant',
  'beach access': 'pool',
  'pet-friendly': 'spa',
  'elevator': 'elevator',
  'laundry': 'laundry', 'full-service laundry': 'laundry',
};

function mapFeatureToAmenity(feature) {
  if (!feature || feature === '0') return null;
  const normalized = feature.toLowerCase().trim();
  return FEATURE_TO_AMENITY[normalized] || null;
}

// Extract star rating from feature columns like "5-star hotel", "4-star hotel"
function extractStarRating(features) {
  for (const f of features) {
    const m = String(f).match(/^(\d)-star hotel/i);
    if (m) return Number(m[1]);
  }
  return 3; // default
}

// Capitalise city name properly
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Seed 90-day inventory for one room type (not per-room)
async function seedInventory(hotelId, roomTypeId, totalRooms = 5, days = 90) {
  const docs = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    docs.push({
      hotel:          hotelId,
      roomType:       roomTypeId,
      date,
      totalRooms,
      availableCount: totalRooms,
      heldCount:      0,
      bookedCount:    0,
      demandIndex:    0,
    });
  }
  await InventoryCalendar.insertMany(docs, { ordered: false }).catch((err) => {
    // Ignore duplicate key errors (re-seed), throw everything else
    if (!err.message?.includes('duplicate key')) console.error('Inventory insert error:', err.message);
  });
}

//  Main seed 
async function seed() {
  await connectDB();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`  CSV not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  // Deduplicate rows by (Hotel_Name + City) — keep the highest-price entry
  const hotelMap = new Map();
  for (const row of rows) {
    const name = row['Hotel_Name']?.trim();
    const city = row['City']?.trim()?.toLowerCase();
    if (!name || name === '-' || !city) continue;

    const key = `${name.toLowerCase()}__${city}`;
    const price = parseFloat(row['Hotel_Price']) || 0;
    const existing = hotelMap.get(key);

    // Keep the row with the highest price (most complete data)
    if (!existing || price > (parseFloat(existing['Hotel_Price']) || 0)) {
      hotelMap.set(key, row);
    }
  }

  // Apply --limit flag
  const limitArg = process.argv.indexOf('--limit');
  let hotelEntries = Array.from(hotelMap.values());
  if (limitArg !== -1) {
    const n = parseInt(process.argv[limitArg + 1], 10);
    if (!isNaN(n)) hotelEntries = hotelEntries.slice(0, n);
  }

  console.log(`\n  Google Hotel Seeder`);
  console.log(`    CSV: ${CSV_PATH}`);
  console.log(`    Total raw rows:     ${rows.length}`);
  console.log(`    Unique hotels:      ${hotelMap.size}`);
  console.log(`    Seeding:            ${hotelEntries.length} hotels\n`);

  // Ensure a superadmin exists
  let admin = await User.findOne({ role: 'superadmin' });
  if (!admin) {
    admin = await User.create({
      firstName: 'Seed', lastName: 'Admin',
      email: 'admin@yoyo.com',
      passwordHash: 'Admin@1234',
      role: 'superadmin',
    });
    console.log(`   Created admin: admin@yoyo.com / Admin@1234\n`);
  }

  let created = 0, skipped = 0, errors = 0;

  for (const row of hotelEntries) {
    const name  = row['Hotel_Name']?.trim();
    const city  = capitalise(row['City']?.trim() || '');
    const price = parseFloat(row['Hotel_Price']) || 999;
    const rating = parseFloat(row['Hotel_Rating']) || 3.5;

    const features = [
      row['Feature_1'], row['Feature_2'], row['Feature_3'],
      row['Feature_4'], row['Feature_5'], row['Feature_6'],
      row['Feature_7'], row['Feature_8'], row['Feature_9'],
    ].filter((f) => f && f !== '0');

    const starRating = extractStarRating(features);

    // Map features → amenities (deduplicated)
    const amenities = [...new Set(
      features
        .map(mapFeatureToAmenity)
        .filter(Boolean)
    )];

    const coords = CITY_COORDS[city.toLowerCase()];

    try {
      // Skip if already seeded
      const existing = await Hotel.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        'address.city': city,
      });
      if (existing) { skipped++; continue; }

      //  Create Hotel 
      const hotel = await Hotel.create({
        name: name.slice(0, 100),
        description: `${name} is a ${starRating}-star property in ${city}, India, offering comfortable stays with a selection of amenities.`,
        address: {
          street: `${name}, ${city}`,
          city,
          state: '',
          country: 'India',
          postalCode: '',
        },
        starRating,
        averageRating: rating,
        amenities: amenities.length > 0 ? amenities : ['wifi', 'ac'],
        images: [],
        policies: {
          checkInTime: '14:00',
          checkOutTime: '11:00',
          petFriendly: features.some(f => String(f).toLowerCase().includes('pet')),
          smokingAllowed: false,
        },
        location: coords
          ? { type: 'Point', coordinates: coords }
          : undefined,
        isActive: true,
        managedBy: admin._id,
      });

      //  Create Room Type 
      const roomType = await RoomType.create({
        hotel: hotel._id,
        name: 'Standard Room',
        description: `Comfortable standard room at ${name} with modern amenities.`,
        maxOccupancy: 2,
        baseRatePerNight: price > 0 ? price : 999,
        currency: 'INR',
        amenities: amenities.slice(0, 5),
        bedConfiguration: [{ bedType: 'double', count: 1 }],
        cancellationPolicy: { freeCancellationHours: 24 },
      });

      //  Create 5 rooms 
      const TOTAL_ROOMS = 5;
      for (let i = 1; i <= TOTAL_ROOMS; i++) {
        await Room.create({
          hotel:      hotel._id,
          roomType:   roomType._id,
          roomNumber: `S${String(i).padStart(3, '0')}`,
          floor:      Math.ceil(i / 2),
          status:     'available',
        });
      }

      //  Seed 90-day inventory (one doc per date per roomType) 
      await seedInventory(hotel._id, roomType._id, TOTAL_ROOMS, 90);

      created++;
      if (created % 25 === 0 || created <= 5) {
        console.log(`  [${created}] ${name} — ${city} (${starRating}, ₹${price})`);
      }
    } catch (err) {
      errors++;
      console.error(`  ${name}: ${err.message}`);
    }
  }

  console.log('\n');
  console.log('  Seeding complete!');
  console.log(`    Hotels created:   ${created}`);
  console.log(`    Already existed:  ${skipped}`);
  console.log(`    Errors:           ${errors}`);
  console.log(`    Rooms per hotel:  5`);
  console.log(`    Inventory:        90 days per room`);
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
  console.log(`    Deleted ${h.deletedCount} hotels, ${rt.deletedCount} room types, ${r.deletedCount} rooms, ${ic.deletedCount} inventory entries`);
  await mongoose.disconnect();
  process.exit(0);
}

if (process.argv.includes('--destroy')) {
  destroy().catch(console.error);
} else {
  seed().catch(console.error);
}
