import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";

// Routes are lazy-loaded so the heavy chunks (recharts, leaflet) only download when
// a page that uses them is opened.
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

/** Centered spinner shown while a lazily-loaded page chunk is fetched. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AnalysisPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
