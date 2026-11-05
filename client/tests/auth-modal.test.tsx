import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthModal from "../src/components/AuthModal";
import { useAppContext } from "../src/context/AppContext";

vi.mock("../src/context/AppContext", () => ({ useAppContext: vi.fn() }));

function setup(success = false) {
    const login = vi.fn().mockResolvedValue(success);
    const register = vi.fn().mockResolvedValue(success);
    function Harness() {
        const [open, setOpen] = useState(true);
        const [mode, setMode] = useState<"login" | "register">("login");
        vi.mocked(useAppContext).mockReturnValue({
            user: null, loading: false, isAuthenticated: false,
            isAuthModalOpen: open, authMode: mode,
            setAuthModalOpen: setOpen, setAuthMode: setMode,
            openAuthModal: () => setOpen(true), login, register, logout: vi.fn(),
        });
        return <>
            <button onClick={() => setOpen(true)}>Open sign in</button>
            <button onClick={() => setOpen(false)}>Close externally</button>
            <AuthModal />
        </>;
    }
    render(<Harness />);
    return { user: userEvent.setup(), login, register };
}

function expectEmptyCredentials() {
    expect(screen.getByLabelText("EMAIL ADDRESS")).toHaveValue("");
    expect(screen.getByLabelText("PASSWORD")).toHaveValue("");
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>, role = "user") {
    await user.type(screen.getByLabelText("EMAIL ADDRESS"), `${role}@example.test`);
    await user.type(screen.getByLabelText("PASSWORD"), "ExamplePass123!");
}

describe("authentication form credentials", () => {
    it("does not submit untouched empty fields", async () => {
        const { user, login } = setup();
        await user.click(screen.getByText("LOGIN"));
        expect(login).not.toHaveBeenCalled();
        expect(screen.getByLabelText("EMAIL ADDRESS")).toHaveFocus();
    });

    it("allows manual owner registration with empty initial credentials", async () => {
        const { user, register } = setup(true);
        await user.click(screen.getByText("SIGN UP"));
        expectEmptyCredentials();
        await user.type(screen.getByPlaceholderText("Sarah Jenkins"), "Test Owner");
        await enterCredentials(user, "owner");
        await user.click(screen.getByLabelText("I am a Restaurant Owner / Manager"));
        await user.click(screen.getByText("CREATE ACCOUNT"));
        expect(register).toHaveBeenCalledWith("Test Owner", "owner@example.test", "ExamplePass123!", "", "owner");
    });

    it("opens empty and suppresses automatic credential filling until focus", async () => {
        const { user } = setup();
        expectEmptyCredentials();
        const email = screen.getByLabelText("EMAIL ADDRESS");
        const password = screen.getByLabelText("PASSWORD");
        expect(email.closest("form")).toHaveAttribute("autocomplete", "off");
        expect(email).toHaveAttribute("autocomplete", "off");
        expect(password).toHaveAttribute("autocomplete", "new-password");
        expect(email).toHaveAttribute("readonly");
        expect(password).toHaveAttribute("readonly");
        await user.tab(); // External open control.
        await user.tab(); // External close control.
        await user.tab(); // Modal close control.
        await user.tab(); // Sign in tab.
        await user.tab(); // Sign up tab.
        await user.tab(); // Email field.
        expect(email).toHaveFocus();
        await user.keyboard("visitor@example.test");
        await user.tab();
        expect(password).toHaveFocus();
        await user.keyboard("ExamplePass123!");
        expect(email).toHaveValue("visitor@example.test");
        expect(password).toHaveValue("ExamplePass123!");
    });

    it.each(["user", "admin", "owner"])("clears %s credentials after closing and reopening", async (role) => {
        const { user } = setup();
        await enterCredentials(user, role);
        await user.click(screen.getByRole("button", { name: "Close" }));
        await user.click(screen.getByText("Open sign in"));
        expectEmptyCredentials();
    });

    it("clears credentials after external closure and tab switches", async () => {
        const { user } = setup();
        await enterCredentials(user);
        await user.click(screen.getByText("Close externally"));
        await user.click(screen.getByText("Open sign in"));
        expectEmptyCredentials();
        await enterCredentials(user);
        await user.click(screen.getByText("SIGN UP"));
        expectEmptyCredentials();
        await enterCredentials(user, "owner");
        await user.click(screen.getByText("SIGN IN"));
        expectEmptyCredentials();
    });

    it("submits manually entered credentials and opens empty after success", async () => {
        const { user, login } = setup(true);
        await enterCredentials(user);
        await user.click(screen.getByText("LOGIN"));
        expect(login).toHaveBeenCalledWith("user@example.test", "ExamplePass123!");
        expect(screen.queryByLabelText("EMAIL ADDRESS")).not.toBeInTheDocument();
        await user.click(screen.getByText("Open sign in"));
        expectEmptyCredentials();
    });

    it("keeps manual input available for correcting a failed login", async () => {
        const { user, login } = setup();
        await enterCredentials(user);
        await user.click(screen.getByText("LOGIN"));
        expect(login).toHaveBeenCalledOnce();
        expect(screen.getByLabelText("EMAIL ADDRESS")).toHaveValue("user@example.test");
    });
});
