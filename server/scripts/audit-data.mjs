// Read-only aggregate audit. No personal fields, tokens or URI are exported.
import "dotenv/config";
import mongoose from "mongoose";
import { mkdirSync, writeFileSync } from "node:fs";
const output = "../docs/evidence/evaluation/database-summary.json";
try {
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex:false, autoCreate:false, serverSelectionTimeoutMS:10000 });
  const db = mongoose.connection.db;
  const group = async (collection, field) => db.collection(collection).aggregate([{ $group:{ _id:`$${field}`, count:{$sum:1} } }, {$sort:{_id:1}}]).toArray();
  const [usersByRole, restaurantsByStatus, bookingsByStatus, bookingDates, overcapacity] = await Promise.all([
    group("users","role"), group("restaurants","status"), group("bookings","status"),
    db.collection("bookings").aggregate([{$group:{_id:null,first:{$min:"$createdAt"},last:{$max:"$createdAt"}}},{$project:{_id:0}}]).toArray(),
    db.collection("bookings").aggregate([
      {$match:{status:"confirmed"}},{$group:{_id:{restaurant:"$restaurant",date:"$date",time:"$time"},guests:{$sum:"$guests"}}},
      {$lookup:{from:"restaurants",localField:"_id.restaurant",foreignField:"_id",as:"restaurant"}},{$unwind:"$restaurant"},
      {$match:{$expr:{$gt:["$guests","$restaurant.totalSeats"]}}},{$count:"slots"},
    ]).toArray(),
  ]);
  const result={capturedAt:new Date().toISOString(),source:"Existing configured Atlas database (read only)",provenance:"Existing records; genuine pilot vs seed/demo provenance is not established by this audit",usersByRole,restaurantsByStatus,bookingsByStatus,bookingDates,confirmedSlotsExceedingCurrentCapacity:overcapacity[0]?.slots||0};
  mkdirSync("../docs/evidence/evaluation",{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));
} catch(error) { console.error(`Read-only audit failed: ${error.name}. No credentials or connection string logged.`);process.exitCode=1; }
finally { await mongoose.disconnect(); }
