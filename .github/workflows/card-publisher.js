/**
 * Card Publisher
 * Runs daily at 00:00 Lagos time
 * 
 * Reads cards/YYYY-MM-DD.json for today
 * Publishes it as public/daily/today.json
 * So players always see today's cards when they load
 */

const fs = require('fs');
const path = require('path');

/**
 * Get today's date in Lagos timezone (YYYY-MM-DD format)
 */
function lagosToday() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Main publisher logic
 */
async function publishToday() {
  const today = lagosToday();
  const cardPath = path.join(__dirname, '../../cards', `${today}.json`);
  const outputDir = path.join(__dirname, '../../public/daily');
  const outputPath = path.join(outputDir, 'today.json');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if card file exists for today
  if (!fs.existsSync(cardPath)) {
    console.error(`Card file not found: ${cardPath}`);
    console.error(`Please create cards/${today}.json with today's cards`);
    process.exit(1);
  }
  
  // Read today's cards
  const cardContent = fs.readFileSync(cardPath, 'utf8');
  let cardData;
  try {
    cardData = JSON.parse(cardContent);
  } catch (err) {
    console.error(`Invalid JSON in ${cardPath}:`, err.message);
    process.exit(1);
  }
  
  // Validate required fields
  if (!cardData.rounds || cardData.rounds.length !== 4) {
    console.error('Card file must have exactly 4 rounds');
    process.exit(1);
  }
  
  // Validate each round has required fields
  for (let i = 0; i < cardData.rounds.length; i++) {
    const round = cardData.rounds[i];
    if (!round.image || !round.answer || !round.options) {
      console.error(`Round ${i + 1} missing required fields: image, answer, options`);
      process.exit(1);
    }
    if (round.options.length !== 4) {
      console.error(`Round ${i + 1} must have exactly 4 options`);
      process.exit(1);
    }
    if (!round.options.includes(round.answer)) {
      console.error(`Round ${i + 1}: answer "${round.answer}" must be in options`);
      process.exit(1);
    }
  }
  
  // Add metadata
  const todayData = {
    date: today,
    generatedAt: new Date().toISOString(),
    campaignActive: cardData.campaignActive !== false, // default true
    rounds: cardData.rounds,
    options: cardData.options
  };
  
  // Write to public/daily/today.json
  fs.writeFileSync(outputPath, JSON.stringify(todayData, null, 2));
  console.log(`✓ Published cards for ${today} to ${outputPath}`);
}

// Run
publishToday().catch(err => {
  console.error('Card publication failed:', err);
  process.exit(1);
});
