import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,appendFile,stat,unlink} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
const magic=Buffer.from('WEBIFY01');
export async function encryptStream(stream,target,key){if(key.length!==32)throw new Error('Klucz kopii musi mieć 32 bajty.');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);const out=createWriteStream(target,{mode:0o600,flags:'wx'});out.write(Buffer.concat([magic,iv]));try{await pipeline(stream,cipher,out);await appendFile(target,cipher.getAuthTag());const handle=await open(target,'r');await handle.sync();await handle.close();}catch(e){await unlink(target).catch(()=>{});throw e;}}
// Cały plik musi przejść weryfikację GCM przed uruchomieniem psql/rozpakowaniem.
export async function decryptFile(source,target,key){const size=(await stat(source)).size;if(size<36||key.length!==32)throw new Error('Niepoprawna kopia lub klucz.');const f=await open(source,'r'),header=Buffer.alloc(20),tag=Buffer.alloc(16);await f.read(header,0,20,0);await f.read(tag,0,16,size-16);await f.close();if(!header.subarray(0,8).equals(magic))throw new Error('Niepoprawny format kopii.');const cipher=createDecipheriv('aes-256-gcm',key,header.subarray(8));cipher.setAAD(magic);cipher.setAuthTag(tag);try{await pipeline(createReadStream(source,{start:20,end:size-17}),cipher,createWriteStream(target,{mode:0o600,flags:'wx'}));}catch(e){await unlink(target).catch(()=>{});throw e;}}
