import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";

import Home from "./pages/Home";
import BrowseTicketsPage from "./pages/BrowseTicketsPage";
import CreateListing from "./pages/CreateListingPage";
import MyListingsPage from "./pages/MyListingPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import Testimonial from "./pages/Testimonial";
import About from "./pages/About";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

function App() {
  // Cleanup function for tickets that are unsold and have a journey date within the next 2 days.
  // This keeps the ticket collection fresh and removes old unsold listings automatically.
  const cleanupExpiredTickets = async () => {
    try {
      const snap = await getDocs(collection(db, "tickets"));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const d of snap.docs) {
        const data = d.data();

        if (data.sold) continue;
        if (!data.journeyDate) continue;

        const journey = new Date(data.journeyDate);
        journey.setHours(0, 0, 0, 0);

        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + 2);

        if (journey <= cutoff) {
          const rq = query(
            collection(db, "contactRequests"),
            where("ticketId", "==", d.id),
          );

          const rsnap = await getDocs(rq);

          const nq = query(
            collection(db, "notifications"),
            where("ticketId", "==", d.id),
          );

          const nsnap = await getDocs(nq);

          const batch = writeBatch(db);

          // Delete ticket
          batch.delete(doc(db, "tickets", d.id));

          // Delete all requests
          rsnap.docs.forEach((r) => {
            batch.delete(doc(db, "contactRequests", r.id));
          });

          // Delete all notifications
          nsnap.docs.forEach((n) => {
            batch.delete(doc(db, "notifications", n.id));
          });

          await batch.commit();

          console.log(`Deleted expired ticket and related data: ${d.id}`);
        }
      }
    } catch (err) {
      console.error("Expired ticket cleanup failed:", err);
    }
  };
  // Cleanup function for sold PNRs older than 30 days since the journey date.
  // This helps keep the soldPnrs collection from growing indefinitely.
  const cleanupSoldPnrs = async () => {
    try {
      const snap = await getDocs(collection(db, "soldPnrs"));
      const today = new Date();

      for (const d of snap.docs) {
        const data = d.data();

        if (!data.journeyDate) continue;

        const journeyDate = new Date(`${data.journeyDate}T00:00:00`);
        const deleteDate = new Date(journeyDate);

        deleteDate.setDate(deleteDate.getDate() + 30);

        if (today >= deleteDate) {
          console.log(`Deleted sold ticket: ${data.originalTicketId}`);
        }
      }
    } catch (err) {
      console.error("Sold ticket cleanup failed:", err);
    }
  };
  const cleanupSoldTickets = async () => {
    try {
      const snap = await getDocs(collection(db, "soldTickets"));
      const now = Date.now();

      const batch = writeBatch(db);

      snap.docs.forEach((d) => {
        const data = d.data();

        if (data.expiresAt && data.expiresAt <= now) {
          // delete original ticket
          if (data.ticketId) {
            batch.delete(doc(db, "tickets", data.ticketId));
          }

          // delete sold card
          batch.delete(doc(db, "soldTickets", d.id));
        }
      });

      await batch.commit();
    } catch (err) {
      console.error("Sold ticket cleanup failed:", err);
    }
  };

  useEffect(() => {
    // Run cleanup routines once when the app mounts.
    cleanupExpiredTickets();
    cleanupSoldPnrs();
    cleanupSoldTickets();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route
            path="/"
            element={
              <>
                <Home />
                <About />
                <Testimonial/>
                <Footer />
              </>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute>
                <BrowseTicketsPage />
                <Footer />
              </ProtectedRoute>
            }
          />
          <Route path="/places" element={<><About /><Footer /></>} />
          <Route path="/testimonials" element={<><Testimonial /><Footer /></>} />

          <Route
            path="/create-listing"
            element={
              <ProtectedRoute>
                <CreateListing />
                <Footer/>
              </ProtectedRoute>
              
              
            }
          />

          <Route
            path="/my-listings"
            element={
              <ProtectedRoute>
                <MyListingsPage />
                <Footer/>
              </ProtectedRoute>
            }
          />

          <Route path="/ticket/:id" element={<><TicketDetailPage /><Footer/></>} />

          <Route
            path="/my-requests"
            element={
              <ProtectedRoute>
                <MyRequestsPage />
                <Footer/>
              </ProtectedRoute>
            }
          />
        </Routes>
        
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
