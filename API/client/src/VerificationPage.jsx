import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerificationPage() {
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
      // await api.post('/api/verification', { idFront, idBack, selfie });
      
      // For demo purposes
      setTimeout(() => {
        setLoading(false);
        navigate('/subscription');
      }, 1500);
    } catch (err) {
      setLoading(false);
      alert("Verification submission failed. Please try again.");
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '4rem auto',
      padding: '2.5rem',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: s <= step ? '#10b981' : '#e5e7eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {s}
            </div>
            {s < 3 && (
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: s < step ? '#10b981' : '#e5e7eb'
              }} />
            )}
          </div>
        ))}
      </div>

      <h2 style={{
        fontSize: '1.75rem',
        fontWeight: '800',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {step === 1 ? 'ID Verification' : step === 2 ? 'Selfie Verification' : 'Review Information'}
      </h2>
      
      <p style={{
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: '14px'
      }}>
        {step === 1 
          ? 'Upload both sides of your government-issued ID' 
          : step === 2 
            ? 'Take a selfie to verify your identity' 
            : 'Review your verification information before submitting'}
      </p>

      {step === 1 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem'
        }}>
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>ID Front</h3>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: idFront ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
            }} onClick={() => document.getElementById('id-front').click()}>
              {idFront ? (
                <img src={idFront} alt="ID Front" style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain'
                }} />
              ) : (
                <>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: '#94a3b8'
                  }}>📷</div>
                  <p style={{
                    color: '#64748b',
                    marginBottom: '0.5rem'
                  }}>Click to upload ID front</p>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#94a3b8'
                  }}>PNG, JPG (max. 10MB)</p>
                </>
              )}
            </div>
            <input 
              id="id-front" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, setIdFront)} 
            />
          </div>
          
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>ID Back</h3>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: idBack ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
            }} onClick={() => document.getElementById('id-back').click()}>
              {idBack ? (
                <img src={idBack} alt="ID Back" style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain'
                }} />
              ) : (
                <>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    color: '#94a3b8'
                  }}>📷</div>
                  <p style={{
                    color: '#64748b',
                    marginBottom: '0.5rem'
                  }}>Click to upload ID back</p>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#94a3b8'
                  }}>PNG, JPG (max. 10MB)</p>
                </>
              )}
            </div>
            <input 
              id="id-back" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, setIdBack)} 
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '300px',
            height: '300px',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            {selfie ? (
              <img src={selfie} alt="Selfie" style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                color: '#64748b'
              }}>
                Camera Preview
              </div>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '1rem'
          }}>
            <button 
              onClick={handleCameraCapture}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Use Camera
            </button>
            <button 
              onClick={() => document.getElementById('selfie-upload').click()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Upload from Device
            </button>
            <input 
              id="selfie-upload" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e, setSelfie)} 
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>ID Front</h3>
              <img src={idFront} alt="ID Front" style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }} />
            </div>
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>ID Back</h3>
              <img src={idBack} alt="ID Back" style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }} />
            </div>
          </div>
          
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>Selfie</h3>
            <img src={selfie} alt="Selfie" style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'contain',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }} />
          </div>
          
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px'
          }}>
            <p style={{
              color: '#854d0e',
              fontSize: '0.875rem'
            }}>
              By submitting this information, you confirm that you are the person shown in the ID and photos, and that all information is accurate and complete.
            </p>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2.5rem'
      }}>
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
        
        {step < 3 && (
          <button 
            onClick={() => setStep(step + 1)}
            disabled={!(step === 1 ? (idFront && idBack) : selfie)}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: (step === 1 ? (idFront && idBack) : selfie) ? '#10b981' : '#cbd5e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (step === 1 ? (idFront && idBack) : selfie) ? 'pointer' : 'not-allowed'
            }}
          >
            Next
          </button>
        )}
        
        {step === 3 && (
          <button 
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
        )}
      </div>
    </div>
  );
}