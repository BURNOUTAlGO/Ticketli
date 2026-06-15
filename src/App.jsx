import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BrowseTicketsPage from "./pages/BrowseTicketsPage";
import CreateListing from "./pages/CreateListingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import MyListingsPage from "./pages/MyListingPage";
import { ThemeProvider } from "./components/ThemeProvider";

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/browse"
          element={
            <ProtectedRoute>
              <BrowseTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-listing"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route path="/my-listings" element={
          <ProtectedRoute>
            <MyListingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
