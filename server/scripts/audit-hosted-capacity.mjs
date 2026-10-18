// Read-only Atlas audit and hosted capacity comparison. Export aggregates only.
// Supply MONGODB_URI in environment; never writes to MongoDB or exports contacts.
import mongoose from 'mongoose';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv.find(a=>a.startsWith('--output='))?.slice('--output='.length)||`../docs/evidence/evaluation/atlas-capacity-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
if(existsSync(output))throw new Error('Refusing to overwrite evidence; choose a fresh --output path');
const qa=/qa verification|quickdine smoke|synthetic|test fixture/i;
const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const startDay=day(new Date()), tomorrow=day(new Date(Date.now()+86400000));
const key=r=>createHash('sha256').update(r.toString()).digest('hex').slice(0,12);
const counts=(rows,field)=>Object.fromEntries([...new Set(rows.map(r=>r[field]))].sort().map(value=>[value,rows.filter(r=>r[field]===value).length]));
const range=rows=>{const times=rows.map(r=>r.createdAt).filter(Boolean).map(d=>new Date(d).getTime());return times.length?{first:new Date(Math.min(...times)).toISOString(),last:new Date(Math.max(...times)).toISOString()}:null;};
try {
  if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(process.env.MONGODB_URI,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:15000});
  const db=mongoose.connection.db;
  const [users,restaurants,bookings]=await Promise.all([
    db.collection('users').find({}, {projection:{name:1,email:1,role:1,createdAt:1}}).toArray(),
    db.collection('restaurants').find({}, {projection:{name:1,status:1,totalSeats:1,availableSlots:1,createdAt:1}}).toArray(),
    db.collection('bookings').find({}, {projection:{restaurant:1,user:1,date:1,time:1,guests:1,status:1,createdAt:1,'contact.name':1,specialRequests:1}}).toArray(),
  ]);
  const qaUsers=new Set(users.filter(u=>qa.test(u.name||'')).map(u=>u._id.toString()));
  const qaRestaurants=new Set(restaurants.filter(r=>qa.test(r.name||'')).map(r=>r._id.toString()));
  const isQa=b=>qaUsers.has(b.user?.toString())||qaRestaurants.has(b.restaurant?.toString())||qa.test(b.contact?.name||'')||qa.test(b.specialRequests||'');
  const operationalBookings=bookings.filter(b=>!isQa(b));
  const operationalRestaurants=restaurants.filter(r=>!qaRestaurants.has(r._id.toString()));
  const operationalUsers=users.filter(u=>!qaUsers.has(u._id.toString()));
  const seedEmails=new Set([...readFileSync('seed.ts','utf8').matchAll(/\bemail:\s*"([^"]+)"/g)].map(m=>m[1].toLowerCase()));
  const seedUserIds=new Set(operationalUsers.filter(u=>seedEmails.has(String(u.email).toLowerCase())).map(u=>u._id.toString()));
  const confirmed=operationalBookings.filter(b=>b.status==='confirmed');
  // Independent database aggregation, rather than calling application helpers.
  const allocations=await db.collection('bookings').aggregate([
    {$match:{_id:{$in:confirmed.map(b=>b._id)},status:'confirmed'}},
    {$group:{_id:{restaurant:'$restaurant',date:'$date',time:'$time'},guests:{$sum:'$guests'},bookings:{$sum:1}}},
  ]).toArray();
  const historical=allocations.filter(a=>new Date(a._id.date).toISOString().slice(0,10)<startDay);
  const overcapacity=allocations.filter(a=>{
    const r=operationalRestaurants.find(r=>r._id.toString()===a._id.restaurant.toString());
    return !r||a.guests>r.totalSeats;
  });
  const approved=restaurants.filter(r=>r.status==='approved');
  const dates=new Set([startDay,tomorrow,...allocations.map(a=>new Date(a._id.date).toISOString().slice(0,10)).filter(d=>d>=startDay&&d<=day(new Date(Date.now()+90*86400000)))]);
  const comparisons=[];
  for(const r of approved) for(const date of dates) {
    const response=await fetch(`https://quickdine-api-d604.onrender.com/api/restaurants/${r._id}/availability?date=${date}`,{signal:AbortSignal.timeout(15000)});
    const slots=await response.json();
    if(!response.ok||!Array.isArray(slots)) throw new Error('Hosted availability read failed');
    for(const slot of slots) {
      // Include ALL allocations at this operational restaurant for the oracle:
      // QA bookings at real venues can consume capacity and must not be ignored.
      const allConfirmed=bookings.filter(b=>b.status==='confirmed'&&b.restaurant?.toString()===r._id.toString()&&new Date(b.date).toISOString().slice(0,10)===date&&b.time===slot.time);
      const expected=Math.max(0,r.totalSeats-allConfirmed.reduce((s,b)=>s+b.guests,0));
      comparisons.push({restaurantKey:key(r._id),syntheticFixture:qaRestaurants.has(r._id.toString()),date,time:slot.time,confirmedGuests:allConfirmed.reduce((s,b)=>s+b.guests,0),expectedAvailableSeats:expected,actualAvailableSeats:slot.availableSeats,match:expected===slot.availableSeats});
    }
  }
  const operationalComparisons=comparisons.filter(c=>!c.syntheticFixture);
  const fixtureComparisons=comparisons.filter(c=>c.syntheticFixture);
  const result={capturedAt:new Date().toISOString(),source:'Existing deployed Atlas database, read-only queries; direct Render availability API',provenance:'User cannot establish seed/demo/genuine provenance. Operational records are NOT claimed to be genuine pilot participants.',
    exclusions:{rule:'Explicit QA/smoke/synthetic names or booking notes, and their referenced records; seed/demo records of unknown provenance remain labelled unknown',users:users.length-operationalUsers.length,restaurants:restaurants.length-operationalRestaurants.length,bookings:bookings.length-operationalBookings.length},
    databaseTotals:{users:users.length,restaurants:restaurants.length,bookings:bookings.length},
    qaCleanup:{restaurantStatuses:counts(restaurants.filter(r=>qaRestaurants.has(r._id.toString())),'status'),bookingStatuses:counts(bookings.filter(isQa),'status'),activeConfirmedBookings:bookings.filter(b=>isQa(b)&&b.status==='confirmed').length},
    operationalDataset:{users:operationalUsers.length,usersByRole:counts(operationalUsers,'role'),restaurants:operationalRestaurants.length,restaurantsByStatus:counts(operationalRestaurants,'status'),bookings:operationalBookings.length,bookingsByStatus:counts(operationalBookings,'status'),storedBookingCreationRange:range(operationalBookings),seedIdentityMatches:seedUserIds.size,bookingsLinkedToSeedIdentities:operationalBookings.filter(b=>seedUserIds.has(b.user?.toString())).length,seedIdentityMethod:'Exact email match to identities defined in committed seed.ts; only aggregate counts exported. Other records remain unknown, not verified genuine.'},
    historicalAudit:{confirmedSlotGroups:allocations.length,historicalConfirmedSlotGroups:historical.length,groupsOverCurrentCapacity:overcapacity.length,note:'Past dates are rejected by public availability validation; historical groups audited by independent database aggregation, not reported as live API comparisons'},
    liveCapacityComparison:{dates:[...dates],comparedSlots:operationalComparisons.length,matchingSlots:operationalComparisons.filter(c=>c.match).length,agreementPercent:operationalComparisons.length?Number((100*operationalComparisons.filter(c=>c.match).length/operationalComparisons.length).toFixed(2)):null,nonzeroConfirmedSlots:operationalComparisons.filter(c=>c.confirmedGuests>0).length,oracle:'Read-only persisted confirmed bookings, summed independently of the application; no code shared with its capacity service',comparisons:operationalComparisons},
    controlledQaFixtureComparison:{comparedSlots:fixtureComparisons.length,matchingSlots:fixtureComparisons.filter(c=>c.match).length,nonzeroConfirmedSlots:fixtureComparisons.filter(c=>c.confirmedGuests>0).length,comparisons:fixtureComparisons,note:'Synthetic deployed workflow experiment; excluded from operational dataset results'},
    limitations:['Small dataset with unverified seed/demo/genuine origin','Empty future slots can make agreement easier; nonzeroConfirmedSlots reported explicitly','Database snapshot and API requests are not one atomic snapshot; concurrent user changes could produce differences','No personal contacts or user identifiers exported','No records were created, updated, or deleted by this audit']};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({output,operationalDataset:result.operationalDataset,exclusions:result.exclusions,historicalAudit:result.historicalAudit,comparedSlots:operationalComparisons.length,matchingSlots:result.liveCapacityComparison.matchingSlots,nonzeroConfirmedSlots:result.liveCapacityComparison.nonzeroConfirmedSlots,controlledQa:{comparedSlots:fixtureComparisons.length,matchingSlots:result.controlledQaFixtureComparison.matchingSlots,nonzeroConfirmedSlots:result.controlledQaFixtureComparison.nonzeroConfirmedSlots}}));
  if(overcapacity.length||comparisons.some(c=>!c.match))process.exitCode=1;
  if(process.argv.includes('--require-cleanup')&&(result.qaCleanup.activeConfirmedBookings||restaurants.some(r=>qaRestaurants.has(r._id.toString())&&r.status==='approved')))process.exitCode=1;
} catch(error){ console.error('Read-only Atlas capacity audit failed: '+error.name+'. Connection details suppressed.');process.exitCode=1; }
finally {await mongoose.disconnect();}
