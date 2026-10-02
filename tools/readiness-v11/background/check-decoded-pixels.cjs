'use strict';
// Native decoded Canvas2D evidence, independently labeled from stub lifecycle checks.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const {root,runtime}=require('../runtime.cjs');
const {boot}=require(root+'/tools/soak.cjs'),{createCanvas,Image}=require('@napi-rs/canvas');
const tick=()=>new Promise(r=>setImmediate(r)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),rows=[],lifecycle=[],assetHashes={};
async function engine(variant,images,scale){
 const R=boot(root);await tick();let time=0;const canvases=[];
 R.assets.get=k=>images.get(k)||null;R.assets.has=k=>images.has(k);R.display.renderScale=scale;R.perf.allowSync=true;R.Puppet.prepareScene=()=>{};
 const box={window:{RWB:R},document:{createElement:()=>{const c=createCanvas(1,1);canvases.push(c);return c;},getElementById:()=>null},performance:{now:()=>time+=.000001},console,setTimeout:()=>0};vm.createContext(box);
 for(const name of ['performance','stages','scenes']){let source=runtime(variant==='before'?'control':'candidate',name+'.js');if(name==='stages')source=source.replace('R.StageWorld = {','R.StageWorld = {test:{backgrounds,sliceCache},').replace('}catch(error){','}catch(error){throw error;');if(name==='performance')source=source.replace('catch(e){done=true;}','catch(e){throw e;}');vm.runInContext(source,box,{filename:name+'.js'});}
 const W=R.StageWorld;
 function scene(n,cam=0,roof=false){return {levelIndex:n-1,camera:{x:cam},time:0,wave:roof?5:3,roofOn:roof,level:R.LEVELS[n-1],music:'stage'+n,saveCheckpoint(){},isGameplay:true};}
 function enter(s){R.scenes.Play.prototype.enter.call(s);}
 function render(s){const c=createCanvas(640*scale,360*scale),g=c.getContext('2d');g.scale(scale,scale);W.draw(g,s);W.near(g,s);return c;}
 function pump(){let steps=0;while(R.Bake.q.length&&steps++<3000)R.Bake.pump(4);assert.equal(R.Bake.q.length,0,'all native background work finishes');return steps;}
 return {R,W,scene,enter,render,pump,now:()=>time,dispose(){for(const c of canvases){c.width=1;c.height=1;}},variant,scale};
}
// Jason-approved re-baseline (Oct 1 2026): Stages 2 and 3 now render the
// fade-fixed plates, so their rows compare the candidate against these pinned
// candidate RGBA hashes instead of the control render. (The painted join art
// ships unwired; wiring it changes these renders.) Every other row (Stages 1, 4 and 5,
// roof, cancellation/return) stays an exact comparison with the control.
// Layer geometry is still compared with the control for every row.
const REBASELINED_STAGES=new Set([2,3]),REBASELINE_ID='stage2-3-fade-2026-10-01';
const STAGE23_BASELINE=Object.freeze({
 'parallax-sweep/2/0/1//':'7e84909b59bd1d97db491cf6e09e59119d06e6dd22526326fa8be30265dbae43',
 'parallax-sweep/2/0.125/1//':'bb136b6f3cbbaeb8141ebc02ebd71f293ae5249940c4ad1b397f76adde964189',
 'parallax-sweep/2/79.875/1//':'4e3f21f2a1e9a42eff99c0efadc06ad710d2b613c8dc9cc6c31b0985b5260196',
 'parallax-sweep/2/80/1//':'1f3337e6a82d0a830591a54746c59368ad38255f31e2bdd47d60a4060603c2d6',
 'parallax-sweep/2/319.875/1//':'9e5c7e42b2ab848bcc530a19a3e523f7cff91e6e0ac0adac70908879295c0f08',
 'parallax-sweep/2/1000/1//':'f5135ed071248f33306bd93e9740715d26f52c8ce19810dd0b66affb9f21828e',
 'parallax-sweep/2/1524.125/1//':'dd56b3ae32fc150727a366663e52520ece6099a667b6e5375b3350f0f72afb9a',
 'parallax-sweep/2/2800/1//':'912328b02d2f8e2e34e4411d1f5d9db871e6e343b978a22d460517d585eedb8f',
 'parallax-sweep/2/3600/1//':'e624d7efc4e1ce391ac367e3fb023ab07f066167483e01fd8cfd29db727ca92d',
 'parallax-sweep/3/0/1//':'e0d0c7069297e4095ee4d2b4c23157c31858853c0a0dbb7b6dc125eb8d6e4e64',
 'parallax-sweep/3/0.125/1//':'f508f330034d7048e0f6f635c4eabfc963c7c319e55f153983007e7db766c579',
 'parallax-sweep/3/79.875/1//':'9f7f2253fbdfe049a3fc900345b2d80ce5ed6b6b691961e7a683ce8d06a08d10',
 'parallax-sweep/3/80/1//':'04a04fc8eb0106c778da961f10de94ce399e62da6272e4b18e81763498580ed1',
 'parallax-sweep/3/319.875/1//':'449959fcdf3b02aff6f971dbda4f7bcc18677fa3940e2678a7630f1dc2cc32ae',
 'parallax-sweep/3/1000/1//':'4a8ab6fe8e3c3bea29f98f3edab3f1ea1770758169a9b0a634c6f2d5e2f216a2',
 'parallax-sweep/3/1524.125/1//':'fa9d77632c5613ba3b428a1158425c7f353a4fd7b714958894d55695e8aa8e50',
 'parallax-sweep/3/2800/1//':'9836b17875d1c29948856010828ad8088ad7847d88f554d9b8c1b95c92125aba',
 'parallax-sweep/3/3600/1//':'6f82be21f53846572df4f6415bea1697a46a2ab4fcec2fea0b83ebba8ed35d58',
 'parallax-sweep/2/0/2//':'7cd36f3a66c99b8397caa599bd72abfa078c705770fd6e5cfc70f5f195c3a336',
 'parallax-sweep/2/0.125/2//':'77b103f6f4d6e81ba5f8233b84e67ceba34653d36582644bda54e1a5b324b30c',
 'parallax-sweep/2/79.875/2//':'fd0197c46fd5fb22dd556e34112200366083ec3a610ef2467d6db1e98ae7890b',
 'parallax-sweep/2/80/2//':'6cd29f68d8d905da2ca61d9d5de84059bae3efb051576e9828f4fe20806f6f8a',
 'parallax-sweep/2/319.875/2//':'25338bdc7db98fdb573e35b1c88b73ca30c4c7e87fddf001adb50a426be1501b',
 'parallax-sweep/2/1000/2//':'23387f043b321ca8f196b1efdd22592df3b9665265fc4edd6c0b47ae932c60ac',
 'parallax-sweep/2/1524.125/2//':'c70fa3d1e2ffa516dea9dabac45ceeaa742437c36acbcb15f17e674944cf1c25',
 'parallax-sweep/2/2800/2//':'4f2922b77c204d2600c2d60e96090023af5f5e98a33f99a8443fe69fce8b1076',
 'parallax-sweep/2/3600/2//':'61d6f7c572ffd5d845e283eb4f01548612feb313ba262273723cfc6f8283c5b6',
 'parallax-sweep/3/0/2//':'30f19f655594aaaa68a43cb50106998a7968b345b069714f632fd874a56c3a5d',
 'parallax-sweep/3/0.125/2//':'e9a6b27ff727790755c7dc0b6f9cefd86c92dfd5dc2fb8b52cb8596385b885f5',
 'parallax-sweep/3/79.875/2//':'9f5a196f2cbe749ff8ea138cab9ca08f2bb6a1dd6e2d8590f2d3a95a9352877e',
 'parallax-sweep/3/80/2//':'b55c1ab2534681ab919bb239dd3ca94bc581a9bb2ef8ddeb237e46fc7e516b8d',
 'parallax-sweep/3/319.875/2//':'2e21504d0b679d3fe53c03a2b7099f3dd20ca562051799c8942f8baec456d92f',
 'parallax-sweep/3/1000/2//':'feae5671dc10fe13a72bb0f10781dd379eb513c445b6f91b2dacbd681401e80a',
 'parallax-sweep/3/1524.125/2//':'318e885c9affb9735672515d91e5e86ae0a9bb8126fabe6f104abfe802e46d88',
 'parallax-sweep/3/2800/2//':'dc9884d0a89cfe3bb960cdb8be694d60f63666f93b8c782d5ad6963d5002f1bd',
 'parallax-sweep/3/3600/2//':'86ab7195dd8b58407625d2fdcee105a3b0f6357e23ebc31bc541f0329af280b0',
 'parallax-sweep/2/0/3//':'1c9f4da250b2bcc7461b9818e14c30ef7ddfa28438174bb5bfaed0cbc06fc407',
 'parallax-sweep/2/0.125/3//':'59559688fc5afb9a5f43fff010bab1e43c24b9857167219b81e084a430629783',
 'parallax-sweep/2/79.875/3//':'c69d974972462182f8faa7048c076e16fdada433a80958faad37202ad80b2223',
 'parallax-sweep/2/80/3//':'a5a666b5fae509299fb02a2284f0e0c1538d44285a71484b3a3a6de875e3e4e8',
 'parallax-sweep/2/319.875/3//':'1b7ac6abba6c96dce1831e919ee544bcf113b884e87c4a7cd778295da65099bc',
 'parallax-sweep/2/1000/3//':'7098196bb18b3932caf0ea36f3ef50e02c3587d9a2dc5623f3763afa02a940a1',
 'parallax-sweep/2/1524.125/3//':'7e96bf7cbff096030a5014c934a5444bc8412ea59c000a9220f7b4863ff7a0b4',
 'parallax-sweep/2/2800/3//':'50fc83aef01fe24fbc52dce1315056972e293b7830c6434bee06d498015fff26',
 'parallax-sweep/2/3600/3//':'2f34fe72f88c07648c9989dddd8e5f83ee74361c74d805c92229c04d4c4e082c',
 'parallax-sweep/3/0/3//':'f036d5e035abe46a85c7847b3c11d17560172be19728c1a0b0f8b02da03879a9',
 'parallax-sweep/3/0.125/3//':'499bca92ab3f2c16df779b16d5090bef2d9c9cc8f700efc8afd74fd3bc873eae',
 'parallax-sweep/3/79.875/3//':'2b45aa2310ace0ca34019c24a0fe53e14d8150747ffd1b7d526f92c30d8b19d7',
 'parallax-sweep/3/80/3//':'a8608642033f180533c739eb286b2c9ca56e33da3202a6d11f762ef813feabe5',
 'parallax-sweep/3/319.875/3//':'8e2e9310d4f12a4ee7e107c47cfd6b8d84d81732bcd195a0f8be4c9fbd5e9117',
 'parallax-sweep/3/1000/3//':'3a282cdff84b5a8bb0c8d30454b050430b46686d1e2dddb7a62d51b54a7b072b',
 'parallax-sweep/3/1524.125/3//':'7b45c1cdf6d47aae97fe1cdefd694fb49ff603e1a6f3caaa6dd7429ecda8c1b4',
 'parallax-sweep/3/2800/3//':'baf1263899bf78bcd55ba64b4c5b5fb8034d866294ceefe5a83908e0bc35d832',
 'parallax-sweep/3/3600/3//':'3aea5a0922c57840a46a38c1069b125592272d7598be3cdfdf629d246346cf32',
 'destination-view/3/0/1/copy/3':'e0d0c7069297e4095ee4d2b4c23157c31858853c0a0dbb7b6dc125eb8d6e4e64',
 'destination-view/3/0/1/ramp/3':'e0d0c7069297e4095ee4d2b4c23157c31858853c0a0dbb7b6dc125eb8d6e4e64',
 'destination-view/3/0/1/window/3':'e0d0c7069297e4095ee4d2b4c23157c31858853c0a0dbb7b6dc125eb8d6e4e64',
 'destination-view/3/0/2/copy/3':'30f19f655594aaaa68a43cb50106998a7968b345b069714f632fd874a56c3a5d',
 'destination-view/3/0/2/ramp/3':'30f19f655594aaaa68a43cb50106998a7968b345b069714f632fd874a56c3a5d',
 'destination-view/3/0/2/window/3':'30f19f655594aaaa68a43cb50106998a7968b345b069714f632fd874a56c3a5d',
 'destination-view/3/0/3/copy/3':'f036d5e035abe46a85c7847b3c11d17560172be19728c1a0b0f8b02da03879a9',
 'destination-view/3/0/3/ramp/3':'f036d5e035abe46a85c7847b3c11d17560172be19728c1a0b0f8b02da03879a9',
 'destination-view/3/0/3/window/3':'f036d5e035abe46a85c7847b3c11d17560172be19728c1a0b0f8b02da03879a9'
});
const usedBaselines=new Set();
function compare(a,b,s,kind,extra={}){
 const A=a.render(s),B=b.render(s),dataA=Buffer.from(A.getContext('2d').getImageData(0,0,A.width,A.height).data),dataB=Buffer.from(B.getContext('2d').getImageData(0,0,B.width,B.height).data);
 const stage=s.levelIndex+1;let row;
 if(REBASELINED_STAGES.has(stage)){
  const key=[kind,stage,s.camera.x,a.scale,extra.phase||'',extra.destination||''].join('/'),pinned=STAGE23_BASELINE[key];
  assert.ok(pinned,'pinned Stage 2/3 baseline exists for '+key);usedBaselines.add(key);
  const afterHash=hash(dataB);row={kind,stage,roof:!!s.roofOn,camera:s.camera.x,scale:a.scale,beforeHash:pinned,afterHash,exact:afterHash===pinned,baseline:REBASELINE_ID,controlHash:hash(dataA),...extra};
 }else row={kind,stage,roof:!!s.roofOn,camera:s.camera.x,scale:a.scale,beforeHash:hash(dataA),afterHash:hash(dataB),exact:dataA.equals(dataB),...extra};
 rows.push(row);assert.ok(row.exact,JSON.stringify(row));
 const ea=a.W.preload(s),eb=b.W.preload(s);assert.deepEqual(JSON.parse(JSON.stringify(ea.layers.map(l=>[l.id,l.k,l.w,l.y,l.h]))),JSON.parse(JSON.stringify(eb.layers.map(l=>[l.id,l.k,l.w,l.y,l.h]))));
 if(a.scale===2&&((kind==='return-same-camera'&&extra.phase==='window'&&extra.destination===3)||(s.roofOn&&s.camera.x===3600))){const stem=kind==='return-same-camera'?'retained-stage1-same-camera':'stage5-roof';fs.writeFileSync(path.join(__dirname,'reports',stem+'-before.png'),A.toBuffer('image/png'));fs.writeFileSync(path.join(__dirname,'reports',stem+'-after.png'),B.toBuffer('image/png'));}
 A.width=B.width=1;A.height=B.height=1;return row;
}
(async()=>{
 const seed=boot(root);await tick();const images=new Map();for(const [key,file]of Object.entries(seed.ART_FILES)){if(!/^(stage|floor)/.test(key)||!/\.(png|jpe?g|webp)$/i.test(file))continue;const data=fs.readFileSync(path.join(root,file)),im=new Image();im.src=data;await im.decode();images.set(key,im);assetHashes[file]=hash(data);}
 for(const scale of [1,2,3]){
  const a=await engine('before',images,scale),b=await engine('after',images,scale);
  for(const stage of [1,2,3,4,5])for(const roof of(stage===5?[false,true]:[false]))for(const cam of [0,.125,79.875,80,319.875,1000,1524.125,2800,3600]){const s=a.scene(stage,cam,roof);a.enter(s);b.enter(s);compare(a,b,s,'parallax-sweep');a.pump();b.pump();}
  a.dispose();b.dispose();console.log('PASS exact decoded five-stage/roof parallax sweep at '+scale+'x');
 }
 for(const scale of [1,2,3])for(const destination of [3,5])for(const phase of ['copy','ramp','window']){
  const a=await engine('before',images,scale),b=await engine('after',images,scale),s=a.scene(1);compare(a,b,s,'before-cancellation',{phase,destination});
  const state=E=>{const e=E.W.preload(s),layer=e.layers.find(l=>l.id==='mid'),job=E.R.Bake.q.find(j=>j.background===e.key);assert.ok(job);let steps=0;while(steps++<2000){job.run(job,E.now()+.000014);if(phase==='window'?!!job.window:job.plate?.phase===phase)break;}assert.ok(steps<2000,phase+' reached');if(phase==='window')assert.equal(job.plate,null,'published source is detached');return {e,layer,job,partial:phase==='window'?job.window.canvas:job.plate.c,steps};};
  const oldA=state(a),oldB=state(b),published=[...b.W.test.sliceCache.values()],surfaces=[oldB.e.composite,...oldB.e.layers.map(l=>l.canvas)].map(c=>[c,c.width,c.height]),dest=a.scene(destination);
  b.W.activateStage(dest);assert.equal(oldB.partial.width,1);assert.equal(oldB.partial.height,1);assert.equal(oldB.job.plate,null);assert.equal(oldB.job.window,null);assert.equal(oldB.layer.pending,false);assert.ok(!oldB.layer.next);for(const c of published)assert.ok(c.width>1,'published source survives cancellation');for(const[c,w,h]of surfaces){assert.equal(c.width,w);assert.equal(c.height,h);}
  a.enter(dest);b.enter(dest);assert.equal(a.W.test.backgrounds.size,2);assert.equal(b.W.test.backgrounds.size,2);assert.ok(a.R.Bake.q.includes(oldA.job));assert.ok(!b.R.Bake.q.includes(oldB.job));compare(a,b,dest,'destination-view',{phase,destination});a.pump();b.pump();
  a.enter(s);b.enter(s);const composites=b.W.backgroundStats.composites;compare(a,b,s,'return-same-camera',{phase,destination});assert.equal(b.W.backgroundStats.composites,composites,'same-camera visible composite is reused');const retry=b.R.Bake.q.find(j=>j.background===oldB.e.key);assert.ok(retry);assert.notEqual(retry,oldB.job);a.pump();b.pump();assert.ok(oldB.layer.next);assert.equal(retry.window,null);assert.ok(oldB.layer.next.canvas.width>1);
  for(const cam of [80,1524.125]){const moved=a.scene(1,cam);compare(a,b,moved,'return-moving',{phase,destination});a.pump();b.pump();}
  lifecycle.push({scale,destination,phase,sourcePlateDetached:phase==='window'?oldB.job.plate===null:null,publishedSourcesPreserved:published.length,partialReleased:true,completedCacheRetained:true,sameCameraCompositeReused:true,neighborRequeuedAndCompleted:true});a.dispose();b.dispose();console.log('PASS exact decoded cancellation/return '+scale+'x Stage '+destination+' '+phase);
 }
 assert.equal(usedBaselines.size,Object.keys(STAGE23_BASELINE).length,'every pinned Stage 2/3 baseline is exercised');
 const report={method:'Offline real decoded @napi-rs/canvas native Skia. Actual combined candidate background painting, slicing, cache, queue, cancellation and Play.enter code; Puppet preparation and checkpoint/audio side effects are out of scope. Synthetic yield clock is used only to reach slice phases, not to measure performance. Stage 1, 4 and 5 RGBA hashes and all layer geometry match the unpatched before copy; Stage 2 and 3 RGBA hashes match the pinned Jason-approved Oct 1 2026 re-baseline (beforeHash is the pinned hash; controlHash is the control render). No browser, sockets, Chromium, remote actions, art edits, or timing claims.',comparisons:rows.length,allExact:rows.every(r=>r.exact),lifecycleCases:lifecycle.length,lifecycle,assetHashes,rows};fs.writeFileSync(path.join(__dirname,'reports/decoded-pixels.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({comparisons:rows.length,allExact:report.allExact,lifecycleCases:lifecycle.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
