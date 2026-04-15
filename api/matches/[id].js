const db = require('../db');
const { connectDB, hasMongoURI } = db;
const { Match } = require('../models');
const { seedMatchesIfEmpty, readJsonFile, writeJsonFile } = require('../utils');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    // Get id from query or URL path
    let id = req.query.id;
    
    // If not in query, try to parse from URL path
    if (!id && req.url) {
      const urlMatch = req.url.match(/\/api\/matches\/([^/?]+)/);
      if (urlMatch) {
        id = urlMatch[1];
      }
    }

    if (!id) {
      return res.status(400).send('Maç ID\'si bulunamadı');
    }

    const { score, link, goals, date, time, place, home, away, status } = req.body;

    if (!hasMongoURI) {
      const matches = await readJsonFile('matches.json');
      const match = matches.find((m) => m.id === id);
      if (!match) {
        return res.status(404).send('Maç bulunamadı');
      }

      if (typeof home !== 'undefined') match.home = home;
      if (typeof away !== 'undefined') match.away = away;
      if (typeof date !== 'undefined') match.date = date;
      if (typeof time !== 'undefined') match.time = time;
      if (typeof place !== 'undefined') match.place = place;
      if (typeof link !== 'undefined') match.link = link || null;
      if (typeof score !== 'undefined') {
        match.score = score;
        if (score) {
          match.status = status || 'past';
        }
      }
      if (Array.isArray(goals)) match.goals = goals;
      if (typeof status !== 'undefined') match.status = status;

      await writeJsonFile('matches.json', matches);
      return res.status(200).json(match);
    }

    await connectDB();
    await seedMatchesIfEmpty();

    const match = await Match.findOne({ id });
    if (!match) {
      return res.status(404).send('Maç bulunamadı');
    }

    if (typeof home !== 'undefined') match.home = home;
    if (typeof away !== 'undefined') match.away = away;
    if (typeof date !== 'undefined') match.date = date;
    if (typeof time !== 'undefined') match.time = time;
    if (typeof place !== 'undefined') match.place = place;
    if (typeof link !== 'undefined') match.link = link || match.link || null;
    if (typeof score !== 'undefined') {
      match.score = score;
      if (score) {
        match.status = status || 'past';
      }
    }
    if (Array.isArray(goals)) match.goals = goals;
    if (typeof status !== 'undefined') match.status = status;

    await match.save();
    return res.status(200).json(match);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
