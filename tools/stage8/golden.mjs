import {stage1Simulation,withSeed,FULL_STAGE_SEEDS} from '../../tests/helpers/stage1-simulation.mjs';
import {patch} from '../../tests/helpers/stage3-harness.mjs';
import {q} from '../../src/config.js';
import {createHash} from 'node:crypto';
export function goldenCampaign(){
  const rows=[],story=q.get('story'),s7=q.get('s7');q.set('story','0');q.set('s7','1');
  try{for(let stage=1;stage<=7;stage++)for(const seed of FULL_STAGE_SEEDS)withSeed(seed,()=>{
    const h=stage1Simulation({stage});patch(h.s);
    try{let f=0;for(;f<60*420&&!h.s.ended&&!h.s.gameOver;f++)h.step();const s=h.s;
      const row={stage,seed,frames:f,ended:s.ended,gameOver:s.gameOver,hp:s.riley.hp,score:s.riley.score,lives:s.riley.lives,spawns:h.observations.spawns.map(e=>[e.type,e.side,e.zone,e.wave,e.at]),deaths:h.observations.deaths.map(e=>[e.type,e.at])};
      rows.push({stage,seed,sha256:createHash('sha256').update(JSON.stringify(row)).digest('hex')});
    }finally{h.destroy();}
  });return rows;}finally{s7===null?q.delete('s7'):q.set('s7',s7);story===null?q.delete('story'):q.set('story',story);}
}
