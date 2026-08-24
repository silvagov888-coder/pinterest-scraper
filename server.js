const express = require('express');
const { chromium } = require('playwright');

const app = express();

const PORT = process.env.PORT || 10000;

const GIRLS_URL =
  'https://pt.pinterest.com/xtlnn0/moon-icons-girl/';

const BOYS_URL =
  'https://pt.pinterest.com/xtlnn0/moon-icons-boy/';

// ============================================================
// UTILITÁRIOS
// ============================================================

function isPinImage(url) {
  if (!url) return false;

  try {
    const u = new URL(url);

    if (u.hostname !== 'i.pinimg.com') {
      return false;
    }

    const p = u.pathname.toLowerCase();

    if (!/\.(jpg|jpeg|png|webp)$/.test(p)) {
      return false;
    }

    if (p.includes('/originals/')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);

    u.search = '';
    u.hash = '';

    return u
      .toString()
      .replace(/\/$/, '');
  } catch {
    return url;
  }
}

function extractDomImages(images) {
  const result = [];
  const seen = new Set();

  for (const item of images) {
    const candidates = [
      item.currentSrc,
      item.src,
      item.dataSrc,
      item.dataOriginal
    ];

    let image = candidates.find(isPinImage);

    if (!image) continue;

    image = normalizeUrl(image);

    if (seen.has(image)) continue;

    seen.add(image);

    result.push({
      id: `img:${image}`,
      image,
      url: image,
      alt: item.alt || ''
    });
  }

  return result;
}

// ============================================================
// SCRAPER
// ============================================================

async function scrapePinterest(boardUrl, name) {
  let browser;

  try {
    console.log(`[Pinterest] Iniciando ${name}...`);

    browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1200
      },

      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/131.0.0.0 Safari/537.36'
    });

    console.log(
      `[Pinterest] Abrindo: ${boardUrl}`
    );

    await page.goto(boardUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(6000);

    const collected = new Map();

    for (let i = 0; i < 30; i++) {
      console.log(
        `[Pinterest] ${name} - scroll ${i + 1}/30`
      );

      const current = await page.evaluate(() => {
        return [...document.images].map(img => ({
          src: img.src || '',
          currentSrc: img.currentSrc || '',
          alt: img.alt || '',
          dataSrc:
            img.getAttribute('data-src') || '',
          dataOriginal:
            img.getAttribute('data-original') || ''
        }));
      });

      for (const item of current) {
        const candidates = [
          item.currentSrc,
          item.src,
          item.dataSrc,
          item.dataOriginal
        ];

        const image = candidates.find(isPinImage);

        if (image) {
          const key = normalizeUrl(image);

          if (!collected.has(key)) {
            collected.set(key, {
              ...item,
              currentSrc: image
            });
          }
        }
      }

      await page.evaluate(() => {
        window.scrollBy(
          0,
          Math.max(
            900,
            window.innerHeight * 1.2
          )
        );
      });

      await page.waitForTimeout(1300);
    }

    const finalImages = await page.evaluate(() => {
      return [...document.images].map(img => ({
        src: img.src || '',
        currentSrc: img.currentSrc || '',
        alt: img.alt || '',
        dataSrc:
          img.getAttribute('data-src') || '',
        dataOriginal:
          img.getAttribute('data-original') || ''
      }));
    });

    for (const item of finalImages) {
      const candidates = [
        item.currentSrc,
        item.src,
        item.dataSrc,
        item.dataOriginal
      ];

      const image = candidates.find(isPinImage);

      if (image) {
        const key = normalizeUrl(image);

        if (!collected.has(key)) {
          collected.set(key, {
            ...item,
            currentSrc: image
          });
        }
      }
    }

    const pins = extractDomImages(
      [...collected.values()]
    );

    console.log(
      `[Pinterest] ${name}: ${pins.length} imagens encontradas`
    );

    if (pins.length) {
      console.log(
        `[Pinterest] ${name}: primeira imagem: ${pins[0].image}`
      );
    }

    await browser.close();
    browser = null;

    return pins;

  } catch (error) {
    console.error(
      `[Pinterest] Erro em ${name}:`,
      error
    );

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    throw error;
  }
}

// ============================================================
// API
// ============================================================

app.get('/', (req, res) => {
  res.json({
    online: true,
    service: 'Pinterest Scraper',
    endpoint: '/scrape'
  });
});

app.get('/scrape', async (req, res) => {
  console.log(
    '[API] Recebida solicitação de scraping'
  );

  try {
    // Girls e Boys são executados em sequência
    // para não tentar abrir dois Chromiums ao mesmo tempo.
    const girls = await scrapePinterest(
      GIRLS_URL,
      'Girls'
    );

    const boys = await scrapePinterest(
      BOYS_URL,
      'Boys'
    );

    res.json({
      success: true,
      girls,
      boys,
      counts: {
        girls: girls.length,
        boys: boys.length
      }
    });

  } catch (error) {
    console.error(
      '[API] Erro:',
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Pinterest Scraper rodando na porta ${PORT}`
  );
});
