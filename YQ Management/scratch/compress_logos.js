const sharp = require('sharp');
const fs = require('fs');

async function compress() {
  const lightLogo = 'frontend/public/qmova-light-logo.png';
  const darkLogo = 'frontend/public/qmova-dark-logo.png';

  if (fs.existsSync(lightLogo)) {
    await sharp(lightLogo)
      .resize(800)
      .webp({ quality: 80 })
      .toFile('frontend/public/qmova-light-logo.webp');
    console.log('Compressed light logo');
  }

  if (fs.existsSync(darkLogo)) {
    await sharp(darkLogo)
      .resize(800)
      .webp({ quality: 80 })
      .toFile('frontend/public/qmova-dark-logo.webp');
    console.log('Compressed dark logo');
  }
}
compress();
