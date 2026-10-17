import { beforeAll, afterAll, beforeEach, describe, test, expect } from "@jest/globals";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { createApp } from "../dist/app.js";
import { User } from "../dist/models/User.js";
import { Restaurant } from "../dist/models/Restaurant.js";
import { Booking } from "../dist/models/Booking.js";
import { AuthSession } from "../dist/models/AuthSession.js";
import { bookingDate, slot, today } from "../dist/lib/validation.js";
import { cookieOptions, secret } from "../dist/lib/session.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";
process.env.FRONTEND_ORIGINS = "http://localhost:5173";
let repl, app, diner, owner, admin, restaurant, hashed;
const contact = {name:"Booking Guest", email:"guest@example.test", phone:"+8801712345678"};
const date = () => today(new Date(Date.now() + 86400000));
const profile = { name:"Test Table", description:"Test restaurant", cuisine:"Italian", priceRange:"$$", location:"Sylhet", address:"Test address", chef:"Test Chef", availableSlots:["18:00","19:00"], totalSeats:8 };
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet:{ count:1, storageEngine:"wiredTiger" }, binary:{ version:"7.0.14" } });
  process.env.MONGODB_URI = repl.getUri("quickdine_isolated_tests");
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Restaurant.init(), Booking.init(), AuthSession.init()]);
  hashed = await bcrypt.hash("Password123!", 10);
});
afterAll(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });
beforeEach(async () => {
  // This URI is created by this process; never read a developer/production .env.
  await Promise.all([User.deleteMany({}), Restaurant.deleteMany({}), Booking.deleteMany({}), AuthSession.deleteMany({})]);
  [diner, owner, admin] = await User.create([
    {name:"Diner",email:"diner@example.test",password:hashed,role:"user"},
    {name:"Owner",email:"owner@example.test",password:hashed,role:"owner"},
    {name:"Admin",email:"admin@example.test",password:hashed,role:"admin"},
  ]);
  restaurant = await Restaurant.create({...profile, slug:"test-table", owner:owner._id, status:"approved"});
  app = createApp();
});
async function client(user) {
  const agent = request.agent(app);
  const csrf = (await agent.get("/api/auth/csrf").expect(200)).body.csrfToken;
  let cookie;
  if (user) {
    const jti = randomUUID();
    await AuthSession.create({_id:jti,user:user._id,expiresAt:new Date(Date.now()+3600000)});
    cookie = `qd_session=${jwt.sign({}, process.env.JWT_SECRET, {subject:user.id,jwtid:jti,expiresIn:3600,issuer:"quickdine",audience:"quickdine-web"})}`;
  }
  return {agent, csrf, cookie, get:path => {const r=agent.get(path);return cookie?r.set("Cookie",cookie):r;}, send:(method,path,body) => {
    let r=agent[method](path).set("X-CSRF-Token",csrf).set("Origin","http://localhost:5173");
    if(cookie) r=r.set("Cookie",cookie);
    return r.send(body);
  }};
}
const payload = (overrides={}) => ({restaurantId:restaurant.id,date:date(),time:"18:00",guests:2,contact,...overrides});
const existing = overrides => Booking.create({user:diner._id,restaurant:restaurant._id,date:new Date(`${date()}T00:00:00Z`),time:"18:00",guests:2,status:"confirmed",...overrides});

describe("authentication and browser security", () => {
  test("health responses retain Helmet security headers", async () => {
    const response = await request(app).get("/health/live").expect(200);
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  test("registers with HttpOnly cookie, no token/password JSON, and cannot self-register admin", async () => {
    const c=await client();
    const r=await c.send("post","/api/auth/register",{name:"New User",email:" NEW@EXAMPLE.TEST ",password:"Password123!",role:"admin"}).expect(201);
    expect(r.body).toMatchObject({email:"new@example.test",role:"user"});
    expect(r.body.token).toBeUndefined();expect(r.body.password).toBeUndefined();
    expect(r.headers["set-cookie"].join(";")).toContain("HttpOnly");
    expect(r.headers["set-cookie"].join(";")).toContain("SameSite=Lax");
    await c.agent.get("/api/auth/me").expect(200);
  });
  test("login, current user, logout and copied-token revocation", async () => {
    const c=await client();
    const r=await c.send("post","/api/auth/login",{email:diner.email,password:"Password123!"}).expect(200);
    const cookie=r.headers["set-cookie"].filter(s=>s.startsWith("qd_session=")).at(-1).split(";")[0];
    await c.agent.get("/api/auth/me").expect(200);
    await c.send("post","/api/auth/logout",{}).expect(204);
    await request(app).get("/api/auth/me").set("Cookie",cookie).expect(401);
    await c.agent.get("/api/auth/me").expect(401);
  });
  test.each(["wrong password", "unknown email"])("rejects %s with generic message", async kind => {
    const c=await client();
    const r=await c.send("post","/api/auth/login",{email:kind==="unknown email"?"missing@example.test":diner.email,password:"WrongPassword"}).expect(401);
    expect(r.body.message).toBe("Invalid email or password");
  });
  test("duplicate registration and malformed registration rejected", async () => {
    const c=await client();
    await c.send("post","/api/auth/register",{name:"Another",email:diner.email,password:"Password123!"}).expect(409);
    for (const body of [{}, {name:"A",email:"bad",password:"Password123!"},{name:"A",email:"a@b.test",password:"short"},{name:"A",email:"a@b.test",password:"Password123!",phone:"abc"}]) await c.send("post","/api/auth/register",body).expect(400);
  });
  test("missing, tampered and expired cookies and Bearer-only credentials rejected", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").set("Cookie","qd_session=invalid").expect(401);
    const expired=jwt.sign({},process.env.JWT_SECRET,{subject:diner.id,jwtid:"old",expiresIn:-1,issuer:"quickdine",audience:"quickdine-web"});
    await request(app).get("/api/auth/me").set("Cookie",`qd_session=${expired}`).expect(401);
    await request(app).get("/api/auth/me").set("Authorization",`Bearer ${expired}`).expect(401);
  });
  test("deleted users and expired server sessions rejected", async () => {
    const c=await client(diner);await User.deleteOne({_id:diner._id});await c.get("/api/auth/me").expect(401);
    const o=await client(owner);await AuthSession.updateMany({},{$set:{expiresAt:new Date(0)}});await o.get("/api/auth/me").expect(401);
  });
  test("blocks absent, forged CSRF and foreign origins including login", async () => {
    await request(app).post("/api/auth/login").send({}).expect(403);
    const c=await client();
    await c.agent.post("/api/auth/login").set("X-CSRF-Token","forged").send({}).expect(403);
    await c.agent.post("/api/auth/login").set("X-CSRF-Token",c.csrf).set("Origin","https://evil.example").send({}).expect(403);
    expect((await c.agent.get("/api/auth/csrf")).body.csrfToken).toBe(c.csrf);
  });
  test("production cookies are Secure; secret required", () => {
    process.env.NODE_ENV="production";expect(cookieOptions()).toMatchObject({secure:true,httpOnly:true,sameSite:"lax",path:"/"});process.env.NODE_ENV="test";
    const key=process.env.JWT_SECRET;process.env.JWT_SECRET="short";expect(secret).toThrow();process.env.JWT_SECRET=key;
  });
  test("role guards, private response caching, health and unknown routes", async () => {
    const c=await client(diner);await c.get("/api/admin/stats").expect(403);await c.get("/api/owner/bookings").expect(403);
    expect((await c.get("/api/auth/me")).headers["cache-control"]).toBe("no-store");
    await request(app).get("/").expect(200);await request(app).get("/health/live").expect(200);await request(app).get("/health/ready").expect(200);await request(app).get("/missing").expect(404);
  });
});

describe("cuisine filtering and restaurant visibility", () => {
  test("case-insensitive multi-cuisine filter combines with search/location/price/rating/sort", async () => {
    await Restaurant.create({...profile,name:"Japanese",slug:"japanese",cuisine:"Japanese",owner:owner._id,status:"approved",priceRange:"$$$"});
    await Restaurant.create({...profile,slug:"pending",owner:owner._id,status:"pending"});
    const r=await request(app).get("/api/restaurants?cuisine=italian&cuisine=Japanese").expect(200);expect(r.body).toHaveLength(2);
    const filtered=await request(app).get("/api/restaurants?cuisine=ITALIAN&location=Sylhet&search=Test&priceRange=%24%24&rating=4&sort=rating").expect(200);expect(filtered.body).toHaveLength(1);
    for(const sort of ["price_low","price_high"]) await request(app).get(`/api/restaurants?sort=${sort}`).expect(200);
    expect((await request(app).get("/api/restaurants?cuisine=French")).body).toEqual([]);
    expect((await request(app).get("/api/restaurants?cuisine=.*")).body).toEqual([]);
  });
  test.each(["cuisine=", "priceRange=bad", "rating=no", "rating=6", "sort=bad", "search=", "location="])("rejects invalid filter %s", async query => {await request(app).get(`/api/restaurants?${query}`).expect(400);});
  test("featured and slug exclude pending publicly but allow owning user/admin cookie", async () => {
    restaurant.status="pending";restaurant.featured=true;await restaurant.save();
    expect((await request(app).get("/api/restaurants/featured")).body).toEqual([]);
    await request(app).get("/api/restaurants/test-table").expect(404);
    await request(app).get(`/api/restaurants/${restaurant.id}/availability?date=${date()}`).expect(404);
    const o=await client(owner);await o.get("/api/restaurants/test-table").expect(200);
    const a=await client(admin);await a.get("/api/restaurants/test-table").expect(200);
    const c=await client(diner);await c.get("/api/restaurants/test-table").expect(404);
    await request(app).get("/api/restaurants/missing").expect(404);
  });
});

describe("booking correctness and persistence", () => {
  test("persists edited contact snapshot without changing user; legacy contacts remain absent", async () => {
    const c=await client(diner);
    const r=await c.send("post","/api/bookings",payload({contact:{name:" Guest ",email:" GUEST@EXAMPLE.TEST ",phone:"+880 1712345678"},occasion:"Birthday",specialRequests:" Window "})).expect(201);
    expect(r.body.contact).toEqual({...contact,name:"Guest"});expect(r.body.specialRequests).toBe("Window");
    await User.updateOne({_id:diner._id},{$set:{name:"Changed"}});
    const saved=await c.get("/api/bookings/my").expect(200);expect(saved.body[0].contact.name).toBe("Guest");
    expect((await User.findById(diner._id)).email).toBe(diner.email);
    await existing({time:"19:00"});expect((await c.get("/api/bookings/my")).body.some(b=>!b.contact)).toBe(true);
    const o=await client(owner);expect((await o.get("/api/owner/bookings")).body.some(b=>b.contact?.name==="Guest")).toBe(true);
  });
  test.each([0,-1,1.5,"2","abc",null,10001])("rejects invalid guest count %p", async guests => {
    const c=await client(diner);await c.send("post","/api/bookings",payload({guests})).expect(400);expect(await Booking.countDocuments()).toBe(0);
  });
  test.each(["2026-02-30","2020-01-01","bad","2099-01-01","2026-1-1"])("rejects date %s on creation and availability", async invalid => {
    const c=await client(diner);await c.send("post","/api/bookings",payload({date:invalid})).expect(400);
    await request(app).get(`/api/restaurants/${restaurant.id}/availability?date=${invalid}`).expect(400);
  });
  test("rejects invalid slot, contacts, occasion, requests and restaurant IDs", async () => {
    const c=await client(diner);
    for (const change of [{time:"25:00"},{time:"16:00"},{contact:undefined},{contact:{...contact,email:"bad"}},{contact:{...contact,phone:"abc"}},{occasion:"Invalid"},{specialRequests:123},{specialRequests:"x".repeat(1001)},{restaurantId:"bad"}]) await c.send("post","/api/bookings",payload(change)).expect(400);
    await c.send("post","/api/bookings",payload({restaurantId:new mongoose.Types.ObjectId().toString()})).expect(404);
  });
  test("date timezone boundary and elapsed same-day slot", () => {
    expect(today(new Date("2026-10-17T20:00:00Z"))).toBe("2026-10-18");
    expect(()=>bookingDate("2026-10-17",new Date("2026-10-17T20:00:00Z"))).toThrow();
    expect(()=>slot("00:00",["00:00"],new Date(`${today()}T00:00:00Z`))).toThrow();
  });
  test("confirmed-only capacity isolated by date and slot, exact fill and overfill", async () => {
    await existing({guests:3});await existing({guests:4,status:"cancelled"});await existing({guests:4,status:"completed"});await existing({guests:8,time:"19:00"});
    await existing({guests:8,date:new Date("2020-01-01")});
    const r=await request(app).get(`/api/restaurants/${restaurant.id}/availability?date=${date()}`).expect(200);
    expect(r.body).toEqual([{time:"18:00",availableSeats:5,isAvailable:true},{time:"19:00",availableSeats:0,isAvailable:false}]);
    const c=await client(diner);await c.send("post","/api/bookings",payload({guests:5})).expect(201);await c.send("post","/api/bookings",payload({guests:1})).expect(409);
  });
  test("simultaneous reservations cannot overbook", async () => {
    const c=await client(diner);
    const responses=await Promise.all(Array.from({length:8},()=>c.send("post","/api/bookings",payload({guests:2}))));
    expect(responses.filter(r=>r.status===201)).toHaveLength(4);expect(responses.filter(r=>r.status===409)).toHaveLength(4);
    const persisted=await Booking.find({status:"confirmed"});expect(persisted.reduce((sum,b)=>sum+b.guests,0)).toBe(8);
  });
  test("cancellation is idempotent, releases seats, and enforces ownership", async () => {
    const b=await existing({guests:8});const c=await client(diner),o=await client(owner);
    await o.send("put",`/api/bookings/${b.id}/cancel`,{}).expect(403);
    await c.send("put",`/api/bookings/${b.id}/cancel`,{}).expect(200);await c.send("put",`/api/bookings/${b.id}/cancel`,{}).expect(200);
    expect((await request(app).get(`/api/restaurants/${restaurant.id}/availability?date=${date()}`)).body[0].availableSeats).toBe(8);
    await c.send("put",`/api/bookings/${new mongoose.Types.ObjectId()}/cancel`,{}).expect(404);
  });
  test("owner transitions are terminal, reject cross-owner writes and restore capacity", async () => {
    const b=await existing({guests:8});const o=await client(owner);
    await o.send("put",`/api/owner/bookings/${b.id}/status`,{status:"confirmed"}).expect(200);
    await o.send("put",`/api/owner/bookings/${b.id}/status`,{status:"bad"}).expect(400);
    await o.send("put",`/api/owner/bookings/${b.id}/status`,{status:"completed"}).expect(200);
    await o.send("put",`/api/owner/bookings/${b.id}/status`,{status:"confirmed"}).expect(409);
    expect((await request(app).get(`/api/restaurants/${restaurant.id}/availability?date=${date()}`)).body[0].availableSeats).toBe(8);
    const other=await User.create({name:"Other",email:"other@example.test",password:hashed,role:"owner"});const x=await client(other);
    await x.send("put",`/api/owner/bookings/${b.id}/status`,{status:"cancelled"}).expect(403);
  });
});

describe("owner/admin lifecycle and capacity edits", () => {
  test("pending -> approved -> rejected -> approved with correct visibility and permissions", async () => {
    await Restaurant.deleteMany({});const o=await client(owner),a=await client(admin),c=await client(diner);
    expect((await o.get("/api/owner/restaurant")).body).toBeNull();await o.get("/api/owner/bookings").expect(404);
    const r=await o.send("post","/api/owner/restaurant",profile).expect(201);expect(r.body.status).toBe("pending");
    await o.send("post","/api/owner/restaurant",profile).expect(409);
    await c.send("put",`/api/admin/restaurants/${r.body._id}/approve`,{status:"approved"}).expect(403);
    await c.send("post","/api/bookings",payload({restaurantId:r.body._id})).expect(409);
    for(const status of ["approved","rejected","pending","approved"]) {
      await a.send("put",`/api/admin/restaurants/${r.body._id}/approve`,{status}).expect(200);
      expect((await request(app).get("/api/restaurants")).body).toHaveLength(status==="approved"?1:0);
    }
    await a.send("put",`/api/admin/restaurants/${r.body._id}/approve`,{status:"bad"}).expect(400);
    await a.get("/api/admin/restaurants").expect(200);expect((await a.get("/api/admin/stats")).body.restaurants.total).toBe(1);
  });
  test("profile updates validate capacity and protect confirmed bookings/slots", async () => {
    const o=await client(owner);await existing({guests:6});
    await o.send("put","/api/owner/restaurant",{totalSeats:5}).expect(409);
    await o.send("put","/api/owner/restaurant",{availableSlots:["19:00"]}).expect(409);
    await o.send("put","/api/owner/restaurant",{totalSeats:0}).expect(400);
    await o.send("put","/api/owner/restaurant",{availableSlots:["25:00"]}).expect(400);
    const r=await o.send("put","/api/owner/restaurant",{name:"Updated",totalSeats:"10",tags:"Fine, Dining",availableSlots:"18:00,19:00,20:00"}).expect(200);
    expect(r.body).toMatchObject({name:"Updated",totalSeats:10,tags:["Fine","Dining"]});
    await o.send("put","/api/owner/restaurant",{tags:123}).expect(400);
    await o.send("put","/api/owner/restaurant",{priceRange:"bad"}).expect(400);
  });
  test("concurrent capacity reduction and reservation preserve invariant", async () => {
    const o=await client(owner),c=await client(diner);
    const results=await Promise.all([o.send("put","/api/owner/restaurant",{totalSeats:3}),c.send("post","/api/bookings",payload({guests:6}))]);
    expect(results.every(r=>[200,201,409].includes(r.status))).toBe(true);
    const current=await Restaurant.findById(restaurant._id);const bookings=await Booking.find({status:"confirmed"});
    expect(bookings.reduce((s,b)=>s+b.guests,0)).toBeLessThanOrEqual(current.totalSeats);
  });
});
