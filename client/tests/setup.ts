import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import toast from "react-hot-toast";
Object.defineProperty(window, "matchMedia", { writable:true, value:(query:string) => ({ matches:false, media:query, onchange:null, addListener:()=>{}, removeListener:()=>{}, addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>false }) });
afterEach(() => { cleanup(); localStorage.clear(); toast.remove(); });
