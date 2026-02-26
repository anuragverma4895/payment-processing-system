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

  // Create admin user
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@paygateway.io',
    password: 'Admin@1234',
    role: 'admin',
  });

  // Create regular user
  const user = await User.create({
    name: 'John Doe',
    email: 'user@paygateway.io',
    password: 'User@1234',
    role: 'user',
  });

  // Create sample orders
  await Order.insertMany([
    { userId: user._id, amount: 999, currency: 'INR', description: 'Premium Plan subscription', status: 'created' },
    { userId: user._id, amount: 499, currency: 'INR', description: 'E-book purchase', status: 'paid', paidAt: new Date() },
    { userId: user._id, amount: 1999, currency: 'INR', description: 'Annual membership', status: 'failed', attempts: 3 },
  ]);

  console.log('✅ Seed data created:');
  console.log('   Admin: admin@paygateway.io / Admin@1234');
  console.log('   User:  user@paygateway.io / User@1234');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(console.error);
