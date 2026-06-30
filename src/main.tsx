import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { initPwa } from "./pwa/registerPwa";
import { initInstallPromptCapture } from "./pwa/installPrompt";

initInstallPromptCapture();
initPwa();

createRoot(document.getElementById("root")!).render(<App />);
