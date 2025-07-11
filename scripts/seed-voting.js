const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Running voting seed script...');

try {
  // Set environment to development
  process.env.NODE_ENV = 'development';
  
  // Run the voting seed
  const scriptPath = path.join(__dirname, '../src/utils/voting-seed.ts');
  
  // Use ts-node to run TypeScript file
  execSync(`npx ts-node ${scriptPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Voting seed completed successfully!');
} catch (error) {
  console.error('❌ Voting seed failed:', error.message);
  process.exit(1);
} 