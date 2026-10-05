export function validateProduction(env) {
  const errors = [];
  const requireValue = key => { if (!env[key]) errors.push(`Ustaw ${key}.`); };
  for (const key of ['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'MASTER_ENCRYPTION_KEY', 'CRON_SECRET']) requireValue(key);
  for (const key of ['NEXTAUTH_SECRET', 'CRON_SECRET']) if ((env[key] || '').length < 32) errors.push(`${key}: minimum 32 znaki.`);
  if (Buffer.from(env.MASTER_ENCRYPTION_KEY || '', 'base64').length !== 32) errors.push('MASTER_ENCRYPTION_KEY: wymagany klucz 32 bajty w base64.');
  try { const url = new URL(env.NEXTAUTH_URL); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
  catch { errors.push('NEXTAUTH_URL musi być publicznym adresem HTTPS.'); }
  try { const url = new URL(env.DATABASE_URL); if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error(); }
  catch { errors.push('DATABASE_URL musi wskazywać PostgreSQL.'); }
  if (env.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) requireValue(key);
    if (env.S3_ENDPOINT && !env.S3_ENDPOINT.startsWith('https://')) errors.push('S3_ENDPOINT musi używać HTTPS.');
  } else if (env.STORAGE_DRIVER === 'local') {
    if (!env.RAILWAY_VOLUME_MOUNT_PATH || env.LOCAL_STORAGE_PATH !== env.RAILWAY_VOLUME_MOUNT_PATH) errors.push('LOCAL_STORAGE_PATH musi wskazywać zamontowany trwały wolumen Railway.');
  } else errors.push('Ustaw STORAGE_DRIVER na local albo s3.');
  if (env.DEMO_PASSWORD) errors.push('Usuń DEMO_PASSWORD z produkcji; nie uruchamiaj seeda demonstracyjnego.');
  return errors;
}
