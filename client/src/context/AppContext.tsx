/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import api from "../lib/api.js";
import toast from "react-hot-toast";
interface UserType { _id:string; name:string; email:string; phone?:string; role:"user" | "admin" | "owner" }
type AuthMode = "login" | "register";
interface AppContextType {
  user:UserType | null; loading:boolean; isAuthenticated:boolean;
  isAuthModalOpen:boolean; authMode:AuthMode;
  setAuthModalOpen:(open:boolean) => void; setAuthMode:(mode:AuthMode) => void;
  openAuthModal:(mode?:AuthMode) => void;
  login:(email:string, password:string) => Promise<boolean>;
  register:(name:string, email:string, password:string, phone?:string, role?:"user" | "owner") => Promise<boolean>;
  logout:() => Promise<void>;
}
const AppContext = createContext<AppContextType | null>(null);
const message = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message || error.message : "Unable to complete request";
export const AppContextProvider = ({ children }: { children:React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const sessionRevision = useRef(0);
  const openAuthModal = (mode:AuthMode = "login") => { setAuthMode(mode); setAuthModalOpen(true); };
  const authenticate = async (path:string, body:Record<string, unknown>) => {
    sessionRevision.current += 1;
    setLoading(true);
    try {
      const { data } = await api.post<UserType>(path, body);
      setUser(data);
      toast.success(`Welcome, ${data.name}`);
      return true;
    } catch (error) { toast.error(message(error)); return false; }
    finally { setLoading(false); }
  };
  const login = (email:string, password:string) => authenticate("/auth/login", {email:email.trim().toLowerCase(), password});
  const register = (name:string, email:string, password:string, phone?:string, role?:"user" | "owner") => authenticate("/auth/register", {name:name.trim(), email:email.trim().toLowerCase(), password, phone:phone?.trim() || undefined, role});
  const logout = async () => {
    sessionRevision.current += 1;
    try { await api.post("/auth/logout"); setUser(null); toast.success("Signed out"); }
    catch (error) { toast.error(message(error)); }
  };
  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    // Remove only the legacy credential, preserving unrelated preferences.
    localStorage.removeItem("token");
    api.get<UserType>("/auth/me").then(({data}) => {
      if (active && revision === sessionRevision.current) setUser(data);
    }).catch(error => {
      if (active && revision === sessionRevision.current && (!axios.isAxiosError(error) || error.response?.status !== 401)) toast.error("Could not restore your session. Please sign in again.");
    }).finally(() => { if (active && revision === sessionRevision.current) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <AppContext.Provider value={{user, loading, isAuthenticated:!!user, isAuthModalOpen, authMode, setAuthModalOpen, setAuthMode, openAuthModal, login, register, logout}}>{children}</AppContext.Provider>;
};
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppContextProvider");
  return context;
};
