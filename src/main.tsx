import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/global.css";

// Set document language for better accessibility
document.documentElement.lang = 'en';

// Add a11y attributes to the root element
const rootElement = document.getElementById("root");
if (rootElement) {
  rootElement.setAttribute('role', 'application');
  rootElement.setAttribute('aria-label', 'Chat Application');
}

createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
