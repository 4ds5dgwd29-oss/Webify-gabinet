import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {decryptFile} from './backup-crypto.mjs';
const [kind,source,target,confirmation]=process.argv.slice(2);if(!['db','files'].includes(kind)||!source||!target||confirmation!=='--potwierdz-odtworzenie')throw new Error('Użycie: node scripts/restore.mjs db|files KOPIA CEL --potwierdz-odtworzenie. Baza docelowa musi być pusta; pliki odtwarzaj do pustego katalogu.');
const dir=await mkdtemp(path.join(os.tmpdir(),'webify-restore-')),plain=path.join(dir,'verified');try{await decryptFile(source,plain,Buffer.from(process.env.BACKUP_ENCRYPTION_KEY||'','base64'));const args=kind==='db'?['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',target,plain]:['-xzf',plain,'-C',target,'--no-same-owner'];await new Promise((resolve,reject)=>{const child=spawn(kind==='db'?'pg_restore':'tar',args,{stdio:['ignore','inherit','inherit']});child.on('error',reject);child.on('exit',c=>c===0?resolve():reject(new Error('Odtworzenie nie powiodło się.')));});console.log('Odtworzono dane. Przed uruchomieniem aplikacji zastosuj rejestr usunięć i sprawdź spójność dokumentów.');}finally{await rm(dir,{recursive:true,force:true});}
