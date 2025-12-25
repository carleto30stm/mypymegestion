import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

console.log('🚀 Starting Pre-build: Building Shared Package...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to shared directory (sibling to current package)
const sharedDir = path.resolve(__dirname, '../../shared');

if (!fs.existsSync(sharedDir)) {
  console.error(`❌ Error: Shared directory not found at ${sharedDir}`);
  process.exit(1);
}

console.log(`📂 Found shared directory at: ${sharedDir}`);

try {
  // En entorno monorepo/workspace, las dependencias ya están instaladas en el root.
  // Ejecutar npm ci aquí causa conflictos (EBUSY) con otros workspaces.
  // console.log('📦 Installing shared dependencies...');
  // execSync('npm ci', { cwd: sharedDir, stdio: 'inherit' });

  console.log('🔨 Building shared package...');
  execSync('npm run build', { cwd: sharedDir, stdio: 'inherit' });

  console.log('✅ Shared package built successfully!');
} catch (error) {
  console.error('❌ Failed to build shared package:', error.message);
  process.exit(1);
}
