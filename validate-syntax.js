const { execSync } = require('child_process');
const path = require('path');

try {
  execSync(`node --check ${JSON.stringify(path.join('page-bridge', 'alliance-requests-panel.js'))}`, { stdio: 'inherit' });
  console.log('Syntax check passed');
} catch (error) {
  console.error('Syntax check failed');
  process.exit(1);
}
