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
// fade-fixed plates with the painted join art (assets/art/stage{2,3}-join-*),
// so their rows compare the candidate against these pinned candidate RGBA
// hashes instead of the control render. Every other row (Stages 1, 4 and 5,
// roof, cancellation/return) stays an exact comparison with the control.
// Layer geometry is still compared with the control for every row.
const REBASELINED_STAGES=new Set([2,3]),REBASELINE_ID='stage2-3-fade-join-2026-10-01';
const STAGE23_BASELINE=Object.freeze({
 'parallax-sweep/2/0/1//':'7222282c4d7057b457a9e14ca8a91945bc8abdd6c3256350846e80d3657cc077',
 'parallax-sweep/2/0.125/1//':'cbb0a0e8fe4a27f52a5171f7e529c7832341955795fbca15822940a19a0ad50f',
 'parallax-sweep/2/79.875/1//':'bfbcd8e78c7a05903a559e933ba08cb7fa6bfcedac22e173eb2cf59c307f042f',
 'parallax-sweep/2/80/1//':'15ab3566b3331bbe943aebe7ff42df05fd74d2182bf8c4b74c7044583632cf99',
 'parallax-sweep/2/319.875/1//':'1f496bd69188f05f40f06dde9a46cf9b0619687b1313e8d7ebe47e944d21f902',
 'parallax-sweep/2/1000/1//':'30e9bd7ba44c776c90719131f515de5fc0c14d2091248b9b0b062b1c6b4bfa17',
 'parallax-sweep/2/1524.125/1//':'980a611cd9feab5289d9c4c90a7b7b216aefdc8bf6c9ce09cc788f61a838012c',
 'parallax-sweep/2/2800/1//':'d1c720f9aae5ce89271fbd4da8bd5b08dc9a91fb5ba5f89ce17ac325d8b07d3f',
 'parallax-sweep/2/3600/1//':'3e58744e3466f9330a90fb8a8c58632d0c54faf6b172242c7fccc7909f129778',
 'parallax-sweep/3/0/1//':'b4fabc4cab6016f9a86889080daab925d6035c276636c19412ead0ca40ca8c76',
 'parallax-sweep/3/0.125/1//':'f3b4d6fe4c433025f307ed8a743bfb317f126737a73207f68c1d67600de057f5',
 'parallax-sweep/3/79.875/1//':'3d2a38d05a691d4a902f2501edb7219746d811add0dd247f6470a1a9deeff94e',
 'parallax-sweep/3/80/1//':'7e09c3f4d718974f631d9cf2d826cd2e129dda240cca9cc41ec2fdcd6d9d8826',
 'parallax-sweep/3/319.875/1//':'d548c3ad675952f6e8ef27991ff2a8a63f3c3469bc26fd5f636d5ddc7adc91ce',
 'parallax-sweep/3/1000/1//':'a020cdaff2ca6313f5c3128443e0cb562264ceaf273a03182a545391c21869f0',
 'parallax-sweep/3/1524.125/1//':'4515a2374fcbb2d1ee25a909604b1e62a63fe45d29934dd37f6167015ae9f03f',
 'parallax-sweep/3/2800/1//':'80f59e76876aa7c0fd009046022da7c89646147873b6d0ee25adbe5dec37da47',
 'parallax-sweep/3/3600/1//':'4e0552fcc53d69e766a29b80ca6c6bd012744e7a9b12fb91fa5abb57ba93501a',
 'parallax-sweep/2/0/2//':'136df0e552ecda9ed48617ff1026d1b0dcdffac14c7118a7b01293b7d59ae31b',
 'parallax-sweep/2/0.125/2//':'b2598e6262ac8022edfbcde1bec39d37082a20a0c84609c4a471df6b08ae855f',
 'parallax-sweep/2/79.875/2//':'3bf149f9c530b5b6c0bc2099fb815ef004bbe0927463fde36843d124eaefb528',
 'parallax-sweep/2/80/2//':'976686e15d866e7d17803df8bf7d85d1ae493b8a14fef373944723b52cdb1709',
 'parallax-sweep/2/319.875/2//':'5bb1f199d5a07f21dd60efc30a638e22ad55d3e54563de96b056b6d75e75ff9d',
 'parallax-sweep/2/1000/2//':'a9b268ff7500dba1145c98877e52079aa2967e431e67aa7f3b79564e4b0e86e4',
 'parallax-sweep/2/1524.125/2//':'daed092049919c8109440ef17d48bce94b2ba95c145220e7004dbaac7aa0af36',
 'parallax-sweep/2/2800/2//':'0b1053b033b5a23ed35d9dd2e6ac4ce15ee68e85c7295969bfefbfd7cee2c5d4',
 'parallax-sweep/2/3600/2//':'9f0c979c845c4edd0aa8de55c5e8b5faa13cb7755d10fb0ee227fc78787d5543',
 'parallax-sweep/3/0/2//':'03e2b5ba927785a0b77df9f988d615ab920c7f91667d3cafd2e3fba3aef17470',
 'parallax-sweep/3/0.125/2//':'6b9ae2025e6567633867b3468f70dc180a40582c6b81a0df2c2c1d9f0f284a41',
 'parallax-sweep/3/79.875/2//':'77971d50de41707aaf67a5d27f71f249af808aabebda0c1d661a93befd218305',
 'parallax-sweep/3/80/2//':'fe414f054a693bf80c2a4921d1edadb34ccc05b12f5ca0d90fc1116aceb430d1',
 'parallax-sweep/3/319.875/2//':'d6bf3e64f243d4466b49436958587d02362ffaad93a02a1ee50d4720a03181ea',
 'parallax-sweep/3/1000/2//':'b694cf1c0a7f1920d103c8e0f26d75ecb1788eb246134a4b97feb779d4e21d26',
 'parallax-sweep/3/1524.125/2//':'2d1c7906657bb6c5847dfd4ee9694c040391b14b9105b025048bf3c504d7c358',
 'parallax-sweep/3/2800/2//':'7bd86e2317c65bb464303a8853125f5722515bb978f92cfad138cd8e0a18c6c4',
 'parallax-sweep/3/3600/2//':'69cc9345b7a9b5d6bae170cb2d620c1d550a1883d159ae28231ba0d58a4db540',
 'parallax-sweep/2/0/3//':'02d3b59c37329f3ce3f09d484a6a5d203c7978f823745735523cd83ca6ba7de6',
 'parallax-sweep/2/0.125/3//':'c07d304645bdadc44ba225d20c3b85dac01669e2c3afe78c8a8d9b7d3bf190ad',
 'parallax-sweep/2/79.875/3//':'6720ff7173e82dd95d834cc2eeba5a0fdb3905d454ce9815e90ceb550060d7af',
 'parallax-sweep/2/80/3//':'58ac89f353d3e263332fda14d2d8a51f6dc88f8e849a67aeccd6ba0e909b12cd',
 'parallax-sweep/2/319.875/3//':'3f92bf0e399e431d7741286a35df9b1686584e51221d40e1430cb702fe11b8b4',
 'parallax-sweep/2/1000/3//':'2fee594887add65f38f6506f0fdd33e07f60535bc1faa9c27aa3e134c7573591',
 'parallax-sweep/2/1524.125/3//':'66014fd3138ef58e4b3bd1b72857dd4384adffc863098ea5b55722c144d6c787',
 'parallax-sweep/2/2800/3//':'fb71819219bd6cb75b89216bc31df9f2dfa9572eaa499322fbae8bb86faabfec',
 'parallax-sweep/2/3600/3//':'156734857932d15687e92e698d57b0c06972c5a467d7115df2950734190d92cd',
 'parallax-sweep/3/0/3//':'8f4c68b6b68fb8260671006bad0390a1ac28aed874a91d9dde62ff630ee2e900',
 'parallax-sweep/3/0.125/3//':'1189e3574c940c30fc618f34b42457a98e6753898cc0099b80e66a7bc67e9e66',
 'parallax-sweep/3/79.875/3//':'a1652ad0f355aefcc32131d846fb4283d5cf51397b90923a4b40aa22f07b294d',
 'parallax-sweep/3/80/3//':'148955a3c525172766972331aaa3fc4a27d0de2dc8a70f7ad99590cec6266c8b',
 'parallax-sweep/3/319.875/3//':'9f72c1bcafefa20bee1caa43f7a443f23419f483c862c4430baa37564ac8f5ef',
 'parallax-sweep/3/1000/3//':'4f7942d80d0e1400a27147df8f06383d9a81404140908de5431b49c3436d3ab3',
 'parallax-sweep/3/1524.125/3//':'9411ddefe8f77c00e55edfb86c45fdc8fff5479745be25f3dc12e46ab70cc128',
 'parallax-sweep/3/2800/3//':'c95d3f9bd40ec869e268bc9b0a896d6f0c3ae1032bc77a73e4d96ce35268141f',
 'parallax-sweep/3/3600/3//':'8a4d1daccfe76a7f72cbe208dbd958c40f810e71b93ff7e3b170e9b8ab36c095',
 'destination-view/3/0/1/copy/3':'b4fabc4cab6016f9a86889080daab925d6035c276636c19412ead0ca40ca8c76',
 'destination-view/3/0/1/ramp/3':'b4fabc4cab6016f9a86889080daab925d6035c276636c19412ead0ca40ca8c76',
 'destination-view/3/0/1/window/3':'b4fabc4cab6016f9a86889080daab925d6035c276636c19412ead0ca40ca8c76',
 'destination-view/3/0/2/copy/3':'03e2b5ba927785a0b77df9f988d615ab920c7f91667d3cafd2e3fba3aef17470',
 'destination-view/3/0/2/ramp/3':'03e2b5ba927785a0b77df9f988d615ab920c7f91667d3cafd2e3fba3aef17470',
 'destination-view/3/0/2/window/3':'03e2b5ba927785a0b77df9f988d615ab920c7f91667d3cafd2e3fba3aef17470',
 'destination-view/3/0/3/copy/3':'8f4c68b6b68fb8260671006bad0390a1ac28aed874a91d9dde62ff630ee2e900',
 'destination-view/3/0/3/ramp/3':'8f4c68b6b68fb8260671006bad0390a1ac28aed874a91d9dde62ff630ee2e900',
 'destination-view/3/0/3/window/3':'8f4c68b6b68fb8260671006bad0390a1ac28aed874a91d9dde62ff630ee2e900'
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
