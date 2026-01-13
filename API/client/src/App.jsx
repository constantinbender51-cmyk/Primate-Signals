import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout'; // Import the new layout
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
           <Route path="/login" element={<Login />} />
           <Route path="/register" element={<Register />} />
           <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
[span_1](start_span)} //[span_1](end_span)

export default App;
