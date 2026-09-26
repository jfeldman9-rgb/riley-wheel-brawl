/* Optional painted-art contract. Files may be added independently; missing files
   keep the procedural actors and layered backgrounds active. */
'use strict';
(function () {
  const atlas = name => ({ src: 'assets/art/atlas-' + name + '.webp', k: 0.25, f: {} });
  const names = ['riley','trolloc','trolloc-chieftain','darkfriend','fade','mashadar-cultist','draghkar','stone-guard','forsaken','turned-ashaman','taim','loial','twinkle-toes','props-pickups'];
  const data = {};
  for (const name of names) data[name] = atlas(name);
  const files = [
    'title-riley-hero','logo-riley-hero','portrait-riley','portrait-riley-hud','portrait-moiraine','portrait-twinkle-toes','portrait-loial','portrait-taim',
    'stage1-emonds-field-far','stage1-emonds-field-mid','stage1-emonds-field-near','stage1-emonds-field-floor',
    'stage2-caemlyn-far','stage2-caemlyn-mid','stage2-caemlyn-near','stage2-caemlyn-floor',
    'stage3-shadar-logoth-far','stage3-shadar-logoth-mid','stage3-shadar-logoth-near','stage3-shadar-logoth-floor',
    'stage4-stone-of-tear-far','stage4-stone-of-tear-mid','stage4-stone-of-tear-near','stage4-stone-of-tear-floor',
    'stage5-black-tower-far','stage5-black-tower-mid','stage5-black-tower-near','stage5-black-tower-floor','stage5-taim-roof-far','stage5-taim-roof-mid','stage5-taim-roof-floor'
  ];
  data.plates = data.urn = Object.fromEntries(files.map(name => [name, { src: 'assets/art/' + name + '.webp' }]));
  RWB.ARTDATA = data;
})();
