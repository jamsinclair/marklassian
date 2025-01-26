import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { IntlProvider } from "react-intl-next";
import { BrowserRouter } from "react-router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <IntlProvider locale="en">
      <App />
    </IntlProvider>
  </BrowserRouter>,
);
