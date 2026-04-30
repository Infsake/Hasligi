const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function getTeamAndIndexFromRequest(req) {
  let result = { id: null, index: null };
  
  // First, try to get from body (most reliable)
  if (req.body) {
    if (req.body.teamId) result.id = req.body.teamId;
    if (typeof req.body.playerIndex !== 'undefined') {
      result.index = req.body.playerIndex;
      // If we got both from body, return immediately
      if (result.id && typeof result.index !== 'undefined') return result;
    }
  }

  // Then try from query
  if (req.query) {
    if (!result.id && req.query.id) result.id = req.query.id;
    if (typeof result.index === 'undefined' && typeof req.query.index !== 'undefined') result.index = req.query.index;
  }

  // Finally try from URL path
  const parsed = url.parse(req.url || '', true);
  if (parsed.pathname) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const playersIndex = segments.indexOf('players');
    if (playersIndex > 0) {
      if (!result.id) result.id = segments[playersIndex - 1];
      if (typeof result.index === 'undefined' && segments.length > playersIndex + 1) {
        result.index = segments[playersIndex + 1];
      }
    }
  }

  return result;
}

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedTeamsIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { id, index } = getTeamAndIndexFromRequest(req);
    if (!id) {
      return res.status(400).send('Takım idsi eksik');
    }
    
    // Ensure index is a valid number
    let playerIndex;
    if (typeof index === 'string') {
      playerIndex = parseInt(index, 10);
    } else if (typeof index === 'number') {
      playerIndex = index;
    } else {
      playerIndex = NaN;
    }
    
    if (Number.isNaN(playerIndex) || playerIndex < 0) {
      return res.status(400).send('Geçersiz oyuncu indeksi');
    }

    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
    }

    if (!Array.isArray(team.players) || playerIndex < 0 || playerIndex >= team.players.length) {
      return res.status(404).send('Oyuncu bulunamadı');
    }

    let updatedPlayer = (req.body && req.body.player) || req.body;
    if (typeof updatedPlayer === 'string') {
        updatedPlayer = JSON.parse(updatedPlayer);
    }
    if (!updatedPlayer || typeof updatedPlayer !== 'object' || Array.isArray(updatedPlayer)) {
      return res.status(400).send('Oyuncu verisi gerekli');
    }

    // Handle photo upload from base64 - store compressed base64 in database
    if (updatedPlayer.photoBase64) {
      try {
        const base64Data = updatedPlayer.photoBase64.split(',')[1]; // Remove data:image/jpeg;base64,
        const buffer = Buffer.from(base64Data, 'base64');

        // Compress and resize image
        const compressedImage = await sharp(buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 60 })
          .toBuffer();

        // Store compressed image as base64 in database
        updatedPlayer.photo = 'data:image/jpeg;base64,' + compressedImage.toString('base64');
        delete updatedPlayer.photoBase64; // Remove original from player data
      } catch (photoErr) {
        console.error('Photo processing error:', photoErr);
        // Continue without photo if processing fails
        delete updatedPlayer.photoBase64;
      }
    }

    team.players[playerIndex] = updatedPlayer;
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
