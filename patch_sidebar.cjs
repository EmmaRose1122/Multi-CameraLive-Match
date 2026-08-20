const fs = require('fs');

// Fix Scoreboard
let scoreFile = 'src/components/MasterSwitcher/ScoreboardOverlayPanel.tsx';
let scoreContent = fs.readFileSync(scoreFile, 'utf8');
// Fix the grid-cols-1 md:grid-cols-2 to flex flex-col gap-3
scoreContent = scoreContent.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-3"/g, 'className="flex flex-col gap-3"');
fs.writeFileSync(scoreFile, scoreContent);

// Fix ReplayDeck
let replayFile = 'src/components/MasterSwitcher/InstantReplayDeck.tsx';
let replayContent = fs.readFileSync(replayFile, 'utf8');
// Replace md:flex-row with flex-wrap and remove lg:flex-row
replayContent = replayContent.replace(/flex-col md:flex-row/g, 'flex-col sm:flex-row flex-wrap');
replayContent = replayContent.replace(/flex-col lg:flex-row/g, 'flex-col sm:flex-row flex-wrap');
fs.writeFileSync(replayFile, replayContent);

// Fix YouTube Broadcaster
let ytFile = 'src/components/MasterSwitcher/RtmpYouTubeBroadcaster.tsx';
let ytContent = fs.readFileSync(ytFile, 'utf8');
ytContent = ytContent.replace(/flex-col md:flex-row/g, 'flex-col sm:flex-row flex-wrap');
fs.writeFileSync(ytFile, ytContent);

console.log("Patched sidebars");
