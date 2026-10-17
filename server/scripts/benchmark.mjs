// Bounded synthetic benchmark. Never loads .env or connects to Atlas.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { createApp } from '../dist/app.js';
import { User } from '../dist/models/User.js';
import { Restaurant } from '../dist/models/Restaurant.js';
import { Booking } from '../dist/models/Booking.js';
process.env.NODE_ENV='test';
process.env.JWT_SECRET=randomBytes(48).toString('hex');
let replica, server;
try {
  replica=await MongoMemoryReplSet.create({replSet:{count:1},binary:{version:'7.0.14'}});
  process.env.MONGODB_URI=replica.getUri('quickdine_benchmark');
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(),Restaurant.init(),Booking.init()]);
  const owner=await User.create({name:'Synthetic owner',email:'benchmark@example.test',password:'not-a-login-password',role:'owner'});
  const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const restaurants=await Restaurant.insertMany(Array.from({length:100},(_,i)=>({name:`Synthetic ${i}`,slug:`synthetic-${i}`,description:'Synthetic benchmark only',cuisine:i%2?'Italian':'Indian',priceRange:'$$',location:'Sylhet',address:'Synthetic address',chef:'Synthetic chef',owner:owner._id,status:'approved',totalSeats:40,availableSlots:['18:00','19:00']})));
  await Booking.insertMany(restaurants.flatMap((r,i)=>Array.from({length:10},(_,j)=>({user:owner._id,restaurant:r._id,date,time:j<5?'18:00':'19:00',guests:2,status:j%3===0?'cancelled':'confirmed',bookingId:`BENCH-${i}-${j}`}))));
  server=createApp().listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  let correct=0;
  for(const r of restaurants) {
    const slots=await (await fetch(`${base}/api/restaurants/${r.id}/availability?date=${date}`)).json();
    const sums=await Booking.aggregate([{$match:{restaurant:r._id,date:new Date(date),status:'confirmed'}},{$group:{_id:'$time',guests:{$sum:'$guests'}}}]);
    for(const slot of slots) if(slot.availableSeats===40-(sums.find(s=>s._id===slot.time)?.guests||0)) correct++;
  }
  const runs=[];
  for(const concurrency of [1,5,10,20]) for(let repeat=1;repeat<=3;repeat++) {
    let next=0,errors=0; const samples=[];
    const perform=async i=>{const path=i%2?`/api/restaurants?cuisine=Italian`:`/api/restaurants/${restaurants[i%100].id}/availability?date=${date}`;const begin=performance.now();const response=await fetch(base+path);await response.arrayBuffer();if(!response.ok)errors++;return performance.now()-begin;};
    for(let i=0;i<20;i++)await perform(i);
    errors=0;const start=performance.now();
    await Promise.all(Array.from({length:concurrency},async()=>{while(next<200){const i=next++;samples.push(await perform(i));}}));
    const seconds=(performance.now()-start)/1000;samples.sort((a,b)=>a-b);
    const p=q=>Number(samples[Math.ceil(q*samples.length)-1].toFixed(2));
    runs.push({concurrency,repeat,requests:samples.length,errors,seconds:Number(seconds.toFixed(3)),requestsPerSecond:Number((samples.length/seconds).toFixed(2)),p50Ms:p(.5),p95Ms:p(.95),p99Ms:p(.99)});
  }
  const result={capturedAt:new Date().toISOString(),environment:{os:process.platform,node:process.version,cpu:cpus()[0].model,logicalCpus:cpus().length,memoryGiB:Number((totalmem()/1024**3).toFixed(1)),database:'Temporary local MongoDB 7.0.14 replica set'},scope:'Synthetic short local HTTP benchmark; not live performance, not the planned five-minute staging experiment',dataset:{users:1,restaurants:100,bookings:1000},capacity:{comparedSlots:200,correctSlots:correct,accuracyPercent:correct/2,oracle:'Independent MongoDB aggregation of confirmed guest totals'},method:{warmupRequestsPerRun:20,measuredRequestsPerRun:200,repeats:3,mix:'50% cuisine listing, 50% availability; closed-loop workers; response body consumed'},runs};
  mkdirSync('../docs/evidence/evaluation',{recursive:true});writeFileSync('../docs/evidence/evaluation/local-benchmark.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(correct!==200||runs.some(r=>r.errors))process.exitCode=1;
} finally {if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();if(replica)await replica.stop();}
