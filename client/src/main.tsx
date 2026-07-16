import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppContextProvider } from "./context/AppContext.tsx";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <AppContextProvider>
            <App />
        </AppContextProvider>
    </BrowserRouter>,
);
