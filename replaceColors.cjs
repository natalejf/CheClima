const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

const replacements = {
  "'#22c55e'": "'var(--green)'",
  "'#10b981'": "'var(--accent-secondary)'",
  "'#f59e0b'": "'var(--yellow)'",
  "'#3b82f6'": "'var(--blue)'",
  "'#ef4444'": "'var(--red)'",
  "'#f1f5f9'": "'var(--text-white)'",
  "'#e2e8f0'": "'var(--text-primary)'",
  "'#94a3b8'": "'var(--text-secondary)'",
  "'#64748b'": "'var(--text-muted)'",
  "'#86efac'": "'var(--green)'",
  "'#fcd34d'": "'var(--yellow)'",
  "'#fca5a5'": "'var(--red)'",
  "'#93c5fd'": "'var(--blue)'",
  "'#fdba74'": "'var(--yellow)'",
  "'rgba(34, 197, 94, 0.15)'": "'var(--green-bg)'",
  "'rgba(34, 197, 94, 0.2)'": "'var(--green-border)'",
  "'rgba(34, 197, 94, 0.3)'": "'var(--green-border)'",
  "'rgba(34, 197, 94, 0.5)'": "'var(--green-border)'",
  "'rgba(34,197,94,0.5)'": "'var(--green-border)'",
  "'rgba(34,197,94,0.1)'": "'var(--green-bg)'",
  "'rgba(34,197,94,0.2)'": "'var(--green-border)'",
  "'rgba(245,158,11,0.15)'": "'var(--yellow-bg)'",
  "'rgba(245,158,11,0.3)'": "'var(--yellow-border)'",
  "'rgba(239,68,68,0.08)'": "'var(--red-bg)'",
  "'rgba(239,68,68,0.15)'": "'var(--red-border)'",
  "'rgba(15, 23, 42, 0.8)'": "'var(--bg-elevated)'",
  "'rgba(15, 23, 42, 0.95)'": "'var(--bg-card-solid)'",
  "'rgba(15, 23, 42, 0.6)'": "'var(--bg-elevated)'",
  "'rgba(15, 23, 42, 0.4)'": "'var(--bg-elevated)'",
  "'rgba(30,41,59,0.5)'": "'var(--bg-elevated)'",
  "'rgba(148,163,184,0.1)'": "'var(--glass-border)'",
  "'rgba(148,163,184,0.08)'": "'var(--glass-border)'",
  "'rgba(148,163,184,0.12)'": "'var(--glass-border)'"
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('Colors replaced in App.jsx');
