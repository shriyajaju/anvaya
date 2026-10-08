import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SignIn, SignUp } from './auth/AuthScreens'
import { useAnvaya } from './store'
import { Shell } from './studio/Shell'
import {
  AnalyticsPage,
  ArchiveIndex,
  ArchivePage,
  AssetsPage,
  CreateSite,
  Dashboard,
  DocumentPage,
  EvidencePage,
  Overview,
  PublishPage,
  ReconstructPage,
  ReviewPage,
  ReviewQueue,
  SettingsPage,
  Sites,
  StoriesPage,
  TimelinePage,
} from './studio/pages'
import { VisitorPage } from './visitor/VisitorApp'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAnvaya((state) => state.session)
  if (!session) return <Navigate to="/signin" replace />
  return children
}

export default function App() {
  return (
    <HashRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/studio"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sites" element={<Sites />} />
        <Route path="create" element={<CreateSite />} />
        <Route path="review-queue" element={<ReviewQueue />} />
        <Route path="archive" element={<ArchiveIndex />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="site/overview" element={<Overview />} />
        <Route path="site/document" element={<DocumentPage />} />
        <Route path="site/evidence" element={<EvidencePage />} />
        <Route path="site/timeline" element={<TimelinePage />} />
        <Route path="site/reconstruct" element={<ReconstructPage />} />
        <Route path="site/stories" element={<StoriesPage />} />
        <Route path="site/review" element={<ReviewPage />} />
        <Route path="site/publish" element={<PublishPage />} />
        <Route path="site/archive" element={<ArchivePage />} />
      </Route>
      <Route path="/v" element={<Navigate to="/v/kanheri" replace />} />
      <Route path="/v/:slug/*" element={<VisitorPage />} />
    </Routes>
    </HashRouter>
  )
}
