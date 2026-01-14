import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout'; // Import the new layout
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import LegalTextPage from './LegalTextPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route path="/" element={<Dashboard />} />
           {/* Legal Pages */}
           <Route path="/legal/:type" element={<LegalTextPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
