import { networkInterfaces } from 'os';

for (const addrs of Object.values(networkInterfaces())) {
  for (const addr of addrs) {
    if (addr.family === 'IPv4' && !addr.internal) {
      console.log(addr.address);
      process.exit(0);
    }
  }
}

console.error('No LAN IPv4 address found');
process.exit(1);
