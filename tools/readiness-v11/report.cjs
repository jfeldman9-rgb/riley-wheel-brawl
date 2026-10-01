'use strict';
// Reporting-only helper. It never loads or changes product/test code.
function failureText(row,log){
 const lines=String(log||'').trim().split(/\r?\n/),at=lines.findIndex(line=>/AssertionError|ERR_ASSERTION|(?:Syntax|Type|Reference)?Error:/.test(line));
 const header='READINESS_FAILED '+JSON.stringify({name:row.name,exitCode:row.exitCode,signal:row.signal,error:row.error,log:row.log});
 if(!log)return header+'\n<no child output; inspect exit code/signal>';
 const sections=[];
 if(lines.length<=100)sections.push(lines.join('\n'));
 else{const begin=at>=0?Math.max(0,at-2):0;sections.push(lines.slice(begin,begin+40).join('\n'),'... remaining log omitted; full log preserved ...',lines.slice(-50).join('\n'));}
 return header+'\n'+sections.join('\n').slice(0,16000);
}
module.exports={failureText};
if(require.main===module){
 const assert=require('node:assert/strict'),row={name:'fixture',exitCode:1,signal:null,error:null,log:'fixture.log'};
 const long=[...Array(110).fill('prefix'),'AssertionError: exact pixels differ',...Array(150).fill('details'),'last diagnostic'].join('\n');
 const text=failureText(row,long);assert.ok(text.includes('READINESS_FAILED'));assert.ok(text.includes('AssertionError: exact pixels differ'));assert.ok(text.includes('last diagnostic'));assert.ok(text.length<17000);
 assert.ok(failureText({...row,exitCode:null,signal:'SIGKILL'},'').includes('SIGKILL'));assert.ok(failureText(row,'Error: short').includes('Error: short'));
 console.log('PASS readiness failure-report formatting: assertion context, tail, bounded size and empty SIGKILL output');
}
