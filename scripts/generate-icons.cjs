const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f0fdf4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  
  <!-- Hexagon with SJA -->
  <g transform="translate(256, 256)">
    <!-- Outer hexagon -->
    <polygon points="0,-200 173,-100 173,100 0,200 -173,100 -173,-100" 
      fill="none" stroke="#4ade80" stroke-width="24" stroke-linejoin="round"/>
    
    <!-- Inner structure - S -->
    <g transform="translate(-90, 0)">
      <path d="M-25,-85 L25,-85 L25,-55 L-5,-55 L-5,-15 L25,-15 L25,85 L-25,85 L-25,55 L5,55 L5,15 L-25,15 Z" 
        fill="#4ade80"/>
    </g>
    
    <!-- Inner structure - J -->
    <g transform="translate(0, 0)">
      <path d="M-20,-85 L20,-85 L20,55 Q20,85 -10,85 L-25,70 Q0,70 0,50 L0,-55 L-20,-55 Z" 
        fill="#4ade80"/>
    </g>
    
    <!-- Inner structure - A -->
    <g transform="translate(90, 0)">
      <path d="M0,-85 L40,85 L15,85 L8,55 L-8,55 L-15,85 L-40,85 L0,-85 Z" fill="#4ade80"/>
      <path d="M0,-35 L-6,30 L6,30 Z" fill="white"/>
    </g>
  </g>
</svg>`;

// Android icon sizes
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// Foreground icon sizes (for adaptive icons)
const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432
};

const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function generateIcons() {
  console.log('🎨 Generating Android icons...\n');

  // Generate from SVG buffer
  const svgBuffer = Buffer.from(svgContent);

  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputDir = path.join(androidResDir, folder);
    
    // Generate ic_launcher.png
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    
    console.log(`✓ ${folder}/ic_launcher.png (${size}x${size})`);

    // Generate ic_launcher_round.png (circular)
    const circleRadius = Math.floor(size / 2);
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" fill="white"/>
      </svg>`
    );

    await sharp(svgBuffer)
      .resize(size, size)
      .composite([{
        input: circleMask,
        blend: 'dest-in'
      }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));

    console.log(`✓ ${folder}/ic_launcher_round.png (${size}x${size})`);
  }

  // Generate foreground icons for adaptive icons
  console.log('\n📱 Generating adaptive icon foregrounds...\n');
  
  const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <g transform="translate(256, 256)">
      <!-- Outer hexagon -->
      <polygon points="0,-180 156,-90 156,90 0,180 -156,90 -156,-90" 
        fill="none" stroke="#4ade80" stroke-width="22" stroke-linejoin="round"/>
      
      <!-- S -->
      <g transform="translate(-80, 0)">
        <path d="M-22,-75 L22,-75 L22,-48 L-5,-48 L-5,-12 L22,-12 L22,75 L-22,75 L-22,48 L5,48 L5,12 L-22,12 Z" 
          fill="#4ade80"/>
      </g>
      
      <!-- J -->
      <g transform="translate(0, 0)">
        <path d="M-18,-75 L18,-75 L18,48 Q18,75 -8,75 L-22,60 Q0,60 0,42 L0,-48 L-18,-48 Z" 
          fill="#4ade80"/>
      </g>
      
      <!-- A -->
      <g transform="translate(80, 0)">
        <path d="M0,-75 L35,75 L12,75 L7,48 L-7,48 L-12,75 L-35,75 L0,-75 Z" fill="#4ade80"/>
        <path d="M0,-30 L-5,25 L5,25 Z" fill="white"/>
      </g>
    </g>
  </svg>`;

  const fgBuffer = Buffer.from(fgSvg);

  for (const [folder, size] of Object.entries(foregroundSizes)) {
    const outputDir = path.join(androidResDir, folder);
    
    await sharp(fgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    
    console.log(`✓ ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('\n✅ All Android icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
