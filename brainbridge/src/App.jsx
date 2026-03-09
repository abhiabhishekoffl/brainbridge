import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage   from "./pages/LandingPage";
import MirrorGame    from "./pages/MirrorGame";
import FocusCatcher  from "./pages/FocusCatcher";
import ResultPage    from "./pages/ResultPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/game/mirror" element={<MirrorGame />} />
        <Route path="/game/focus"  element={<FocusCatcher />} />
        <Route path="/result"      element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}
