// Both actors and hazards are observed at the configured reaction delay.
export function perceive7(bot) {
  const s=bot.s,t=bot.t,th=s.kit.threats(),history=bot.stage7History||(bot.stage7History=[]);
  const copy=a=>a?{...a}:null;
  const row={t,enemies:(s.enemies||[]).filter(e=>e.alive&&!e.entering).map(e=>({type:e.type,alive:true,entering:false,T:e.T,state:e.state,x:e.x,y:e.y,st:e.st,hitI:e.hitI|0,hp:e.hp,phase:e.phase,canBeHit:e.canBeHit})),
    threats:{storm:copy(th.storm),ring:copy(th.ring),rain:copy(th.rain),shock:copy(th.shock),notes:th.notes.map(copy),bands:th.bands.map(copy),arrows:th.arrows.map(copy)}};
  history.push(row);
  while(history.length>1&&history[1].t<=t-bot.lag)history.shift();
  return history[0].t<=t-bot.lag?history[0]:{enemies:[],threats:{}};
}
