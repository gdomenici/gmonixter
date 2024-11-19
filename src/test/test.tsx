import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/tailwind.css";
import TestApp from "./TestApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
