import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Profile from './Profile'; // Import new Profile
import LegalTextPage from './LegalTextPage';
import APIDocs from './APIDocs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route path="/" element={<Dashboard />} />
           <Route path="/profile" element={<Profile />} /> {/* New Route */}
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
