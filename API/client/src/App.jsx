import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Profile from './Profile';
import LegalTextPage from './LegalTextPage';
import APIDocs from './APIDocs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           {/* Dashboard is the main view for the Spearhead Strategy */}
           <Route path="/" element={<Dashboard />} />
           <Route path="/profile" element={<Profile />} />
           {/* Legal Pages */}
           <Route path="/legal/:type" element={<LegalTextPage />} />
           {/* API Documentation */}
           <Route path="/api-docs" element={<APIDocs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;