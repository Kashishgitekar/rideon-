import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';

dotenv.config();

const demoOwner = {
  name: 'RideOn Fleet',
  email: 'owner@rideon.local',
  password: 'RideOnOwner123!'
};

const demoCustomer = {
  name: 'Demo Customer',
  email: 'customer@rideon.local',
  password: 'RideOnUser123!'
};

const vehicles = [
  {
    name: 'Honda Activa 6G',
    brand: 'Honda',
    model: 'Activa 6G',
    category: 'Scooter',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 2,
    pricePerDay: 650,
    location: 'Pune',
    description: 'Comfortable and reliable scooter for city travel.',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Royal Enfield Classic 350',
    brand: 'Royal Enfield',
    model: 'Classic 350',
    category: 'Motorcycle',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seats: 2,
    pricePerDay: 1200,
    location: 'Mumbai',
    description: 'A dependable motorcycle for weekend rides and longer journeys.',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Maruti Suzuki Swift',
    brand: 'Maruti Suzuki',
    model: 'Swift',
    category: 'Hatchback',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    pricePerDay: 1800,
    location: 'Bengaluru',
    description: 'Practical hatchback for daily commutes and family trips.',
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Toyota Innova Crysta',
    brand: 'Toyota',
    model: 'Innova Crysta',
    category: 'SUV',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seats: 7,
    pricePerDay: 3500,
    location: 'Hyderabad',
    description: 'Spacious vehicle for group travel and outstation trips.',
    imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80'
  }
];

async function findOrCreateUser({ name, email, password }, role) {
  const passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(
    { email },
    { $setOnInsert: { name, email, passwordHash, role, status: 'active' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  await connectDatabase();
  const owner = await findOrCreateUser(demoOwner, 'owner');
  await findOrCreateUser(demoCustomer, 'customer');

  for (const vehicle of vehicles) {
    await Vehicle.updateOne(
      { owner: owner._id, name: vehicle.name },
      { $setOnInsert: { ...vehicle, owner: owner._id, verified: true, available: true } },
      { upsert: true }
    );
  }

  console.log(`Seeded demo accounts and ${vehicles.length} vehicles.`);
  console.log(`Customer login: ${demoCustomer.email} / ${demoCustomer.password}`);
  console.log(`Owner login: ${demoOwner.email} / ${demoOwner.password}`);
  await mongoose.connection.close();
}

seed().catch(error => {
  console.error('Unable to seed RideOn data:', error.message);
  process.exitCode = 1;
});
