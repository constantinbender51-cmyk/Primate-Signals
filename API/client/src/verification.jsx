// client/src/verification.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Verification() {
  const [step, setStep] = useState(1); // 1 = ID upload, 2 = Selfie, 3 = Review
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = (e, setter) => {
    if (e.target.files.length > 0) {
      setter(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for video to load
      await new Promise(resolve => {
        video.onloadeddata = resolve;
        setTimeout(resolve, 1000);
      });
      
      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      
      // Set as selfie
      setSelfie(canvas.toDataURL('image/jpeg'));
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please upload a selfie instead.");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call to submit verification data
      console.log('Submitting verification data', { idFront, idBack, selfie });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save verification status
      const pendingUser = JSON.parse(localStorage.getItem('pendingUser') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...pendingUser,
        isVerified: false, // Will be set to true after admin approval
        status: 'pending'
      }));
      
      setLoading(false);
      navigate('/record');
    } catch (err) {
      setLoading(false);
      alert("Verification submission failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
          <p className="mt-2 text-gray-600">
            To work as a human AI provider, we need to verify your identity
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s < step ? 'bg-emerald-600 text-white' : 
                s === step ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 
                'bg-gray-200 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`h-1 flex-1 mx-2 ${
                  s < step ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">ID Document Upload</h2>
            <p className="text-gray-600">
              Please upload both sides of your government-issued ID (passport, driver's license, or national ID card)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ID Front</h3>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
                    idFront ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => document.getElementById('id-front').click()}
                >
                  {idFront ? (
                    <img src={idFront} alt="ID Front" className="max-w-full h-auto mx-auto max-h-40 object-contain" />
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium text-emerald-600 hover:text-emerald-500">Click to upload</span> or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, PDF (max. 10MB)</p>
                    </div>
                  )}
                </div>
                <input 
                  id="id-front" 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setIdFront)} 
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ID Back</h3>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
                    idBack ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => document.getElementById('id-back').click()}
                >
                  {idBack ? (
                    <img src={idBack} alt="ID Back" className="max-w-full h-auto mx-auto max-h-40 object-contain" />
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium text-emerald-600 hover:text-emerald-500">Click to upload</span> or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, PDF (max. 10MB)</p>
                    </div>
                  )}
                </div>
                <input 
                  id="id-back" 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setIdBack)} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Selfie Verification</h2>
            <p className="text-gray-600">
              Please take a selfie holding your ID document next to your face
            </p>
            
            <div className="flex flex-col items-center">
              <div className="w-64 h-64 border-2 border-dashed rounded-xl overflow-hidden relative">
                {selfie ? (
                  <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    Camera Preview
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex space-x-4">
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Use Camera
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('selfie-upload').click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Upload from device
                </button>
                <input 
                  id="selfie-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setSelfie)} 
                />
              </div>
              
              <p className="mt-4 text-sm text-gray-500">
                Make sure your face and ID are clearly visible
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Review Information</h2>
            <p className="text-gray-600">
              Please review your verification information before submitting
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ID Front</h3>
                <img src={idFront} alt="ID Front" className="w-full h-auto rounded-lg border border-gray-200" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ID Back</h3>
                <img src={idBack} alt="ID Back" className="w-full h-auto rounded-lg border border-gray-200" />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selfie with ID</h3>
              <img src={selfie} alt="Selfie" className="w-full h-auto rounded-lg border border-gray-200" />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    By submitting this information, you confirm that you are the person shown in the ID and photos, and that all information is accurate and complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Previous
            </button>
          )}
          
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!(step === 1 ? (idFront && idBack) : selfie)}
              className={`ml-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                (step === 1 ? (idFront && idBack) : selfie) 
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Next
            </button>
          )}
          
          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}