import { useAppContext } from "../context/AppContext.tsx";
import { ShieldAlert } from "lucide-react";
import AuthModal from "./AuthModal.tsx";
import Loader from "./Loader.tsx";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ("user" | "admin" | "owner")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user, loading, setAuthModalOpen } = useAppContext();

    if (loading) {
        return <Loader text="Loading Panel Access..." />;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white border border-outline-variant/20 p-10 ambient-shadow rounded-lg flex flex-col items-center">
                    <ShieldAlert size={40} className="text-secondary mb-6" />
                    <h2 className="font-display text-2xl text-primary mb-3">Login to continue</h2>
                    <p className="text-sm text-black/55 mb-8 leading-relaxed">
                        Reservation booking and dashboard management are reserved exclusively for registered QuickDine members.
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => setAuthModalOpen(true)}
                            className="w-full bg-primary hover:bg-primary-container text-white py-3.5 px-4 text-xs font-medium tracking-widest uppercase hover:text-secondary focus:outline-none transition-colors cursor-pointer"
                        >
                            AUTHENTICATE
                        </button>
                        <AuthModal />
                    </div>
                </div>
            </div>
        );
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white border border-outline-variant/20 p-10 ambient-shadow rounded-lg flex flex-col items-center">
                    <ShieldAlert size={40} className="text-error mb-6" />
                    <h2 className="font-display text-2xl text-primary mb-3">Access Denied</h2>
                    <p className="text-sm text-black/55 mb-8 leading-relaxed">
                        You do not have the required permissions to access this dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
