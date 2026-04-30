const mongoose = require('mongoose');
const Mixed = mongoose.Schema.Types.Mixed;

const teamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logo: String,
  founded: String,
  ranking: Number,
  players: [Mixed],
  matches: [Mixed]
}, { timestamps: true, strict: false });

const matchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  home: String,
  away: String,
  date: String,
  time: String,
  place: String,
  link: { type: String, default: null },
  status: { type: String, default: 'future' },
  score: { type: String, default: null },
  goals: [Mixed]
}, { timestamps: true, strict: false });

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true, strict: false });

function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  Team: getModel('Team', teamSchema),
  Match: getModel('Match', matchSchema),
  Admin: getModel('Admin', adminSchema)
};
