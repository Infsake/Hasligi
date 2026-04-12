const db = require('../db');
const { connectDB, hasMongoURI } = db;
const { Team } = require('../models');
const { seedTeamsIfEmpty, readJsonFile } = require('../utils');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (hasMongoURI) {
        try {
          await connectDB();
          await seedTeamsIfEmpty();
          const teams = await Team.find().sort({ ranking: 1 }).lean();
          return res.status(200).json(teams);
        } catch (err) {
          console.error('Teams DB failed, falling back to teams.json', err);
        }
      }
      const teams = await readJsonFile('teams.json');
      return res.status(200).json(teams);
    }

    if (!hasMongoURI) {
      return res.status(500).send('MONGO_URI environment variable is not set on Vercel');
    }

    if (req.method === 'POST') {
      const { name, logo, founded, players } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Takım adı gerekli' });
      }
      await connectDB();
      await seedTeamsIfEmpty();
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const count = await Team.countDocuments();
      const newTeam = new Team({
        id,
        name,
        logo,
        founded,
        ranking: count + 1,
        players: Array.isArray(players) ? players : [],
        matches: []
      });
      await newTeam.save();
      return res.status(201).json(newTeam);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method not allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
