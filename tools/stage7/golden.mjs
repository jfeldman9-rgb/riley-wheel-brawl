import {stage1Simulation,withSeed,FULL_STAGE_SEEDS} from '../../tests/helpers/stage1-simulation.mjs';
import {patch} from '../../tests/helpers/stage3-harness.mjs';
import {q} from '../../src/config.js';
import {createHash} from 'node:crypto';
export function goldenCampaign(){
  const rows=[],story=q.get('story');q.set('story','0');
  try{for(let stage=1;stage<=6;stage++)for(const seed of FULL_STAGE_SEEDS)withSeed(seed,()=>{
    const h=stage1Simulation({stage});patch(h.s);
    try{let f=0;for(;f<60*420&&!h.s.ended&&!h.s.gameOver;f++)h.step();const s=h.s;
      const row={stage,seed,frames:f,ended:s.ended,gameOver:s.gameOver,hp:s.riley.hp,score:s.riley.score,lives:s.riley.lives,spawns:h.observations.spawns.map(e=>[e.type,e.side,e.zone,e.wave,e.at]),deaths:h.observations.deaths.map(e=>[e.type,e.at])};
      rows.push({stage,seed,sha256:createHash('sha256').update(JSON.stringify(row)).digest('hex')});
    }finally{h.destroy();}
  });return rows;}finally{story===null?q.delete('story'):q.set('story',story);}
}
