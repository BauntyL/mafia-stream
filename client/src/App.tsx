import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { OverlayPage } from './pages/OverlayPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:code" element={<GamePage />} />
        <Route path="/overlay/:code" element={<OverlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}
