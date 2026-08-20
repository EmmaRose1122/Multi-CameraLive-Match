const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /if \(params\.get\('mode'\) === 'camera'\) \{\s*setActiveTab\('camera'\);\s*\}/,
  "if (params.get('mode') === 'camera') {\n      setActiveTab('camera');\n      return;\n    }"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with Regex");
