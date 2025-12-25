const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Pre-build: Building Shared Package...');

// Navigate to shared directory (sibling to current package)
const sharedDir = path.resolve(__dirname, '../../shared');

if (!fs.existsSync(sharedDir)) {
  console.error(`❌ Error: Shared directory not found at ${sharedDir}`);
  process.exit(1);
}

console.log(`📂 Found shared directory at: ${sharedDir}`);

try {
  console.log('📦 Installing shared dependencies...');
  execSync('npm ci', { cwd: sharedDir, stdio: 'inherit' });

  console.log('🔨 Building shared package...');
  execSync('npm run build', { cwd: sharedDir, stdio: 'inherit' });

  console.log('✅ Shared package built successfully!');
} catch (error) {
  console.error('❌ Failed to build shared package:', error.message);
  process.exit(1);
}
