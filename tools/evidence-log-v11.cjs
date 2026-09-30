'use strict';
// Bounded review copies in free workflow logs. PNG capture hashes remain recorded;
// screenshots are encoded as JPEG solely for log transport, never for pixel tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),base=path.join(root,'docs/review/v11');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const files=walk(base).filter(f=>/browser-presentation\/.+\.(png|json)$/.test(f)||/(desktop|ipad-landscape|phone-landscape)-.+\.png$/.test(f)||/device-browser\.json$/.test(f));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{for(const file of files){const original=fs.readFileSync(file);let bytes=original,name=path.relative(root,file),codec='original';
 if(file.endsWith('.png')){const image=await loadImage(file),canvas=createCanvas(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);bytes=canvas.toBuffer('image/jpeg',85);name=name.replace(/\.png$/,'.jpeg');codec='JPEG quality 85, original capture retained in runner';}
 if(bytes.length>1024*1024)throw new Error('Review copy unexpectedly large: '+file);
 const encoded=zlib.gzipSync(bytes).toString('base64');console.log('RWB_EVIDENCE_BEGIN '+JSON.stringify({name,sha256:sha(bytes),bytes:bytes.length,encoding:'gzip+base64',codec,sourcePath:path.relative(root,file),sourceSha256:sha(original),sourceBytes:original.length}));
 for(let i=0;i<encoded.length;i+=12000)console.log('RWB_EVIDENCE_DATA '+encoded.slice(i,i+12000));console.log('RWB_EVIDENCE_END '+name);
}console.log('RWB_EVIDENCE_COUNT '+files.length);})().catch(e=>{console.error(e);process.exitCode=1;});
