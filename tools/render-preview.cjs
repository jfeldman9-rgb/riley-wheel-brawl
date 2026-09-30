'use strict';
// Offscreen Canvas review renders, not browser screenshots or pacing evidence.
// Uses every real game asset. Missing files remain errors and the game's failure
// banner is never hidden. This is a delivery helper, not a release gate.
const fs=require('fs'),path=require('path'),Module=require('module');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'docs/review/release1/previews'));
let source=fs.readFileSync(path.join(__dirname,'soak.cjs'),'utf8');
source=source.replace("const fs = require('fs');",`const fs = require('fs');
const {Image: NativeImage}=require('@napi-rs/canvas');
function realImage(root){return class extends NativeImage{set onload(fn){this._onload=()=>{fn();};}get onload(){return this._onload;}set src(value){const file=require('path').join(root,String(value).split('?')[0]);try{super.src=fs.readFileSync(file);}catch(e){if(this.onerror)this.onerror(e);}}get src(){return super.src;}decode(){return this.width>0&&this.height>0?Promise.resolve():Promise.reject(new Error('Local image is not decoded'));}};}`);
source=source.replace(/Image: class \{ constructor\(\) \{ this\.crossOrigin = ''; \} set src\(value\) \{ sandbox\.__assetRequests \+= 1; sandbox\.__assetUrls\.push\(value\); if \(this\.onerror\) this\.onerror\(\); \} \}/, 'Image: realImage(root)');
if(!source.includes('Image: realImage(root)'))throw Error('Image adapter did not match current boot');
const mod=new Module(path.join(__dirname,'preview-boot.cjs'),module);mod.filename=path.join(__dirname,'preview-boot.cjs');mod.paths=module.paths;mod._compile(source,mod.filename);
(async()=>{
 fs.mkdirSync(out,{recursive:true});GlobalFonts.registerFromPath(path.join(root,'assets/fonts/press-start-2p.ttf'),'Press Start 2P');
 const R=mod.exports.boot(root);while(!R.assets.done)await new Promise(resolve=>setTimeout(resolve,10));await R.assets.ready(Object.keys(R.ART_FILES));const deadline=Date.now()+30000;const expected=Object.keys(R.ART_FILES).filter(k=>R.ART_MANIFEST.includes(R.ART_FILES[k]));while(expected.some(k=>!R.assets.settled(k))&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));if(expected.some(k=>!R.assets.settled(k)))throw Error('Image loading did not settle');
 const failures=R.assets.failed();if(failures.length)throw Error('Real assets failed: '+failures.join(', '));
 for(const key of ['title-key','logo','cut-escape','cut-homecoming','portrait-fade','portrait-draghkar','portrait-forsaken'])if(!R.assets.get(key))throw Error('Missing review art '+key);
 const canvas=createCanvas(1280,720),g=canvas.getContext('2d');R.display.renderScale=2;
 const save=(scene,name,label)=>{g.setTransform(2,0,0,2,0,0);scene.draw(g);g.fillStyle='#06111ee8';g.fillRect(0,351,640,9);R.drawText(g,'OFFSCREEN CANVAS REVIEW / '+label,320,357,4,'#d5e5ef','center');fs.writeFileSync(path.join(out,name+'.jpeg'),canvas.toBuffer('image/jpeg',92));};
 const files=[];
 if(process.argv.includes('--story')){
  for(const [key,name,label] of [['intro','stage1','EMONDS FIELD'],['callandor','callandor','CALLANDOR ACQUIRED'],['stage5','tower-arrival','BLACK TOWER ARRIVAL']]){
   const reel=new R.scenes.Reel(R.game,R.CAPTIONS[key],()=>new R.scenes.Title(R.game),label);reel.timer=3;save(reel,name,label);files.push(name);
  }
 }else{
  save(new R.scenes.Title(R.game),'title','TITLE');files.push('title');
  const boss=new R.scenes.Play(R.game,1,{wave:5});boss.enter();boss.bossCard=3.2;save(boss,'fade-intro','FADE INTRO');files.push('fade-intro');
  const reel=new R.scenes.Reel(R.game,R.CAPTIONS.escape,()=>new R.scenes.Title(R.game),'ESCAPE FROM THE BLACK TOWER');reel.timer=3;save(reel,'escape','ESCAPE');files.push('escape');
 }
 save(new R.scenes.Victory(R.game),'credits','FAMILY CREDITS');files.push('credits');
 console.log(JSON.stringify({method:'Actual runtime draw methods with every local game asset loaded in @napi-rs/canvas; not a browser screenshot',failures,files:files.map(n=>path.join(out,n+'.jpeg'))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
