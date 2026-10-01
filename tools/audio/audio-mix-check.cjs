'use strict';
// Isolated real-WebAudio regression. It does not stub the audio clock, decode,
// source endings, gain automation, gesture restrictions, or production code.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
let passed = 0;
const check = (value, name) => { assert.ok(value, name); passed++; console.log('PASS ' + name); };
const requests = [], errors = [];
const server = http.createServer((req, res) => {
  const clean = decodeURIComponent(req.url.split('?')[0]);
  if (clean === '/harness') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><title>Audio harness</title><button>Unlock audio</button><script>window.RWB={}</script><script src="/js/audio.js"></script>'); }
  const file = path.join(root, clean);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'application/javascript', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.json':'application/json' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH } : {}), args:['--no-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    page.on('request', r => { if (/assets\/audio\//.test(r.url())) requests.push(r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.goto(origin + '/harness');
    await page.evaluate(() => {
      const A=RWB.audio;
      A.defineTrack('main',{urls:['/assets/audio/music-main.ogg','/assets/audio/music-main.mp3'],loopStart:31.103,loopEnd:159.103});
      A.aliasTrack(['title','stage1','stage2'],'main');
      document.querySelector('button').onclick=()=>A.unlock();
      A.playMusic('title');
    });
    await page.click('button');
    await page.waitForTimeout(1700);
    check(!requests.length && !(await page.evaluate(()=>RWB.audio.playing)), 'Unlocked music neither fetches nor starts before the first visible scene frame');
    check(!(await page.evaluate(()=>RWB.audio.markFirstVisibleFrame('stale-scene'))), 'A stale frame callback cannot unlock the current scene music');
    await page.evaluate(()=>RWB.audio.markFirstVisibleFrame('title'));
    await page.waitForFunction(()=>RWB.audio.track?.playing,null,{timeout:30000});
    check(requests.length===1,'The visible-frame marker starts exactly one track fetch');
    const continuous=await page.evaluate(()=>{const A=RWB.audio,p=A.track.position;A.playMusic('stage1');return {playing:A.track.playing,position:A.track.position,prior:p,ready:A.mix.musicFrameReady};});
    check(continuous.playing&&!continuous.ready&&continuous.position>=continuous.prior,'The shared music stays continuous across scene changes');
    await page.evaluate(()=>{const A=RWB.audio;A.markFirstVisibleFrame('stage1');A.stopMusic();A.playMusic('stage2');});
    check(!(await page.evaluate(()=>RWB.audio.playing)),'A stopped track cannot restart in a new scene before its visible frame');
    await page.evaluate(()=>RWB.audio.markFirstVisibleFrame('stage2'));
    await page.waitForFunction(()=>RWB.audio.track?.playing);
    check(requests.length===1,'A later scene resumes the decoded track without a duplicate download');
    await page.evaluate(async()=>{const A=RWB.audio;for(const id of ['st1_narrator_01','riley_super_01','riley_fire_01'])await A.loadClip(id,'/assets/audio/voice/'+id+'.mp3',{minDuration:.25});A.trace.length=0;A.playClip('st1_narrator_01',{voice:true});});
    await page.waitForTimeout(150);
    let mix=await page.evaluate(()=>RWB.audio.mix);
    check(Math.abs(mix.speechDuck-.42)<.01,'Speech applies the 42% music envelope');
    await page.evaluate(()=>RWB.audio.sfx.impact());
    await page.waitForTimeout(900);
    const during=await page.evaluate(()=>({mix:RWB.audio.mix,voice:RWB.audio.voicePlaying}));
    check(during.voice==='st1_narrator_01'&&Math.abs(during.mix.speechDuck-.42)<.01&&during.mix.effectsDuck>.99,'A short deep impact releases independently while the full sentence remains ducked');
    const swap=await page.evaluate(()=>{const A=RWB.audio;A.playClip('riley_super_01',{voice:true});return A.trace.filter(t=>/^clip/.test(t.name));});
    const oldStop=swap.findIndex(t=>t.name==='clip-stop:st1_narrator_01'),newStart=swap.findIndex(t=>t.name==='clip:riley_super_01');
    check(oldStop>=0&&newStart>oldStop,'Replacing a bark stops the old voice before starting the new one');
    await page.waitForFunction(()=>!RWB.audio.voicePlaying);
    await page.waitForTimeout(550);
    mix=await page.evaluate(()=>RWB.audio.mix);
    check(mix.speechDuck>.99,'Music recovers after the final decoded voice and its release');
    await page.evaluate(()=>{const A=RWB.audio;A.clearVoices();A.trace.length=0;A.queueVoice('riley_super_01','/assets/audio/voice/riley_super_01.mp3');A.queueVoice('riley_fire_01','/assets/audio/voice/riley_fire_01.mp3');});
    await page.waitForFunction(()=>!RWB.audio.voicePending,null,{timeout:15000});
    const seq=await page.evaluate(()=>RWB.audio.trace.filter(t=>/^clip/.test(t.name)));
    const starts=seq.filter(t=>t.name.startsWith('clip:'));
    check(starts.length===2&&starts[1].t>=starts[0].t+starts[0].duration-.025&&!seq.some(t=>t.name.startsWith('clip-stop:')),'Queued protected voices play in full and never overlap');
    await page.evaluate(()=>{const A=RWB.audio;A.playClip('st1_narrator_01',{voice:true});A.clearVoices();});
    await page.waitForTimeout(200);
    check((await page.evaluate(()=>RWB.audio.mix.speechDuck))>.99,'Explicit scene skip releases speech ducking without a silent long hold');
    await page.goto(origin+'/docs/review/audio-v11/auditions.html');
    const inventory=await page.evaluate(()=>({audio:document.querySelectorAll('audio').length,pending:[...document.querySelectorAll('select')].every(s=>s.value==='pending')}));
    check(inventory.audio===80&&inventory.pending,'All 80 shipped lines have an audition player and no invented listening verdict');
    await page.click('#stop'); // explicit trusted gesture in this new document
    await page.evaluate(()=>document.querySelectorAll('audio')[0].play());
    await page.evaluate(()=>document.querySelectorAll('audio')[1].play());
    check(await page.evaluate(()=>[...document.querySelectorAll('audio')].filter(a=>!a.paused).length===1),'Audition players enforce one voice at a time');
    check(errors.length===0,'No browser script errors');
    console.log(passed+' audio mix / audition checks passed.');
  } finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
