#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sharp = require('sharp');

// Configuration
const MOMENTS_DIR = path.join(__dirname, '..', 'source', 'images', 'moments');
const FULLSIZE_DIR = path.join(MOMENTS_DIR, 'fullsize');
const THUMBNAIL_DIR = path.join(MOMENTS_DIR, 'thumbnails');
const INDEX_FILE = path.join(__dirname, '..', 'source', 'moments', 'index.md');

const THUMBNAIL_WIDTH = 300;
const FULLSIZE_MAX_WIDTH = 1920;

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Find the next available photo number
function getNextPhotoNumber() {
  const files = fs.readdirSync(FULLSIZE_DIR);
  const numbers = files
    .filter(f => /^\d+\.jpg$/i.test(f))
    .map(f => parseInt(f.match(/^(\d+)/)[1], 10));
  
  if (numbers.length === 0) return 1;
  return Math.max(...numbers) + 1;
}

// Process and save images
async function processImage(inputPath, photoNumber) {
  const fullsizePath = path.join(FULLSIZE_DIR, `${photoNumber}.jpg`);
  const thumbnailPath = path.join(THUMBNAIL_DIR, `${photoNumber}.jpg`);

  console.log('\n📸 Processing image...');

  // Get image metadata
  const metadata = await sharp(inputPath).metadata();
  console.log(`   Original size: ${metadata.width}x${metadata.height}`);

  // Create optimized full-size image
  let fullsizeTransform = sharp(inputPath).rotate(); // Auto-rotate based on EXIF
  
  if (metadata.width > FULLSIZE_MAX_WIDTH) {
    fullsizeTransform = fullsizeTransform.resize(FULLSIZE_MAX_WIDTH, null, {
      withoutEnlargement: true
    });
  }
  
  await fullsizeTransform
    .jpeg({ quality: 85, progressive: true })
    .toFile(fullsizePath);
  
  const fullsizeStats = fs.statSync(fullsizePath);
  console.log(`   ✅ Full-size saved: ${fullsizePath} (${(fullsizeStats.size / 1024).toFixed(1)} KB)`);

  // Create thumbnail
  await sharp(inputPath)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
  
  const thumbStats = fs.statSync(thumbnailPath);
  console.log(`   ✅ Thumbnail saved: ${thumbnailPath} (${(thumbStats.size / 1024).toFixed(1)} KB)`);

  return { fullsizePath, thumbnailPath };
}

// Update the moments index.md file
function updateMomentsIndex(photoNumber, caption) {
  const content = fs.readFileSync(INDEX_FILE, 'utf8');
  
  // Build the new photo entry
  let newEntry = `  - thumbnail: /images/moments/thumbnails/${photoNumber}.jpg
    fullsize: /images/moments/fullsize/${photoNumber}.jpg
    caption:
      date: "${caption.date}"
      location: "${caption.location}"`;
  
  if (caption.moment) {
    newEntry += `
      moment: "${caption.moment}"`;
  }
  
  // Find the end of the photos array (before the closing ---)
  // The photos array ends where the frontmatter ends
  const lines = content.split('\n');
  const endIndex = lines.findIndex((line, i) => i > 0 && line === '---');
  
  if (endIndex === -1) {
    throw new Error('Could not find end of frontmatter in index.md');
  }
  
  // Insert the new entry before the closing ---
  lines.splice(endIndex, 0, newEntry);
  
  fs.writeFileSync(INDEX_FILE, lines.join('\n'));
  console.log(`   ✅ Updated ${INDEX_FILE}`);
}

async function main() {
  console.log('\n🖼️  Add Photo to Moments\n');
  console.log('========================\n');

  // Check for input image path
  const inputPath = process.argv[2];
  
  if (!inputPath) {
    console.error('❌ Error: Please provide an image path');
    console.error('   Usage: npm run add-photo /path/to/your/image.jpg\n');
    process.exit(1);
  }

  // Resolve and validate the input path
  const resolvedPath = path.resolve(inputPath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${resolvedPath}\n`);
    process.exit(1);
  }

  // Check file extension
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(ext)) {
    console.error(`❌ Error: Unsupported image format: ${ext}`);
    console.error('   Supported formats: jpg, jpeg, png, webp, heic\n');
    process.exit(1);
  }

  console.log(`📁 Input: ${resolvedPath}\n`);

  // Get the next photo number
  const photoNumber = getNextPhotoNumber();
  console.log(`📌 Photo number: ${photoNumber}\n`);

  // Prompt for caption information
  console.log('📝 Enter caption information:\n');
  
  const date = await prompt('   Date (YYYY/MM): ');
  if (!date) {
    console.error('\n❌ Error: Date is required\n');
    rl.close();
    process.exit(1);
  }

  const location = await prompt('   Location: ');
  if (!location) {
    console.error('\n❌ Error: Location is required\n');
    rl.close();
    process.exit(1);
  }

  const moment = await prompt('   Moment description (optional, press Enter to skip): ');

  rl.close();

  // Process the image
  try {
    await processImage(resolvedPath, photoNumber);
    
    // Update the index file
    updateMomentsIndex(photoNumber, { date, location, moment });
    
    console.log('\n✨ Done! Photo added successfully.\n');
    console.log('   Next steps:');
    console.log('   1. Run "npm run server" to preview');
    console.log('   2. Commit and push to deploy\n');
    
  } catch (error) {
    console.error(`\n❌ Error processing image: ${error.message}\n`);
    process.exit(1);
  }
}

main();
