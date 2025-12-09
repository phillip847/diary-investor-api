import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to database
await mongoose.connect(process.env.MONGODB_URI);

console.log('🔄 Migrating newsletter data...');

try {
  // Rename the old Newsletter collection to Subscriber
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const hasNewsletter = collections.some(c => c.name === 'newsletters');
  const hasSubscriber = collections.some(c => c.name === 'subscribers');

  if (hasNewsletter && !hasSubscriber) {
    await db.collection('newsletters').rename('subscribers');
    console.log('✅ Renamed newsletters collection to subscribers');
  } else if (hasSubscriber) {
    console.log('ℹ️  Subscribers collection already exists');
  } else {
    console.log('ℹ️  No newsletter collection found');
  }

  console.log('✨ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
} finally {
  await mongoose.disconnect();
}
