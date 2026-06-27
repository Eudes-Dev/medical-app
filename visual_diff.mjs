#!/usr/bin/env node
/**
 * visual_diff.mjs — Arbitre de la boucle de clonage visuel.
 *
 * Rend la page produite, la capture au meme viewport que la reference, et
 * compare au pixel pres. C'est ce script qui dit a la boucle si elle a fini.
 *
 *   code 0 = sous le seuil  -> objectif atteint, la boucle s'arrete.
 *   code 1 = au-dessus      -> la boucle continue, et diff.png montre OU corriger.
 *
 * Pre-requis :
 *   npm i -D playwright pixelmatch pngjs
 *   npx playwright install chromium
 *
 * Usage :
 *   node visual_diff.mjs <reference.png> <url> <largeur> <hauteur> [seuil]
 *     seuil = ratio max de pixels differents tolere (defaut 0.01 = 1%)
 */
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

const [, , refPath, url, wStr, hStr, thrStr] = process.argv;
const width = parseInt(wStr, 10);
const height = parseInt(hStr, 10);
const threshold = parseFloat(thrStr ?? '0.01');

// --- 1. Rendre la page produite et la capturer ---
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500); // laisser polices + etat initial se poser
const shotBuf = await page.screenshot({ fullPage: false });
await browser.close();

// --- 2. Charger reference + production ---
const produced = PNG.sync.read(shotBuf);
const reference = PNG.sync.read(fs.readFileSync(refPath));

if (produced.width !== reference.width || produced.height !== reference.height) {
  console.log(
    `ECHEC — dimensions differentes : produit ${produced.width}x${produced.height} ` +
    `vs reference ${reference.width}x${reference.height}. Aligne le viewport d'abord.`
  );
  process.exit(1);
}

// --- 3. Diff pixel ---
const { width: w, height: h } = reference;
const diff = new PNG({ width: w, height: h });
const mismatched = pixelmatch(
  reference.data, produced.data, diff.data, w, h,
  { threshold: 0.1 } // tolerance couleur PAR pixel (anti-aliasing)
);
fs.writeFileSync('diff.png', PNG.sync.write(diff));

const ratio = mismatched / (w * h);
const pct = (ratio * 100).toFixed(2);

// --- 4. Verdict ---
if (ratio > threshold) {
  console.log(
    `ECHEC — ${pct}% de pixels differents (seuil ${(threshold * 100).toFixed(2)}%).\n` +
    `   Ouvre diff.png : les zones en rouge/magenta montrent exactement ou corriger.`
  );
  process.exit(1);
}

console.log(`SUCCES — ${pct}% de difference, sous le seuil. Clone visuel conforme.`);
process.exit(0);
