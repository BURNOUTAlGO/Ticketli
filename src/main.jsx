import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Auth0Provider } from "@auth0/auth0-react";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Auth0Provider
      domain="dev-uyt0ky3gg3cgydsq.us.auth0.com"
      clientId="iaFoXaUX3xXrRI3SKOBFyrUyjH9bsSYr"
      authorizationParams={{ redirect_uri: window.location.origin }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
