'use strict';
// Carry small review screenshots/JSON in free workflow logs rather than paid
// artifact storage. These are named, checksummed generated test outputs only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),base=path.join(root,'docs/review/v11');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const files=walk(base).filter(f=>/browser-presentation\/.+\.(png|json)$/.test(f)||/(desktop|ipad-landscape|phone-landscape)-.+\.png$/.test(f)||/device-browser\.json$/.test(f));
for(const file of files){const bytes=fs.readFileSync(file);if(bytes.length>3*1024*1024)throw new Error('Review evidence unexpectedly large: '+file);const name=path.relative(root,file),encoded=zlib.gzipSync(bytes).toString('base64'),hash=crypto.createHash('sha256').update(bytes).digest('hex');console.log('RWB_EVIDENCE_BEGIN '+JSON.stringify({name,sha256:hash,bytes:bytes.length,encoding:'gzip+base64'}));for(let i=0;i<encoded.length;i+=12000)console.log('RWB_EVIDENCE_DATA '+encoded.slice(i,i+12000));console.log('RWB_EVIDENCE_END '+name);}
console.log('RWB_EVIDENCE_COUNT '+files.length);
