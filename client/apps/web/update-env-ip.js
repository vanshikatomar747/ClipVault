import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  // Try to find the Wi-Fi interface (usually starting with en or wl)
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (name.startsWith('en') || name.startsWith('wl') || name.startsWith('wlan')) {
          return iface.address;
        }
      }
    }
  }
  // Fallback to any non-loopback IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');
  
  // Look for VITE_API_URL line in any format and replace it
  const regex = /^VITE_API_URL=(.*)/m;
  const match = content.match(regex);
  if (match) {
    const currentUrl = match[1].trim();
    const isRemote = currentUrl.startsWith('https://') || 
                     currentUrl.includes('.onrender.com') || 
                     (!currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1') && !/^(192\.168\.|10\.|172\.)/.test(currentUrl.replace(/^https?:\/\//, '')));
    
    if (isRemote) {
      console.log(`[ClipVault Auto-IP] Skipping update: VITE_API_URL is already set to a remote production URL: ${currentUrl}`);
      process.exit(0);
    }
    
    content = content.replace(regex, `VITE_API_URL=http://${localIp}:4000/api`);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`[ClipVault Auto-IP] Successfully updated VITE_API_URL in .env to host IP: http://${localIp}:4000/api`);
  } else {
    // Append it if not found
    content += `\nVITE_API_URL=http://${localIp}:4000/api\n`;
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`[ClipVault Auto-IP] Added VITE_API_URL to .env: http://${localIp}:4000/api`);
  }
} else {
  // Create .env if it doesn't exist
  fs.writeFileSync(envPath, `VITE_API_URL=http://${localIp}:4000/api\n`, 'utf8');
  console.log(`[ClipVault Auto-IP] Created new .env file with host IP: http://${localIp}:4000/api`);
}
