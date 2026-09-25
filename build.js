import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('--- Building Find the Number for Production / CrazyGames ---');

// 1. Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'js'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'img'), { recursive: true });

// 2. Copy index.html
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
console.log('✓ Copied index.html');

// 3. Copy css files
const cssFiles = fs.readdirSync(path.join(rootDir, 'css')).filter(f => f.endsWith('.css'));
cssFiles.forEach(f => {
  fs.copyFileSync(path.join(rootDir, 'css', f), path.join(distDir, 'css', f));
  console.log(`✓ Copied css/${f}`);
});

// 4. Copy js files
const jsFiles = fs.readdirSync(path.join(rootDir, 'js')).filter(f => f.endsWith('.js'));
jsFiles.forEach(f => {
  fs.copyFileSync(path.join(rootDir, 'js', f), path.join(distDir, 'js', f));
  console.log(`✓ Copied js/${f}`);
});

// 5. Copy required runtime images
const requiredImages = [
  'find the num homw.png',
  'win trophy.png',
  'how to play.png',
  'icon-audio.png',
  'icon-stats.png',
  'icon-settings.png',
  'icon-how-to-play.png',
  'dark them background horizontal.png',
  'dark them background vertical.png',
  'light them background horizontal.png',
  'light them background vertical.png'
];

requiredImages.forEach(img => {
  const src = path.join(rootDir, 'img', img);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, 'img', img));
    console.log(`✓ Copied img/${img}`);
  } else {
    console.warn(`! Missing image: ${img}`);
  }
});

// 6. Create Zip Archive for CrazyGames
const zipPath = path.join(rootDir, 'find-the-number-crazygames.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  console.log('Creating production ZIP archive...');
  // Use single quotes inside PowerShell for robust path handling with spaces
  const psCmd = `Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log(`✓ Generated: ${zipPath}`);
} catch (e) {
  console.error('Failed to create zip with Compress-Archive:', e);
}

console.log('--- Production Build Complete! ---');
