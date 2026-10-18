// Preserve the interrupted attempt; combine only complete accepted load phases.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const folder='../docs/evidence/evaluation/';
const read=name=>JSON.parse(readFileSync(folder+name,'utf8'));
const lines=name=>readFileSync(folder+name,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const original=read('hosted-load-interrupted-2026-10-18.json');
const repeat=read('hosted-c5-repeat-2026-10-18.json');
assert.equal(repeat.completed,true);
assert.equal(original.commit,repeat.commit);
assert.equal(original.dataset.approvedRestaurants,repeat.dataset.approvedRestaurants);
const runs=[...original.runs.filter(r=>[1,3].includes(r.concurrency)),...repeat.runs];
assert.deepEqual(runs.map(r=>r.concurrency),[1,3,5]);
const raw=[...lines('hosted-load-interrupted-2026-10-18.jsonl').filter(s=>s.concurrency!==5),...lines('hosted-c5-repeat-2026-10-18.jsonl')];
for(const run of runs){
  assert.ok(run.seconds>=300&&run.seconds<=315);
  const samples=raw.filter(s=>!s.warmup&&s.concurrency===run.concurrency);
  assert.equal(samples.length,run.requests);
  assert.equal(run.errors,samples.filter(s=>!s.ok).length);
  assert.ok(samples.every(s=>!s.clientTimingInvalid&&s.latencyMs<=20000));
  const sorted=samples.map(s=>s.latencyMs).sort((a,b)=>a-b);
  for(const [field,q] of [['p50Ms',.5],['p95Ms',.95],['p99Ms',.99]])assert.equal(run[field],sorted[Math.ceil(q*sorted.length)-1]);
}
const result={...original,finishedAt:repeat.finishedAt,completed:true,runs,
  sourceFiles:['hosted-load-interrupted-2026-10-18.json','hosted-c5-repeat-2026-10-18.json'],
  excludedAttempt:{concurrency:5,requests:original.runs.find(r=>r.concurrency===5).requests,errors:original.runs.find(r=>r.concurrency===5).errors,reason:'Original last phase had four hour-long failed requests despite 10-second timeouts. Entire phase excluded as client timing interruption, retained in source files; cause not independently diagnosed.'},
  measurementWindows:runs.map(r=>{const samples=raw.filter(s=>!s.warmup&&s.concurrency===r.concurrency);const starts=samples.map(s=>Date.parse(s.at));return{concurrency:r.concurrency,startedAt:new Date(Math.min(...starts)).toISOString(),lastRequestAt:new Date(Math.max(...starts)).toISOString(),seconds:r.seconds};}),
  limitations:[...original.limitations,'Accepted five-worker repeat occurred later than first two phases after a client interruption; network/host conditions may differ','Interrupted phase retained separately, not silently discarded'],
};
writeFileSync(folder+'hosted-load-2026-10-18.json',JSON.stringify(result,null,2)+'\n');
writeFileSync(folder+'hosted-load-2026-10-18.jsonl',raw.map(s=>JSON.stringify(s)).join('\n')+'\n');
console.log(JSON.stringify({acceptedPhases:3,measuredRequests:runs.reduce((s,r)=>s+r.requests,0),excludedAttempt:result.excludedAttempt}));
