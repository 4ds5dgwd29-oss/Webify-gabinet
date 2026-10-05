// Railway montuje wolumen jako root. Przygotuj wyłącznie katalog danych,
// następnie uruchom serwer jako użytkownik node (UID/GID obrazu: 1000).
import { mkdir, chown, access, constants } from 'node:fs/promises';
import { validateProduction } from './validate-production.mjs';
const errors = validateProduction(process.env);
if (errors.length) throw new Error(errors.join('\n'));
if (process.env.STORAGE_DRIVER !== 's3') {
  const dir = process.env.LOCAL_STORAGE_PATH;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if (process.getuid?.() === 0) await chown(dir, 1000, 1000);
}
if (process.getuid?.() === 0) {
  process.setgroups([]);
  process.setgid(1000);
  process.setuid(1000);
}
if (process.env.STORAGE_DRIVER !== 's3') await access(process.env.LOCAL_STORAGE_PATH, constants.W_OK);
await import('../server.js');
