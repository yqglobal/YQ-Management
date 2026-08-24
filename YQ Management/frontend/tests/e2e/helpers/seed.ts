import { execSync } from 'child_process';
import path from 'path';

export async function seedMassQueues() {
  const backendDir = path.resolve(__dirname, '../../../../backend');
  const output = execSync('npx ts-node scripts/seed-e2e.ts', {
    cwd: backendDir,
    encoding: 'utf8',
  });
  const lines = output.trim().split('\n');
  const jsonStr = lines[lines.length - 1]; // Parse the last line as JSON
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse seed output:', jsonStr);
    throw err;
  }
}
