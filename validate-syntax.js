const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('node --check page-bridge\\alliance-requests-panel.js', { stdio: 'inherit' });
  console.log('Syntax check passed');
} catch (error) {
  console.error('Syntax check failed');
  process.exit(1);
}
