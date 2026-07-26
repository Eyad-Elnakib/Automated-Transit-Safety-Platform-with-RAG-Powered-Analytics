const mongoose = require('mongoose');

let _connected = false;

async function connectDB(uri) {
  if (_connected) return;
  await mongoose.connect(uri);
  _connected = true;
  console.log('[backend] MongoDB connected:', uri);
}

module.exports = { connectDB };
