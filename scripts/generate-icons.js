const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// You can change this to your custom image path
const sourceImage = path.join(__dirname, '../public/custom-logo.jpg');
// Or use the default SVG if custom image doesn't exist
const defaultImage = path.join(__dirname, '../public/logo.svg');

const sizes = [16, 32, 48, 64, 192, 512];
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  const inputImage = fs.existsSync(sourceImage) ? sourceImage : defaultImage;

  // Generate PNG icons
  for (const size of sizes) {
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 59, g: 130, b: 246, alpha: 1 } // #3B82F6 background
      })
      .png()
      .toFile(path.join(publicDir, `logo${size}.png`));
  }

  // Generate favicon.ico (multiple sizes in one file)
  const faviconSizes = [16, 32, 48, 64];
  const faviconBuffers = await Promise.all(
    faviconSizes.map(size =>
      sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 }
        })
        .toBuffer()
    )
  );

  // Create a simple screenshot
  const screenshot = `
    <svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#F3F4F6"/>
      <rect x="320" y="160" width="640" height="400" rx="20" fill="white" stroke="#E5E7EB" stroke-width="2"/>
      <text x="640" y="200" text-anchor="middle" font-family="Arial" font-size="24" fill="#1F2937">AWS File Upload</text>
      <rect x="360" y="240" width="560" height="40" rx="8" fill="#E5E7EB"/>
      <rect x="360" y="300" width="200" height="40" rx="8" fill="#3B82F6"/>
      <text x="460" y="325" text-anchor="middle" font-family="Arial" font-size="16" fill="white">Upload File</text>
    </svg>
  `;

  fs.writeFileSync(path.join(publicDir, 'screenshot.svg'), screenshot);
  await sharp(path.join(publicDir, 'screenshot.svg'))
    .png()
    .toFile(path.join(publicDir, 'screenshot1.png'));
}

generateIcons().catch(console.error); 