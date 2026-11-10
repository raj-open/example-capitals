// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import "./styles.css";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
