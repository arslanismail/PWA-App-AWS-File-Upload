import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_GATEWAY_URL = 'https://n4wrt8kby4.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [file, setFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Handle PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const getSignedUrl = async (fileName, fileType) => {
    try {
      console.log('Requesting signed URL for:', { fileName, fileType });
      const response = await axios.post(`${API_GATEWAY_URL}/getSignedUrl`, {
        fileName,
        fileType,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Signed URL response:', response.data);
      return response.data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error.response?.data || error.message);
      throw error;
    }
  };

  const uploadFile = async (file) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting file upload:', file.name);
      const signedUrl = await getSignedUrl(file.name, file.type);
      
      console.log('Uploading to signed URL:', signedUrl);
      await axios.put(signedUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
      
      console.log('File uploaded successfully');
      await fetchUploadedFiles();
    } catch (error) {
      console.error('Error uploading file:', error.response?.data || error.message);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching uploaded files');
      const response = await axios.get(`${API_GATEWAY_URL}/listFiles`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Files response:', response.data);
      setUploadedFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error.response?.data || error.message);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (file) {
      await uploadFile(file);
      setFile(null);
    }
  };

  const handleFileView = (file) => {
    // Open file in new tab with specific parameters to prevent download
    const viewerUrl = `${file.url}&response-content-disposition=inline`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">AWS File Upload</h1>
                
                {isOffline && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
                    You are currently offline. Some features may be limited.
                  </div>
                )}

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    {error}
                  </div>
                )}

                {deferredPrompt && (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                    <button
                      onClick={handleInstallClick}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Install App
                    </button>
                  </div>
                )}

                <div className="mb-8">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {file && (
                    <button
                      onClick={handleUpload}
                      disabled={loading || isOffline}
                      className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                    >
                      {loading ? 'Uploading...' : 'Upload File'}
                    </button>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
                  {loading ? (
                    <p>Loading files...</p>
                  ) : uploadedFiles.length > 0 ? (
                    <div className="file-list">
                      {uploadedFiles.map((file) => (
                        <div key={file.name} className="file-item">
                          <span>{file.name}</span>
                          <div className="file-actions">
                            <button onClick={() => handleFileView(file)}>
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No files uploaded yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 