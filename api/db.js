const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || null;
const isValidMongoURI = typeof MONGODB_URI === 'string' && /^(mongodb(?:\+srv)?:\/\/)/.test(MONGODB_URI);

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!isValidMongoURI) {
    throw new Error('MONGO_URI environment variable is not set or is invalid');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = {
  connectDB,
  hasMongoURI: isValidMongoURI
};
