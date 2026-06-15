import { execSync } from 'child_process';

const hostname = execSync('hostname', { encoding: 'utf8' }).trim().split('.')[0];
console.log(`${hostname}.local`);
