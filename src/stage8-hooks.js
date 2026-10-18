// Identity-preserving instance hooks, owned by this kit only.
export function hook8(k,o,key,wrap){const old=o?.[key];if(typeof old!=='function')return;
 const own=Object.prototype.hasOwnProperty.call(o,key),fn=wrap(old);o[key]=fn;
 k.cleanups.push(()=>{if(o[key]!==fn)return;if(own)o[key]=old;else delete o[key];});
}
export function releaseHolds8(s){s.riley?.grabbedBy?.releaseHold?.('break');for(const e of s.enemies||[])e.releaseHold?.('break');}
