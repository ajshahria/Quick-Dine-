import { isValidElement } from "react";
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AppContextProvider, useAppContext } from "../src/context/AppContext";
import BookingWidget from "../src/components/restaurant/BookingWidget";
import BookingConfirmation from "../src/pages/BookingConfirmation";
import Search from "../src/pages/Search";
import ProtectedRoute from "../src/components/ProtectedRoute";
import OwnerBookings from "../src/components/owner/OwnerBookings";
import { Toaster } from "react-hot-toast";
import api from "../src/lib/api";

api.defaults.baseURL="http://localhost/api";
api.defaults.adapter="fetch";
const user={_id:"u1",name:"Account Name",email:"account@example.test",phone:"01712345678",role:"user"};
const restaurant={_id:"r1",slug:"test-table",name:"Test Table",cuisine:"Italian",location:"Sylhet",address:"Test address",availableSlots:["18:00"],totalSeats:8,rating:5,reviewCount:0,priceRange:"$$",tags:[]};
let loggedIn=false;
const server=setupServer(
  http.get("http://localhost/api/auth/csrf",()=>HttpResponse.json({csrfToken:"test-csrf"})),
  http.get("http://localhost/api/auth/me",()=>loggedIn?HttpResponse.json(user):HttpResponse.json({message:"Sign in"},{status:401})),
  http.post("http://localhost/api/auth/login",({request})=>{
    if(request.headers.get("x-csrf-token")!=="test-csrf") return new HttpResponse(null,{status:403});
    loggedIn=true;return HttpResponse.json(user);
  }),
  http.post("http://localhost/api/auth/register",()=>{loggedIn=true;return HttpResponse.json(user,{status:201});}),
  http.post("http://localhost/api/auth/logout",()=>{loggedIn=false;return new HttpResponse(null,{status:204});}),
  http.get("http://localhost/api/restaurants/test-table",()=>HttpResponse.json(restaurant)),
  http.get("http://localhost/api/restaurants",()=>HttpResponse.json([restaurant])),
);
beforeAll(()=>server.listen({onUnhandledRequest:"error"}));
afterAll(()=>server.close());
afterEach(()=>{server.resetHandlers();loggedIn=false;vi.restoreAllMocks();});
function wrapper(children: React.ReactNode, path="/") {
  return render(<MemoryRouter initialEntries={[path]}><AppContextProvider>{!(isValidElement(children) && children.type === App) && <Toaster/>}{children}</AppContextProvider></MemoryRouter>);
}
function SessionPanel() {
  const {user,loading,login,register,logout}=useAppContext();
  return <><p>{loading?"Restoring":user?`Signed in: ${user.name}`:"Signed out"}</p>
    <button onClick={()=>login("account@example.test","Password123!")}>Test login</button>
    <button onClick={()=>register("New","new@example.test","Password123!")}>Test registration</button>
    <button onClick={()=>logout()}>Test logout</button></>;
}
describe("session flow",()=>{
  it("restores session from server and removes legacy JWT",async()=>{
    loggedIn=true;localStorage.setItem("token","old-token");wrapper(<SessionPanel/>);
    expect(await screen.findByText("Signed in: Account Name")).toBeInTheDocument();expect(localStorage.getItem("token")).toBeNull();
  });
  it("logs in with CSRF then logs out without storing a token",async()=>{
    wrapper(<SessionPanel/>);await screen.findByText("Signed out", {selector:"p"});
    await userEvent.click(screen.getByText("Test login"));await screen.findByText("Signed in: Account Name");
    expect(localStorage.getItem("token")).toBeNull();
    await userEvent.click(screen.getByText("Test logout"));await screen.findByText("Signed out", {selector:"p"});
  });
  it("registers and shows user",async()=>{
    wrapper(<SessionPanel/>);await screen.findByText("Signed out", {selector:"p"});await userEvent.click(screen.getByText("Test registration"));await screen.findByText("Signed in: Account Name");
  });
  it("displays login errors and remains signed out",async()=>{
    server.use(http.post("http://localhost/api/auth/login",()=>HttpResponse.json({message:"Invalid email or password"},{status:401})));
    wrapper(<SessionPanel/>);await screen.findByText("Signed out", {selector:"p"});await userEvent.click(screen.getByText("Test login"));await screen.findByText("Invalid email or password");expect(screen.getByText("Signed out")).toBeInTheDocument();
  });
  it("does not pretend logout succeeded on server failure",async()=>{
    loggedIn=true;server.use(http.post("http://localhost/api/auth/logout",()=>HttpResponse.json({message:"Try again"},{status:500})));
    wrapper(<SessionPanel/>);await screen.findByText("Signed in: Account Name");await userEvent.click(screen.getByText("Test logout"));await screen.findByText("Try again");expect(screen.getByText("Signed in: Account Name")).toBeInTheDocument();
  });
  it("protects unauthenticated and wrong-role routes",async()=>{
    const view=wrapper(<ProtectedRoute allowedRoles={["admin"]}><p>Secret admin panel</p></ProtectedRoute>);
    await screen.findByText("Login to continue");expect(screen.queryByText("Secret admin panel")).not.toBeInTheDocument();
    view.unmount();loggedIn=true;wrapper(<ProtectedRoute allowedRoles={["admin"]}><p>Secret admin panel</p></ProtectedRoute>);await screen.findByText("Access Denied");
  });
  it("allows authenticated role-appropriate access",async()=>{
    loggedIn=true;wrapper(<ProtectedRoute allowedRoles={["user"]}><p>Private bookings</p></ProtectedRoute>);await screen.findByText("Private bookings");
  });
});

const widgetProps=()=>({restaurant,selectedDate:"2026-10-20",setSelectedDate:vi.fn(),selectedGuests:"2",setSelectedGuests:vi.fn(),selectedSlot:"",setSelectedSlot:vi.fn(),slotsAvailability:[{time:"18:00",availableSeats:8,isAvailable:true},{time:"19:00",availableSeats:1,isAvailable:true},{time:"20:00",availableSeats:0,isAvailable:false}],loadingSlots:false,isAuthenticated:true,handleReserveClick:vi.fn()});
describe("availability widget",()=>{
  it("disables full/undersized slots and selects an available one",async()=>{
    const p=widgetProps();render(<BookingWidget {...p}/>);
    expect(screen.getByRole("button",{name:/19:00/})).toBeDisabled();expect(screen.getByRole("button",{name:/20:00/})).toBeDisabled();
    await userEvent.click(screen.getByRole("button",{name:/18:00/}));expect(p.setSelectedSlot).toHaveBeenCalledWith("18:00");
    expect(screen.getByText("RESERVE NOW")).toBeDisabled();
  });
  it("submits a valid selected slot",async()=>{
    const p=widgetProps();render(<BookingWidget {...p} selectedSlot="18:00"/>);await userEvent.click(screen.getByText("RESERVE NOW"));expect(p.handleReserveClick).toHaveBeenCalledOnce();
  });
  it("shows loading, failed and empty states without fabricating seats",()=>{
    const p=widgetProps();const view=render(<BookingWidget {...p} loadingSlots/>);expect(screen.getByRole("status")).toHaveTextContent("Loading");
    view.rerender(<BookingWidget {...p} availabilityError="API unavailable"/>);expect(screen.getByRole("alert")).toHaveTextContent("API unavailable");expect(screen.getByText("RESERVE NOW")).toBeDisabled();
    view.rerender(<BookingWidget {...p} slotsAvailability={[]}/>);expect(screen.getByText("No dining slots available.")).toBeInTheDocument();expect(screen.queryByText("8 seats")).not.toBeInTheDocument();
  });
  it("resets slot when guest count/date change and rejects fractional count",async()=>{
    const p=widgetProps();const view=render(<BookingWidget {...p}/>);
    await userEvent.clear(screen.getByLabelText("Party size"));await userEvent.type(screen.getByLabelText("Party size"),"3");expect(p.setSelectedSlot).toHaveBeenCalledWith("");
    view.rerender(<BookingWidget {...p} selectedGuests="1.5" selectedSlot="18:00"/>);expect(screen.getByText("RESERVE NOW")).toBeDisabled();
  });
  it("uses login action label for visitors",()=>{render(<BookingWidget {...widgetProps()} isAuthenticated={false}/>);expect(screen.getByText("LOGIN TO RESERVE")).toBeInTheDocument();});
});

describe("booking contact submission",()=>{
  it("sends edited contact details and shows persisted confirmation",async()=>{
    loggedIn=true;let body:Record<string,unknown>|undefined;
    server.use(http.post("http://localhost/api/bookings",async({request})=>{body=await request.json() as Record<string,unknown>;return HttpResponse.json({...body,_id:"b1",bookingId:"GR-TEST"},{status:201});}));
    wrapper(<Routes><Route path="/booking/:slug" element={<BookingConfirmation/>}/></Routes>,"/booking/test-table?date=2026-10-20&slot=18:00&guests=2");
    const name=await screen.findByLabelText("FULL NAME");await waitFor(()=>expect(name).toHaveValue(user.name));
    await userEvent.clear(name);await userEvent.type(name,"Booking Guest");
    const email=screen.getByLabelText("EMAIL ADDRESS");await userEvent.clear(email);await userEvent.type(email,"guest@example.test");
    await userEvent.click(screen.getByRole("button",{name:"BOOK TABLE"}));await screen.findByText("Reservation Confirmed");
    expect(body).toMatchObject({guests:2,contact:{name:"Booking Guest",email:"guest@example.test",phone:"01712345678"}});
    expect(screen.getByText(/Booking contact:/)).toHaveTextContent("Booking Guest");
  });
  it.each([401,409,500])("shows API %s and keeps editable form",async(status)=>{
    loggedIn=true;server.use(http.post("http://localhost/api/bookings",()=>HttpResponse.json({message:`Booking error ${status}`},{status})));
    wrapper(<Routes><Route path="/booking/:slug" element={<BookingConfirmation/>}/></Routes>,"/booking/test-table?date=2026-10-20&slot=18:00&guests=2");
    await screen.findByLabelText("FULL NAME");await waitFor(()=>expect(screen.getByLabelText("FULL NAME")).toHaveValue(user.name));
    await userEvent.click(screen.getByRole("button",{name:"BOOK TABLE"}));await screen.findByText(`Booking error ${status}`);expect(screen.getByRole("button",{name:"BOOK TABLE"})).toBeEnabled();
  });
});
describe("search and owner actions",()=>{
  it("sends cuisine URL filters to the API and displays results",async()=>{
    let query="";server.use(http.get("http://localhost/api/restaurants",({request})=>{query=new URL(request.url).search;return HttpResponse.json([restaurant]);}));
    wrapper(<Search/>,"/search?cuisine=Italian&cuisine=Japanese");await screen.findByText("Test Table");expect(query).toContain("cuisine=Italian");expect(query).toContain("cuisine=Japanese");
  });
  it("shows empty results",async()=>{
    server.use(http.get("http://localhost/api/restaurants",()=>HttpResponse.json([])));wrapper(<Search/>,"/search?cuisine=French");await screen.findByText(/No restaurants found/i);
  });
  it("shows booking-specific contacts and submits owner completion",async()=>{
    const setBookings=vi.fn();server.use(http.put("http://localhost/api/owner/bookings/b1/status",()=>HttpResponse.json({status:"completed"})));
    wrapper(<OwnerBookings totalSeats={8} setBookings={setBookings} bookings={[{_id:"b1",bookingId:"GR-TEST",status:"confirmed",guests:2,time:"18:00",date:"2026-10-20",contact:{name:"Guest",email:"guest@example.test",phone:"01712345678"},user:{name:"Old account name"}}]}/>);
    expect(screen.getByText("Guest")).toBeInTheDocument();expect(screen.getByText(/guest@example.test/)).toBeInTheDocument();
    await userEvent.click(screen.getByText("Complete"));await waitFor(()=>expect(setBookings).toHaveBeenCalled());
  });
});
import App from "../src/App";
import OwnerProfileDetails from "../src/components/owner/OwnerProfileDetails";
import RestaurantWizard from "../src/components/owner/RestaurantWizard";
const fullRestaurant={...restaurant,description:"A dining experience",chef:"Chef Test",image:"https://example.test/restaurant.jpg",owner:{name:"Owner",email:"owner@example.test"},status:"approved"};
const booked={_id:"b1",bookingId:"GR-DEMO",restaurant:fullRestaurant,user,date:"2099-10-20",time:"18:00",guests:2,status:"confirmed",contact:{name:"Guest",email:"guest@example.test",phone:"01712345678"}};
const stats={users:{totalUsers:5,totalOwners:2},restaurants:{total:3},bookings:{total:1},latestBookings:[booked]};
function asRole(role:string) {loggedIn=true;server.use(http.get("http://localhost/api/auth/me",()=>HttpResponse.json({...user,role})));}
function commonPages() {
  server.use(http.get("http://localhost/api/restaurants/featured",()=>HttpResponse.json([fullRestaurant])),http.get("http://localhost/api/bookings/my",()=>HttpResponse.json([booked])),http.get("http://localhost/api/owner/restaurant",()=>HttpResponse.json(fullRestaurant)),http.get("http://localhost/api/owner/bookings",()=>HttpResponse.json([booked])),http.get("http://localhost/api/admin/restaurants",()=>HttpResponse.json([{...fullRestaurant,status:"pending"}])),http.get("http://localhost/api/admin/stats",()=>HttpResponse.json(stats)));
}
describe("complete page journeys",()=>{
  it("home loads featured dining and searches by text",async()=>{
    commonPages();wrapper(<App/>);await screen.findByText("Test Table");
    await userEvent.type(screen.getByPlaceholderText("Search cuisines, restaurants..."),"Italian");
    await userEvent.type(screen.getByPlaceholderText(/Location/i),"Sylhet");
    await userEvent.click(screen.getByRole("button",{name:/Find.*Table|Search/i}));
    await screen.findByPlaceholderText("Search cuisine or name...");
  });
  it("home surfaces API errors",async()=>{
    server.use(http.get("http://localhost/api/restaurants/featured",()=>HttpResponse.json({message:"Featured unavailable"},{status:500})));wrapper(<App/>);await screen.findByText("Featured unavailable");
  });
  it("diner cancels a booking and sees dining history",async()=>{
    commonPages();asRole("user");
    server.use(http.put("http://localhost/api/bookings/b1/cancel",()=>HttpResponse.json({...booked,status:"cancelled"})));
    wrapper(<App/>,"/dashboard");await userEvent.click(await screen.findByRole("button",{name:"Cancel"}));await userEvent.click(screen.getByRole("button",{name:"Confirm cancellation"}));await screen.findByText("No upcoming reservations scheduled.");expect(screen.getByText("Dining History")).toBeInTheDocument();
  });
  it("diner cancellation decline makes no request and server failure keeps reservation",async()=>{
    commonPages();asRole("user");
    server.use(http.put("http://localhost/api/bookings/b1/cancel",()=>HttpResponse.json({message:"Cancel failed"},{status:500})));
    wrapper(<App/>,"/dashboard");await userEvent.click(await screen.findByRole("button",{name:"Cancel"}));await userEvent.click(screen.getByRole("button",{name:"Keep reservation"}));expect(screen.queryByText("Cancel failed")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button",{name:"Cancel"}));await userEvent.click(screen.getByRole("button",{name:"Confirm cancellation"}));await screen.findByText("Cancel failed");expect(screen.getByRole("button",{name:"Confirm cancellation"})).toBeInTheDocument();
  });
  it("diner sees empty bookings and failed recommendations",async()=>{
    asRole("user");server.use(http.get("http://localhost/api/bookings/my",()=>HttpResponse.json([])),http.get("http://localhost/api/restaurants/featured",()=>HttpResponse.json({message:"Recommendation unavailable"},{status:500})));
    wrapper(<App/>,"/dashboard");await screen.findByText("No upcoming reservations scheduled.");await screen.findByText("Recommendation unavailable");
  });
  it("restaurant loads availability then navigates to confirmation",async()=>{
    asRole("user");server.use(http.get("http://localhost/api/restaurants/r1/availability",()=>HttpResponse.json([{time:"18:00",availableSeats:8,isAvailable:true}])));
    wrapper(<App/>,"/restaurant/test-table");await userEvent.click(await screen.findByRole("button",{name:/18:00/}));await userEvent.click(screen.getByText("RESERVE NOW"));await screen.findByText("Guest Details");
  });
  it("restaurant prevents booking when availability fails",async()=>{
    asRole("user");server.use(http.get("http://localhost/api/restaurants/r1/availability",()=>HttpResponse.json({message:"Unavailable"},{status:500})));
    wrapper(<App/>,"/restaurant/test-table");await screen.findByRole("alert");expect(screen.getByText("RESERVE NOW")).toBeDisabled();
  });
  it.each(["pending","rejected"])("owner sees %s status",async status=>{
    asRole("owner");server.use(http.get("http://localhost/api/owner/restaurant",()=>HttpResponse.json({...fullRestaurant,status})));
    wrapper(<App/>,"/owner/dashboard");await screen.findByText(status==="pending"?"Registration Pending Approval":"Registration Denied");
  });
  it("owner switches between bookings and restaurant settings",async()=>{
    commonPages();asRole("owner");wrapper(<App/>,"/owner/dashboard");await screen.findByText("Active Reservations");await userEvent.click(screen.getByRole("button",{name:/Profile|Details|Settings/i}));await screen.findByLabelText("Restaurant name");
  });
  it("owner without restaurant sees setup form",async()=>{
    asRole("owner");server.use(http.get("http://localhost/api/owner/restaurant",()=>HttpResponse.json(null)));wrapper(<App/>,"/owner/dashboard");await screen.findByText("Setup Restaurant Profile");
  });
  it("admin approves, suspends and re-approves restaurant then views metrics",async()=>{
    commonPages();asRole("admin");let status="pending";
    server.use(http.get("http://localhost/api/admin/restaurants",()=>HttpResponse.json([{...fullRestaurant,status}])),http.put("http://localhost/api/admin/restaurants/r1/approve",async({request})=>{status=(await request.json() as {status:string}).status;return HttpResponse.json({...fullRestaurant,status});}));
    wrapper(<App/>,"/admin/dashboard");await userEvent.click(await screen.findByRole("button",{name:"Approve",exact:true}));await userEvent.click(await screen.findByRole("button",{name:"Suspend"}));await userEvent.click(await screen.findByRole("button",{name:"Re-Approve"}));await screen.findByRole("button",{name:"Suspend"});
    await userEvent.click(screen.getByText("Analytics & Stats"));await screen.findByText("Active Diners");expect(screen.getByText("GR-DEMO")).toBeInTheDocument();
  });
  it("admin errors leave approval actionable",async()=>{
    commonPages();asRole("admin");server.use(http.put("http://localhost/api/admin/restaurants/r1/approve",()=>HttpResponse.json({message:"Approval failed"},{status:500})));
    wrapper(<App/>,"/admin/dashboard");await userEvent.click(await screen.findByRole("button",{name:"Reject",exact:true}));await screen.findByText("Approval failed");expect(screen.getByRole("button",{name:"Approve",exact:true})).toBeEnabled();
  });
  it("search supports toggling cuisines, prices, text, sorting and reset",async()=>{
    wrapper(<Search/>,"/search");await screen.findByText("Test Table");
    await userEvent.click(screen.getByRole("button",{name:"Italian",exact:true}));await userEvent.click(screen.getByRole("button",{name:"Italian",exact:true}));
    await userEvent.click(screen.getByRole("button",{name:"$$",exact:true}));await userEvent.click(screen.getByRole("button",{name:"$$",exact:true}));
    await userEvent.type(screen.getByPlaceholderText("Search cuisine or name..."),"test{Enter}");
    await userEvent.type(screen.getByPlaceholderText("Location..."),"Sylhet{Enter}");
    await userEvent.selectOptions(screen.getByRole("combobox"),"price_low");
    await userEvent.click(screen.getByRole("button",{name:"Clear All",exact:true}));expect(screen.getByPlaceholderText("Search cuisine or name...")).toHaveValue("");
  });
  it("real login modal submits and closes",async()=>{
    wrapper(<App/>,"/dashboard");await userEvent.click(await screen.findByText("AUTHENTICATE"));await userEvent.type(screen.getByPlaceholderText("you@example.com"),"account@example.test");await userEvent.type(screen.getByPlaceholderText("••••••••"),"Password123!");
    commonPages();await userEvent.click(screen.getByRole("button",{name:"LOGIN",exact:true}));await screen.findByText(/Welcome back, Account/);expect(screen.queryByPlaceholderText("you@example.com")).not.toBeInTheDocument();
  });
  it("real registration modal sends owner choice and closes",async()=>{
    wrapper(<App/>,"/dashboard");await userEvent.click(await screen.findByText("AUTHENTICATE"));await userEvent.click(screen.getByRole("button",{name:"SIGN UP",exact:true}));
    await userEvent.type(screen.getByPlaceholderText("Sarah Jenkins"),"New Owner");await userEvent.type(screen.getByPlaceholderText("you@example.com"),"new@example.test");await userEvent.type(screen.getByPlaceholderText("••••••••"),"Password123!");await userEvent.type(screen.getByPlaceholderText("+1 (555) 000-0000"),"01712345678");await userEvent.click(screen.getByLabelText("I am a Restaurant Owner / Manager"));
    commonPages();await userEvent.click(screen.getByRole("button",{name:"CREATE ACCOUNT"}));await screen.findByText(/Welcome back, Account/);
  });
});
async function fillRestaurant() {
  for(const [label,value] of Object.entries({"Restaurant name":"New Table",Description:"Good food",Cuisine:"Italian",City:"Sylhet",Address:"Main road",Chef:"Chef",Tags:"Fine, Dining","Total seats":"12"})) {
    const field=screen.getByLabelText(label);await userEvent.clear(field);await userEvent.type(field,value);
  }
  await userEvent.selectOptions(screen.getByLabelText("Price range"),"$$$");
  await userEvent.click(screen.getByRole("button",{name:"12:00",exact:true}));
  await userEvent.click(screen.getByRole("button",{name:"18:00",exact:true}));
}
describe("owner forms",()=>{
  it.each([201,409])("registration form handles API %s",async status=>{
    const callback=vi.fn();server.use(http.post("http://localhost/api/owner/restaurant",()=>status===201?HttpResponse.json({...fullRestaurant,status:"pending"},{status}):HttpResponse.json({message:"Registration conflict"},{status})));
    wrapper(<RestaurantWizard setRestaurant={callback}/>);await fillRestaurant();await userEvent.click(screen.getByRole("button",{name:"REGISTER RESTAURANT"}));
    if(status===201) await waitFor(()=>expect(callback).toHaveBeenCalledWith(expect.objectContaining({status:"pending"})));
    else {await screen.findByText("Registration conflict");expect(callback).not.toHaveBeenCalled();}
  });
  it.each([200,409])("profile form handles API %s",async status=>{
    const callback=vi.fn();server.use(http.put("http://localhost/api/owner/restaurant",()=>status===200?HttpResponse.json({...fullRestaurant,totalSeats:12}):HttpResponse.json({message:"Capacity conflict"},{status})));
    wrapper(<OwnerProfileDetails restaurant={fullRestaurant} setRestaurant={callback}/>);await fillRestaurant();await userEvent.click(screen.getByRole("button",{name:"SAVE PROFILE DETAILS"}));
    if(status===200) await waitFor(()=>expect(callback).toHaveBeenCalled());else await screen.findByText("Capacity conflict");
  });
});
import AdminStats from "../src/components/admin/AdminStats";
import RestaurantInfo from "../src/components/restaurant/RestaurantInfo";
import RestaurantHero from "../src/components/restaurant/RestaurantHero";
it("admin handles empty activity and deleted-restaurant historical bookings",()=>{
  const view=render(<AdminStats stats={{...stats,latestBookings:[]}}/>);expect(screen.getByText("No bookings recorded on the platform.")).toBeInTheDocument();
  view.rerender(<AdminStats stats={{...stats,latestBookings:[{...booked,restaurant:null,status:"cancelled"},{...booked,_id:"b2",status:"completed"}]}}/>);expect(screen.getByText("Deleted Restaurant")).toBeInTheDocument();expect(screen.getByText("completed")).toBeInTheDocument();
});
it("owner handles no bookings and legacy contacts",()=>{
  const props={totalSeats:8,setBookings:vi.fn()};const view=render(<OwnerBookings {...props} bookings={[]}/>);expect(screen.getByText("No booking records found.")).toBeInTheDocument();
  view.rerender(<OwnerBookings {...props} bookings={[{...booked,contact:undefined,status:"cancelled",specialRequests:"Window"},{...booked,_id:"b2",status:"completed"}]}/>);expect(screen.getByText(/Booking contact details unavailable/)).toBeInTheDocument();expect(screen.getByText("Window",{exact:false})).toBeInTheDocument();
});
it("owner profile safely fills missing legacy optional values",async()=>{
  wrapper(<OwnerProfileDetails restaurant={{_id:"legacy"}} setRestaurant={vi.fn()}/>);await waitFor(()=>expect(screen.getByLabelText("Total seats")).toHaveValue(20));expect(screen.getByLabelText("Restaurant name")).toHaveValue("");
});
it("restaurant presentation tolerates a missing record",()=>{
  const v=render(<><RestaurantInfo restaurant={null}/><RestaurantHero restaurant={null}/></>);expect(v.container).toBeEmptyDOMElement();
});
it("unauthenticated dining slot opens sign-in",async()=>{
  server.use(http.get("http://localhost/api/restaurants/r1/availability",()=>HttpResponse.json([{time:"18:00",availableSeats:8,isAvailable:true}])));
  wrapper(<App/>,"/restaurant/test-table");await userEvent.click(await screen.findByRole("button",{name:/18:00/}));await userEvent.click(screen.getByText("LOGIN TO RESERVE"));await screen.findByPlaceholderText("you@example.com");await userEvent.click(screen.getByRole("button",{name:"Close",exact:true}));expect(screen.queryByPlaceholderText("you@example.com")).not.toBeInTheDocument();
});
it("search failure gives feedback without stale results",async()=>{
  server.use(http.get("http://localhost/api/restaurants",()=>HttpResponse.json({message:"Search unavailable"},{status:500})));wrapper(<Search/>);await screen.findByText("Search unavailable");
});
it("missing confirmation parameters prevent API submission",async()=>{
  loggedIn=true;wrapper(<Routes><Route path="/booking/:slug" element={<BookingConfirmation/>}/></Routes>,"/booking/test-table");await screen.findByLabelText("FULL NAME");await waitFor(()=>expect(screen.getByLabelText("FULL NAME")).toHaveValue(user.name));
  await userEvent.type(screen.getByLabelText("PHONE NUMBER"),"9");await userEvent.selectOptions(screen.getByLabelText("SPECIAL OCCASION"),"Birthday");await userEvent.type(screen.getByLabelText("Special requests"),"Window");
  await userEvent.click(screen.getByRole("button",{name:"BOOK TABLE"}));await screen.findByText("Reservation details are missing. Return to restaurant details.");
});
it("session restoration network failure allows a subsequent login",async()=>{
  server.use(http.get("http://localhost/api/auth/me",()=>HttpResponse.error()));wrapper(<SessionPanel/>);await screen.findByText("Could not restore your session. Please sign in again.");await userEvent.click(screen.getByText("Test login"));await screen.findByText("Signed in: Account Name");
});
