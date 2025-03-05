import React from "react";
import { createRoot } from "react-dom/client"; // Import createRoot
import App from "./App";
import "./tailwind.css"; // Import Tailwind CSS

// Get the root element
const container = document.getElementById("root");

// Create a root
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
