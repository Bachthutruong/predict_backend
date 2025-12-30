// Script to fix Cart collection indexes
// Run with: node backend/scripts/fix-cart-index.js

require('dotenv').config();
const mongoose = require('mongoose');

async function fixCartIndexes() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predict_win');
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const cartsCollection = db.collection('carts');

    // List existing indexes
    console.log('\n📋 Current indexes:');
    const indexes = await cartsCollection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop old problematic indexes
    console.log('\n🗑️  Dropping old indexes...');
    try {
      await cartsCollection.dropIndex('user_1');
      console.log('  ✅ Dropped user_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('  ℹ️  user_1 index does not exist');
      } else {
        console.log('  ⚠️  Error dropping user_1:', err.message);
      }
    }

    try {
      await cartsCollection.dropIndex('guestId_1');
      console.log('  ✅ Dropped guestId_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('  ℹ️  guestId_1 index does not exist');
      } else {
        console.log('  ⚠️  Error dropping guestId_1:', err.message);
      }
    }

    // Create new indexes with proper partial filter
    console.log('\n🔧 Creating new indexes...');
    
    await cartsCollection.createIndex(
      { user: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { user: { $type: 'objectId' } },
        name: 'user_1'
      }
    );
    console.log('  ✅ Created user_1 index with partial filter (only ObjectId values)');

    await cartsCollection.createIndex(
      { guestId: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { guestId: { $exists: true, $type: 'string', $ne: '' } },
        name: 'guestId_1'
      }
    );
    console.log('  ✅ Created guestId_1 index with partial filter');

    await cartsCollection.createIndex({ lastUpdated: -1 });
    console.log('  ✅ Created lastUpdated index');

    // Verify new indexes
    console.log('\n📋 New indexes:');
    const newIndexes = await cartsCollection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.partialFilterExpression) {
        console.log(`    Partial filter: ${JSON.stringify(idx.partialFilterExpression)}`);
      }
    });

    console.log('\n✅ Cart indexes fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixCartIndexes();

