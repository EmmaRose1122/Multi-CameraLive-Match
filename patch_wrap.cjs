const fs = require('fs');

function addFlexWrap(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Add flex-wrap to all flex rows that might overflow
  content = content.replace(/className="flex items-center gap-([0-9\.]+)"/g, 'className="flex flex-wrap items-center gap-$1"');
  content = content.replace(/className="flex items-center justify-between/g, 'className="flex flex-wrap items-center justify-between');
  fs.writeFileSync(file, content);
}

addFlexWrap('src/components/MasterSwitcher/ScoreboardOverlayPanel.tsx');
addFlexWrap('src/components/MasterSwitcher/InstantReplayDeck.tsx');
addFlexWrap('src/components/MasterSwitcher/RtmpYouTubeBroadcaster.tsx');

console.log("Added flex-wrap generously");
