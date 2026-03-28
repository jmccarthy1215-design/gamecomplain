const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

// Resolve file paths relative to the project root (two levels up from server/routes/)
const TOS_PATH     = path.join(__dirname, '../../ToS.txt');
const PRIVACY_PATH = path.join(__dirname, '../../privacy_policy.txt');

// GET /api/legal/tos — return Terms of Service text
router.get('/tos', (req, res) => {
  fs.readFile(TOS_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Could not read ToS.txt:', err.message);
      return res.status(500).json({ error: 'Could not load Terms of Service.' });
    }
    res.type('text/plain').send(data);
  });
});

// GET /api/legal/privacy — return Privacy Policy text
router.get('/privacy', (req, res) => {
  fs.readFile(PRIVACY_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Could not read privacy_policy.txt:', err.message);
      return res.status(500).json({ error: 'Could not load Privacy Policy.' });
    }
    res.type('text/plain').send(data);
  });
});

module.exports = router;
