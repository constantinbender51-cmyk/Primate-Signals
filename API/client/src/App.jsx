import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Profile from './Profile';
import AssetDetails from './AssetDetails';
import LegalTextPage from './LegalTextPage';
import APIDocs from './APIDocs';
import LandingPage from './LandingPage'; // Import the new page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           {/* Public / Landing */}
           <Route path="/" element={<LandingPage />} />
           
           {/* App Routes */}
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/asset/:symbol" element={<AssetDetails />} />
           
           {/* Auth & User */}
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route path="/profile" element={<Profile />} />
           
           {/* Resources */}
           <Route path="/legal/:type" element={<LegalTextPage />} />
           <Route path="/api-docs" element={<APIDocs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
