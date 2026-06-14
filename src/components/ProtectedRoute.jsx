import { useAuth0 } from "@auth0/auth0-react";

// ProtectedRoute is a wrapper component that only renders its children when the user is logged in.
// If the user is not logged in, it redirects them to the Auth0 login page.
function ProtectedRoute({ children }) {
  // useAuth0 gives us information about login state and a function to start login.
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  // While Auth0 is checking the login state, show a simple loading message.
  if (isLoading) return <div>Loading...</div>;

  // If the user is not authenticated, start the login flow and do not render the protected content.
  if (!isAuthenticated) {
    loginWithRedirect();
    return null;
  }

  // When the user is authenticated, render the protected child components.
  return children;
}
export default ProtectedRoute;