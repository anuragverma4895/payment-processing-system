require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Order.deleteMany({});

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!adminPassword || !userPassword) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD are required to run the seed script.');
  }

  // Create admin user
  const admin = await User.create({
    name: process.env.SEED_ADMIN_NAME || 'Admin User',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@paygateway.io',
    password: adminPassword,
    role: 'admin',
  });

  // Create regular user
  const user = await User.create({
    name: process.env.SEED_USER_NAME || 'Demo User',
    email: process.env.SEED_USER_EMAIL || 'user@paygateway.io',
    password: userPassword,
    role: 'user',
  });

  // Create sample orders
  await Order.insertMany([
    { userId: user._id, amount: 999, currency: 'INR', description: 'Premium Plan subscription', status: 'created' },
    { userId: user._id, amount: 499, currency: 'INR', description: 'E-book purchase', status: 'paid', paidAt: new Date() },
    { userId: user._id, amount: 1999, currency: 'INR', description: 'Annual membership', status: 'failed', attempts: 3 },
  ]);

  console.log('✅ Seed data created:');
  console.log(`   Admin: ${admin.email}`);
  console.log(`   User:  ${user.email}`);
  console.log('   Passwords are intentionally not printed.');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(console.error);
