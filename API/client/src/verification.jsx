import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

export default function Verification() {
  const [idFront, setIdFront] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Simple mock file handler for demo (You'd likely use FormData in a real large app)
  const handleFileUpload = (e) => {
    if (e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onloadend = () => setIdFront(reader.result); // sets base64 string
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!idFront) return alert("Please upload an ID");
    
    setLoading(true);
    try {
      // Send to actual backend
      await api.post('/api/worker/verification', { idFront, idBack: null, selfie: null });
      
      alert("Verification Submitted! Awaiting admin approval.");
      navigate('/terminal'); // Navigate to their dashboard
    } catch (err) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Upload ID</h2>
        
        <input type="file" onChange={handleFileUpload} className="mb-6 w-full" />
        {idFront && <img src={idFront} alt="Preview" className="h-32 mx-auto mb-6 object-contain" />}

        <button 
          onClick={handleSubmit} 
          disabled={loading || !idFront}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Submit Verification'}
        </button>
      </div>
    </div>
  );
}