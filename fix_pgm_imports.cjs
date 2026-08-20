const fs = require('fs');
let content = fs.readFileSync('src/components/MasterSwitcher/ProgramMonitor.tsx', 'utf8');

content = content.replace(
  "import React, { useEffect, useRef, useState } from 'react';\nimport { Volume2, VolumeX } from 'lucide-react'; from 'react';",
  "import React, { useEffect, useRef, useState } from 'react';\nimport { Volume2, VolumeX } from 'lucide-react';"
);

fs.writeFileSync('src/components/MasterSwitcher/ProgramMonitor.tsx', content);
console.log("Fixed program monitor imports");
