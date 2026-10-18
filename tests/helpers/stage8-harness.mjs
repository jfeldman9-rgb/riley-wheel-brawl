import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './stage1-simulation.mjs';
import { patch } from './stage3-harness.mjs';
import { q } from '../../src/config.js';
export { withSeed, FULL_STAGE_SEEDS };
export function stage8Simulation(opts={}) {
  const saved=new Map(['s7','s8','story','call8','nopower'].map(k=>[k,q.get(k)]));
  q.set('s7','1');q.set('s8','1');q.set('story','0');q.set('call8',opts.calls?'1':'0');
  const h=stage1Simulation({stage:8,mode:opts.mode??'1'});patch(h.s);
  if(opts.lag)h.s.bot.lag=opts.lag;
  const destroy=h.destroy.bind(h);h.destroy=()=>{try{destroy();}finally{for(const [k,v]of saved)v===null?q.delete(k):q.set(k,v);}};
  for(let i=0;i<180&&!h.s.started;i++)h.step();return h;
}
