/**
 * Daily settlement script
 * Runs at 00:01 Lagos time
 * 
 * 1. Reads public/daily/YYYY-MM-DD/plays.json
 * 2. Sorts by points descending
 * 3. Identifies top 10
 * 4. Generates opsPublished.csv
 * 5. Commits to repo
 */

const fs = require('fs');
const path = require('path');

/**
 * Get today's date in Lagos timezone
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
 * Main settlement logic
 */
async function settle() {
  const today = lagosToday();
  const playsPath = path.join(__dirname, '../../public/daily', today, 'plays.json');
  const opsPath = path.join(__dirname, '../../public/daily', today, 'opsPublished.csv');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(opsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Read plays
  let plays = [];
  if (fs.existsSync(playsPath)) {
    const content = fs.readFileSync(playsPath, 'utf8');
    plays = JSON.parse(content);
  }
  
  if (plays.length === 0) {
    console.log(`No plays for ${today}, skipping settlement`);
    return;
  }
  
  // Sort by points descending, then by logged_at ascending (earlier wins ties)
  plays.sort((a, b) => {
    const pointDiff = Number(b.total_points || 0) - Number(a.total_points || 0);
    if (pointDiff !== 0) return pointDiff;
    return new Date(a.logged_at) - new Date(b.logged_at);
  });
  
  // Identify top 10
  const topTenRanks = new Set();
  for (let i = 0; i < Math.min(10, plays.length); i++) {
    topTenRanks.add(i);
  }
  
  // Generate CSV header
  let csv = 'logged_at,play_date,username,total_points,rank,credited_at,verified_status,cash_amount\n';
  
  // Generate CSV rows
  // At this point: username and total_points are filled
  // Still need ops to fill: credited_at, verified_status
  // cash_amount is auto-filled here for top 10, ops can override
  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const isTopTen = topTenRanks.has(i);
    const cashAmount = isTopTen ? 2000 : 0;
    
    // Escape username if it contains commas/quotes
    const username = String(play.username || '').includes(',') 
      ? `"${String(play.username).replace(/"/g, '""')}"` 
      : play.username;
    
    csv += [
      play.logged_at || '',
      today,
      username,
      play.total_points || 0,
      (i + 1), // rank (1-indexed)
      '', // credited_at — ops fills this
      '', // verified_status — ops fills this
      cashAmount
    ].join(',') + '\n';
  }
  
  // Write CSV
  fs.writeFileSync(opsPath, csv);
  console.log(`Settlement complete: ${plays.length} plays, top 10 identified, CSV written to ${opsPath}`);
}

// Run
settle().catch(err => {
  console.error('Settlement failed:', err);
  process.exit(1);
});
