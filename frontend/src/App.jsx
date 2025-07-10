import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'https://bad-posture-detection-gitx.onrender.com';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [postureType, setPostureType] = useState('squat');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useWebcam, setUseWebcam] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pendingPostureType, setPendingPostureType] = useState(null); // New state to hold pending selection
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // File validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi'];
  const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [stream, filePreview]);

  const validateFile = (file) => {
    if (!file) return { isValid: false, error: 'No file selected' };

    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Unsupported file type. Please use JPEG, PNG, WebP images or MP4, WebM videos' 
      };
    }

    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    return { isValid: true, error: null };
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null);
    setAnalysis(null);

    // Stop webcam if it's running when file is selected
    if (useWebcam) {
      stopWebcam();
    }

    if (!file) {
      setSelectedFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      setFilePreview(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      setSelectedFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      setFilePreview(null);
      return;
    }

    setSelectedFile(file);
    
    // Clean up previous preview
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      const preview = URL.createObjectURL(file);
      setFilePreview(preview);
    } else {
      setFilePreview(null);
    }
  };

  const startWebcam = async () => {
    setError(null);
    
    // Clear uploaded file when starting webcam
    if (selectedFile) {
      setSelectedFile(null);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
      }
      setAnalysis(null);
    }
    
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        },
        audio: false
      });
      
      setStream(mediaStream);
      setUseWebcam(true);
      
      // Wait for next tick to ensure videoRef is available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
          };
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing webcam:', error);
      let errorMessage = 'Webcam error: ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera access denied. Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += error.message || 'Please check permissions and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setUseWebcam(false);
    setError(null);
    setAnalysis(null);
  };

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Webcam not initialized');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState < 2) {
      setError('Webcam not ready. Please wait for video to load.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw the current frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and analyze
      canvas.toBlob(async (blob) => {
        if (blob && blob.size > 0) {
          await analyzeFrame(blob, 'webcam');
        } else {
          setError('Failed to capture frame - no image data');
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Capture error:', error);
      setError('Failed to capture frame: ' + error.message);
    }
  }, []);

  const analyzeFrame = async (imageBlob, source = 'file') => {
    setLoading(true);
    setError(null);
    
    try {
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error('Invalid image data');
      }

      const formData = new FormData();
      formData.append('file', imageBlob, source === 'webcam' ? 'webcam_frame.jpg' : selectedFile?.name || 'upload.jpg');
      formData.append('posture_type', postureType);

      console.log('Sending request to:', `${API_BASE_URL}/analyze-frame`);
      console.log('Posture type:', postureType);
      console.log('File size:', imageBlob.size);

      const response = await axios.post(`${API_BASE_URL}/analyze-frame`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('Response:', response.data);

      if (response.data) {
        setAnalysis(response.data);
      } else {
        throw new Error('No analysis data received');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      
      let errorMessage = 'Analysis failed: ';
      
      if (error.response) {
        // Server responded with error
        errorMessage += error.response.data?.message || error.response.data?.detail || `Server error (${error.response.status})`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage += 'No response from server. Please check if the API is running.';
      } else {
        // Something else happened
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Apply pending posture type after analysis is complete
      if (pendingPostureType) {
        setPostureType(pendingPostureType);
        setPendingPostureType(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    const validation = validateFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    await analyzeFrame(selectedFile);
  };

  const handlePostureChange = (value) => {
    if (loading) {
      // Store the pending selection if analysis is in progress
      setPendingPostureType(value);
    } else {
      setPostureType(value);
      setAnalysis(null); // Reset analysis when changing posture type
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bad Posture Detection App</h1>
        <p>Upload a video or use webcam to analyze your posture</p>
      </header>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        <div className="controls">
          <div className="posture-type-selector">
            <label>
              <input
                type="radio"
                value="squat"
                checked={postureType === 'squat'}
                onChange={(e) => handlePostureChange(e.target.value)}
              />
              Squat Analysis
            </label>
            <label>
              <input
                type="radio"
                value="sitting"
                checked={postureType === 'sitting'}
                onChange={(e) => handlePostureChange(e.target.value)}
              />
              Sitting Analysis
            </label>
          </div>

          <div className="input-section">
            <div className="file-upload">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={useWebcam || loading}
              />
              {selectedFile && (
                <div className="file-info">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                </div>
              )}
              {selectedFile && !loading && !useWebcam && (
                <button onClick={handleAnalyze} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Start Analysis'}
                </button>
              )}
            </div>

            <div className="webcam-section">
              <button onClick={useWebcam ? stopWebcam : startWebcam} disabled={loading}>
                {useWebcam ? 'Stop Webcam' : 'Start Webcam'}
              </button>
              {useWebcam && (
                <button onClick={captureFrame} disabled={loading || !stream}>
                  {loading ? 'Analyzing...' : 'Capture & Analyze'}
                </button>
              )}
            </div>
          </div>
        </div>

        {filePreview && (
          <div className="file-preview">
            <h3>File Preview</h3>
            <img src={filePreview} alt="File preview" className="preview-image" />
          </div>
        )}

        {useWebcam && (
          <div className="webcam-container">
            <h3>Live Camera Feed</h3>
            <video ref={videoRef} autoPlay muted playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {analysis && (
          <div className="analysis-results">
            <h2>Analysis Results</h2>
            <div className={`posture-status ${analysis.has_bad_posture ? 'bad-posture' : 'good-posture'}`}>
              {analysis.has_bad_posture ? '❌ Bad Posture Detected' : '✅ Good Posture'}
            </div>
            {analysis.issues && analysis.issues.length > 0 && (
              <div className="issues-list">
                <h3>Issues Found</h3>
                <ul>
                  {analysis.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.annotated_image && (
              <div className="annotated-image">
                <h3>Pose Analysis</h3>
                <img src={analysis.annotated_image} alt="Annotated pose" className="result-image" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;