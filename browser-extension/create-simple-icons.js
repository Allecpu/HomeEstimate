// Script to create simple placeholder icons for the browser extension
// These are minimal valid PNG files with a colored square

const fs = require('fs');
const path = require('path');

// Minimal 16x16 purple PNG (Base64)
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR42mNk+M/wn4EIwDiqAABvSwX6BpO1CAAAAABJRU5ErkJggg==';

// Minimal 48x48 purple PNG (Base64)
const icon48Base64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAEklEQVR42mNk+M/wn4EIwDiqAABvSwX6BpO1CAAAAABJRU5ErkJggg==';

// Minimal 128x128 purple PNG (Base64)
const icon128Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAEklEQVR42mNk+M/wn4EIwDiqAABvSwX6BpO1CAAAAABJRU5ErkJggg==';

const iconsDir = path.join(__dirname, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Write icon files
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), Buffer.from(icon16Base64, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), Buffer.from(icon48Base64, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), Buffer.from(icon128Base64, 'base64'));

console.log('✓ Icons created successfully!');
console.log('  - icon16.png');
console.log('  - icon48.png');
console.log('  - icon128.png');
console.log('\nYou can now load the extension in Chrome.');
