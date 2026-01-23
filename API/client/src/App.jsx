import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Profile from './Profile';
import AssetDetails from './AssetDetails';
import LegalTextPage from './LegalTextPage';
import APIDocs from './APIDocs';
import LandingPage from './LandingPage'; 

function App() {
  return (
    <BrowserRouter>
      {/* ⚠️ DO NOT put <Layout> here. It is handled inside Routes below. */}
      <Routes>
        
        {/* The Layout component wraps all these routes */}
        <Route element={<Layout />}>
           
           {/* Landing Page (Home) */}
           <Route path="/" element={<LandingPage />} />
           
           {/* Main App (Market) */}
           <Route path="/dashboard" element={<Dashboard />} />
           
           {/* Asset Details (e.g., /asset/BTC or /asset/ALL) */}
           <Route path="/asset/:symbol" element={<AssetDetails />} />
           
           {/* Authentication */}
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route path="/profile" element={<Profile />} />
           
           {/* Documentation & Legal */}
           <Route path="/api-docs" element={<APIDocs />} />
           <Route path="/legal/:type" element={<LegalTextPage />} />
           
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
