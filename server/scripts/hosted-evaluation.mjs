// Read-only hosted workload. Never sends credentials or creates bookings.
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { cpus, totalmem } from 'node:os';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [key, ...rest] = a.replace(/^--/, '').split('='); return [key, rest.join('=')];
}));
const duration = Number(args['duration-seconds'] || 300);
const levels = (args.levels || '1,3,5').split(',').map(Number);
if (!Number.isInteger(duration) || duration < 2 || duration > 300 || levels.some(n => !Number.isInteger(n) || n < 1 || n > 5)) throw new Error('Use 2–300 seconds and concurrency levels 1–5');
const output = resolve(args.output || `../docs/evidence/evaluation/hosted-load-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
if(!output.endsWith('.json')) throw new Error('Output must end with .json');
const raw = output.replace(/\.json$/, '.jsonl');
if(existsSync(output)||existsSync(raw)) throw new Error('Refusing to overwrite evidence; choose a fresh --output path');
mkdirSync(dirname(output), { recursive: true });
const bases = [
  { name:'vercel-proxy', url:'https://quick-dine-jade.vercel.app/api' },
  { name:'direct-render', url:'https://quickdine-api-d604.onrender.com/api' },
];
let sequence = 0, consecutiveFailures = 0, stop = false;
let lastHeartbeat=performance.now(), maxEventLoopGapMs=0;
const heartbeat=setInterval(()=>{
  const now=performance.now(), gap=now-lastHeartbeat;
  maxEventLoopGapMs=Math.max(maxEventLoopGapMs,gap);
  lastHeartbeat=now;
  if(gap>10000) stop=true;
},1000);
heartbeat.unref();
const result = {
  startedAt:new Date().toISOString(), finishedAt:null, completed:false,
  commit:execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(),
  environment:{ os:process.platform, node:process.version, cpu:cpus()[0].model, memoryGiB:Number((totalmem()/1024**3).toFixed(1)), clientLocation:'User Windows computer in Asia/Dhaka; WAN measurements' },
  dataset:{ source:'Public approved records currently served by deployed Atlas-backed API', provenance:'Unknown seed/demo/genuine mixture; not evidence of genuine customer adoption' },
  method:{ durationSecondsPerLevel:duration, concurrencyLevels:levels, repeatsPerLevel:1, warmupRequestsPerLevel:10, perWorkerMaximumRequestsPerSecond:1, globalMaximumWorkers:5, requestTimeoutMs:10000, mix:'50% cuisine listing, 50% availability; alternating Vercel proxy/direct Render; full response body consumed', workload:'Paced closed-loop read-only workload; not maximum sustainable capacity or a write-contention test', failureStop:'10 consecutive failures or >10% failures after at least 20 measured requests', warmup:'Warm-up latency excluded from measured percentiles; raw warm-up samples retained' },
  limitations:['Existing record provenance unknown', 'Only one run per load level', 'Small dataset', 'Client/network latency included', 'No maximum-capacity or write-load claim', 'Not a genuine-user pilot'],
  runs:[],
};
writeFileSync(raw, '');
const persist = () => writeFileSync(output, JSON.stringify(result,null,2)+'\n');
const summarize = samples => {
  const sorted = samples.map(s=>s.latencyMs).sort((a,b)=>a-b);
  const p = q => sorted.length ? sorted[Math.max(0,Math.ceil(q*sorted.length)-1)] : null;
  return { requests:samples.length, errors:samples.filter(s=>!s.ok).length, p50Ms:p(.5), p95Ms:p(.95), p99Ms:p(.99), maxMs:sorted.at(-1)??null };
};
let restaurants;
async function request(phase, concurrency, warmup=false) {
  const index = sequence++;
  const base = bases[index % 2];
  const restaurant = restaurants[index % restaurants.length];
  const listing = Math.floor(index / 2) % 2 === 0;
  const path = listing ? `/restaurants?cuisine=${encodeURIComponent(restaurant.cuisine)}` : `/restaurants/${restaurant._id}/availability?date=${result.date}`;
  const start = performance.now();
  const sample = { at:new Date().toISOString(), phase, concurrency, warmup, target:base.name, endpoint:listing?'cuisine-listing':'availability', status:null, ok:false };
  try {
    const response = await fetch(base.url+path, { signal:AbortSignal.timeout(10000), redirect:'error', headers:{'User-Agent':'QuickDine-authorized-evaluation/1.0','Accept':'application/json'} });
    const body = await response.text();
    sample.status=response.status;
    sample.bytes=Buffer.byteLength(body);
    sample.cacheControl=response.headers.get('cache-control');
    let data; try { data=JSON.parse(body); } catch { /* captured as schema failure */ }
    sample.ok=response.ok && Array.isArray(data) && (listing ? data.every(r=>r.status==='approved'&&String(r.cuisine).toLowerCase()===String(restaurant.cuisine).toLowerCase()) : data.length>0&&data.every(s=>typeof s.availableSeats==='number'&&s.availableSeats>=0));
    if (!sample.ok) sample.error=response.ok?'unexpected-response-schema':`http-${response.status}`;
  } catch(error) { sample.error=error.name; }
  sample.latencyMs=Number((performance.now()-start).toFixed(2));
  if(sample.latencyMs>20000) { sample.clientTimingInvalid=true; stop=true; }
  consecutiveFailures=sample.ok?0:consecutiveFailures+1;
  if(consecutiveFailures>=10) stop=true;
  appendFileSync(raw,JSON.stringify(sample)+'\n');
  return sample;
}
try {
  const discoveryStart=performance.now();
  const response=await fetch(bases[0].url+'/restaurants',{signal:AbortSignal.timeout(20000)});
  const listed=await response.json();
  if(!response.ok||!Array.isArray(listed)) throw new Error('Restaurant discovery failed');
  restaurants=listed.filter(r=>r.status==='approved'&&!/qa verification|smoke|synthetic|test fixture/i.test(r.name));
  if(!restaurants.length) throw new Error('No non-QA approved restaurant records');
  result.discovery={status:response.status,latencyMs:Number((performance.now()-discoveryStart).toFixed(2))};
  result.dataset.approvedRestaurants=restaurants.length;
  result.dataset.excludedQaRestaurants=listed.length-restaurants.length;
  result.date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
  persist();
  for(const concurrency of levels) {
    for(let i=0;i<10&&!stop;i++) await request(`c${concurrency}-warmup`,concurrency,true);
    if(stop) break;
    const samples=[],start=performance.now(),deadline=start+duration*1000;
    await Promise.all(Array.from({length:concurrency},async()=>{
      while(!stop&&performance.now()<deadline) {
        const begun=performance.now();
        samples.push(await request(`c${concurrency}`,concurrency));
        const failures=samples.filter(s=>!s.ok).length;
        if(samples.length>=20&&failures/samples.length>.1) stop=true;
        const rest=Math.min(1000-(performance.now()-begun),deadline-performance.now());
        if(rest>0) await delay(rest);
      }
    }));
    const seconds=(performance.now()-start)/1000;
    const timingValid=maxEventLoopGapMs<=10000&&seconds<=duration+15&&!samples.some(s=>s.clientTimingInvalid);
    const run={concurrency,timingValid,maxEventLoopGapMs:Number(maxEventLoopGapMs.toFixed(2)),seconds:Number(seconds.toFixed(3)),...summarize(samples),requestsPerSecond:Number((samples.length/seconds).toFixed(3)),byTarget:Object.fromEntries(bases.map(b=>[b.name,summarize(samples.filter(s=>s.target===b.name))])),byEndpoint:Object.fromEntries(['cuisine-listing','availability'].map(e=>[e,summarize(samples.filter(s=>s.endpoint===e))]))};
    result.runs.push(run); persist(); console.log(JSON.stringify(run));
    if(stop) break;
  }
  result.completed=!stop&&result.runs.length===levels.length&&result.runs.every(r=>r.timingValid);
  if(!result.completed) result.stopReason=maxEventLoopGapMs>10000?'Client timing interruption; do not interpret as server latency':'Failure/timing guard stopped workload';
} catch(error) { result.stopReason=error.name+': '+error.message; process.exitCode=1; }
finally { clearInterval(heartbeat); result.finishedAt=new Date().toISOString(); persist(); console.log(JSON.stringify({completed:result.completed,output,runs:result.runs.length})); }
if(!result.completed||result.runs.some(r=>r.errors)) process.exitCode=1;
