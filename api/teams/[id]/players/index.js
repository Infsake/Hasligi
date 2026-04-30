const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function getTeamIdFromRequest(req) {
  // First try body (most reliable)
  if (req.body && req.body.teamId) {
    return req.body.teamId;
  }
  
  // Then try query
  if (req.query && req.query.id) {
    return req.query.id;
  }
  
  // Finally try URL path
  const parsed = url.parse(req.url || '', true);
  if (!parsed.pathname) return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  const playersIndex = segments.indexOf('players');
  if (playersIndex > 0) {
    return segments[playersIndex - 1];
  }
  return null;
}

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedTeamsIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const id = getTeamIdFromRequest(req);
    if (!id) {
      return res.status(400).send('Takım idsi eksik');
    }

    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
    }

    let { player } = req.body || {};
    if (typeof player === 'string') {
        player = JSON.parse(player);
    }
    if (!player || typeof player !== 'object') {
      return res.status(400).send('Oyuncu verisi gerekli');
    }

    // Handle photo upload from base64 - store compressed base64 in database
    if (player.photoBase64) {
      try {
        const base64Data = player.photoBase64.split(',')[1]; // Remove data:image/jpeg;base64,
        const buffer = Buffer.from(base64Data, 'base64');

        // Compress and resize image
        const compressedImage = await sharp(buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 60 })
          .toBuffer();

        // Store compressed image as base64 in database
        player.photo = 'data:image/jpeg;base64,' + compressedImage.toString('base64');
        delete player.photoBase64; // Remove original from player data
      } catch (photoErr) {
        console.error('Photo processing error:', photoErr);
        // Continue without photo if processing fails
        delete player.photoBase64;
      }
    }

    team.players = Array.isArray(team.players) ? team.players : [];
    team.players.push(player);
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
