
const express = require('express');
const { chromium } = require('playwright');

const app = express();

const PORT = process.env.PORT || 10000;

const GIRLS_URL = 'https://pt.pinterest.com/xtlnn0/moon-icons-girl/';
const BOYS_URL = 'https://pt.pinterest.com/xtlnn0/moon-icons-boy/';

// isPinImage()
// normalizeUrl()
// extractDomImages()
// scrapeBoard()
// scrapeBoysBoard()

app.get('/scrape', async (req, res) => {
    // executa Girls + Boys
});

app.get('/', (req, res) => {
    res.send('Pinterest scraper online');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pinterest scraper running on port ${PORT}`);
});
