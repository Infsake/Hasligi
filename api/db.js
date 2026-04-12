const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || null;

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGO_URI environment variable is not set');
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
  hasMongoURI: Boolean(MONGODB_URI)
};
