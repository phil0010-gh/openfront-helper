import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles/popup-base.css";
import "../../styles/popup-layout.css";
import "../../styles/popup-helpers.css";
import "../../styles/popup-filters.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp";

const el = document.getElementById("root");
if (!el) {
  throw new Error("Popup root element missing");
}

createRoot(el).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
