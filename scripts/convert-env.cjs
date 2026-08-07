const fs = require('fs');
const lines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let yaml = '';
for (const line of lines) {
  if (line.trim() && !line.startsWith('#')) {
    const idx = line.indexOf('=');
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('\'') || val.startsWith('"')) {
        val = val.slice(1, -1);
      }
      val = val.replace(/"/g, '\\"');
      yaml += key + ': "' + val + '"\n';
    }
  }
}
fs.writeFileSync('.env.yaml', yaml);
console.log('Converted .env.local to .env.yaml');
