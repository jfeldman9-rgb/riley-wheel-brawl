'use strict';
// Exact Chrome pixel and resource-lifetime verification. No timing-gate changes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review/v11/outcome-bitmap-browser.json');
const report={method:'Current demand-loaded ImageBitmap versus a separately decoded HTMLImageElement from the identical unchanged WebP bytes. Full-resolution RGBA and actual cached outcome poses at scales1/2/3 must match exactly. GitHub Chromium only; no physical-device or performance claim.',checks:[],errors:[],images:[]};
function check(name,ok,detail){report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);assert.ok(ok,name);}
async function run(){
 if(process.env.CI!=='true'||!process.env.GITHUB_ACTIONS)throw Error('Browser execution is restricted to the authorized GitHub workflow');
 const {chromium}=require('playwright'),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.ttf':'font/ttf'};
 const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.resolve(root,'.'+(u==='/'?'/index.html':u));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-accelerated-2d-canvas']});const p=await browser.newPage({viewport:{width:1280,height:720}});
  p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
  await p.goto('http://127.0.0.1:'+server.address().port+'/');await p.waitForFunction(()=>RWB.assets.done&&RWB.game?.scene,null,{timeout:120000});
  report.browser=await browser.version();const keys=await p.evaluate(()=>RWB.presentationV11.kinds.flatMap((_,i)=>RWB.presentationV11.keys(i)));
  check('All ten authored outcome keys are covered',keys.length===10&&new Set(keys).size===10);
  for(const key of keys){
   const row=await p.evaluate(async key=>{
    const R=RWB;await R.assets.ready([key]);const bitmap=R.assets.get(key);if(!(bitmap instanceof ImageBitmap))throw Error('Outcome is not a retained decoded ImageBitmap: '+key);
    const file=R.ART_FILES[key],html=new Image();html.crossOrigin='anonymous';html.src=file+'?v='+R.assets.VER;await html.decode();
    const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const compare=(a,b)=>{if(a.width!==b.width||a.height!==b.height)throw Error('Comparison dimensions differ');const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let changed=0,max=0;for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);if(d)changed++;if(d>max)max=d;}return{width:a.width,height:a.height,changedChannels:changed,maxChannelDifference:max};};
    const original=canvas(html.naturalWidth,html.naturalHeight),decoded=canvas(bitmap.width,bitmap.height);original.getContext('2d').drawImage(html,0,0);decoded.getContext('2d').drawImage(bitmap,0,0);
    const result={key,file,dimensions:[bitmap.width,bitmap.height],naturalDimensions:[bitmap.naturalWidth,bitmap.naturalHeight],htmlDimensions:[html.naturalWidth,html.naturalHeight],full:compare(original,decoded),poses:[]};
    const meta=R.OUTCOME_ART[key],box=meta.bounds,height=meta.height||(key.startsWith('riley-')?100:key.endsWith('draghkar')?78:74),width=height*box[2]/box[3],beforeScale=R.display.renderScale;
    try{for(const scale of [1,2,3]){R.display.renderScale=scale;R.presentationV11.cache.clear();const actual=R.presentationV11.pose(key,height),reference=canvas(Math.ceil(width*scale),Math.ceil(height*scale)),g=reference.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(html,...box,0,0,reference.width,reference.height);result.poses.push({scale,...compare(reference,actual.canvas)});}}
    finally{R.display.renderScale=beforeScale;R.presentationV11.cache.clear();R.assets.releaseDemand([key]);}
    result.released=!R.assets.has(key)&&R.assets.get(key)===null&&bitmap.width===0&&bitmap.height===0;
    return result;
   },key);
   row.sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.file))).digest('hex');report.images.push(row);
   check(key+' retains exact full-resolution decoded RGBA',row.full.changedChannels===0&&JSON.stringify(row.dimensions)===JSON.stringify(row.htmlDimensions)&&JSON.stringify(row.dimensions)===JSON.stringify(row.naturalDimensions),row.full);
   check(key+' preserves all three actual pose-cache scales',row.poses.length===3&&row.poses.every(x=>x.changedChannels===0),row.poses);
   check(key+' closes and releases its master bitmap',row.released);
  }
  check('No resource or script errors',report.errors.length===0,report.errors);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('RWB_OUTCOME_BITMAP_REPORT '+JSON.stringify(report));}
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
