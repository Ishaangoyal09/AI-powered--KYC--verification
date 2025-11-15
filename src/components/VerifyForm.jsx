import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { verifyKYC, verifyKYCBatch } from '../api';

/**
 * VerifyForm Component
 * Form for submitting KYC verification data to FastAPI backend
 */
const VerifyForm = ({ onVerificationComplete, isLoading, setIsLoading, setError, apiStatus, onBatchComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    documentNumber: '',
    address: '',
    documentType: 'AADHAR'
  });
  const [batchResults, setBatchResults] = useState(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    if (!formData.documentNumber.trim()) {
      setError('Please enter a document number');
      return;
    }

    if (apiStatus === 'offline') {
      setError('Backend API is offline. Please ensure the server is running.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyKYC(formData);
      
      if (result.success) {
        // Transform backend response to frontend format
        const transformedResult = {
          id: result.data.id,
          timestamp: result.data.timestamp,
          name: result.data.name,
          documentNumber: result.data.documentNumber,
          aadharNumber: result.data.documentNumber, // For backward compatibility
          documentType: formData.documentType,
          fraudProbability: result.data.fraudProbability,
          riskLevel: result.data.riskLevel,
          status: result.data.status,
          confidence: result.data.confidence,
          details: result.data.details,
          message: result.data.message
        };

        onVerificationComplete(transformedResult);
        
        // Reset form
        setFormData({
          name: '',
          documentNumber: '',
          address: '',
          documentType: 'AADHAR'
        });
      } else {
        setError(result.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    if (apiStatus === 'offline') {
      setError('Backend API is offline. Please ensure the server is running.');
      return;
    }

    setIsProcessingBatch(true);
    setError(null);
    setBatchResults(null);
    setUploadedFileName(file.name);

    try {
      const result = await verifyKYCBatch(file);
      
      if (result.success) {
        setBatchResults(result.data);
        
        // Add successful results to history without navigation
        if (onBatchComplete) {
          const successfulResults = result.data.results
            .filter(item => !item.error)
            .map(item => ({
              id: item.id,
              timestamp: item.timestamp,
              name: item.name,
              documentNumber: item.documentNumber,
              aadharNumber: item.documentNumber,
              documentType: item.documentType,
              fraudProbability: item.fraudProbability,
              riskLevel: item.riskLevel,
              status: item.status,
              confidence: item.confidence,
              details: item.details,
              message: item.message
            }));
          onBatchComplete(successfulResults);
        }
      } else {
        setError(result.error || 'Failed to process CSV file');
      }
    } catch (error) {
      setError(error.message || 'An unexpected error occurred while processing CSV');
    } finally {
      setIsProcessingBatch(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Identity Verification</h2>
        
        {/* CSV Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File (Batch Processing)
          </label>
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            isProcessingBatch 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-500'
          }`}>
            <Upload className={`w-12 h-12 mx-auto mb-2 ${
              isProcessingBatch ? 'text-blue-500 animate-pulse' : 'text-gray-400'
            }`} />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csvUpload"
              disabled={isProcessingBatch}
            />
            <label 
              htmlFor="csvUpload" 
              className={`cursor-pointer ${isProcessingBatch ? 'pointer-events-none' : ''}`}
            >
              {isProcessingBatch ? (
                <div>
                  <span className="text-blue-600 font-medium">Processing CSV file...</span>
                  <p className="text-sm text-gray-500 mt-1">Please wait</p>
                </div>
              ) : (
                <div>
                  <span className="text-blue-600 hover:text-blue-700 font-medium">Upload a CSV file</span>
                  <p className="text-sm text-gray-500 mt-1">CSV format: Full Name, Document Number, Address, Document Type</p>
                </div>
              )}
            </label>
          </div>
          {uploadedFileName && !isProcessingBatch && (
            <p className="text-sm text-gray-600 mt-2">
              Last uploaded: <span className="font-medium">{uploadedFileName}</span>
            </p>
          )}
        </div>

        {/* Batch Results Display */}
        {batchResults && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Batch Processing Results</h3>
              <button
                onClick={() => {
                  setBatchResults(null);
                  setUploadedFileName(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{batchResults.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{batchResults.successful}</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{batchResults.failed}</p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doc Number</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batchResults.results.map((item, idx) => (
                    <tr key={idx} className={item.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-600">{item.row}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                      <td className="px-3 py-2 text-gray-600">{item.documentNumber}</td>
                      <td className="px-3 py-2">
                        {item.error ? (
                          <span className="text-red-600 text-xs">Error</span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                            item.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.riskLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.error ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : item.status === 'Verified' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {item.error ? (
                          <span className="text-xs text-red-600" title={item.error}>Error</span>
                        ) : (
                          `${item.fraudProbability.toFixed(2)}%`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">OR</span>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Document Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="documentNumber"
              name="documentNumber"
              value={formData.documentNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="XXXX-XXXX-XXXX"
              maxLength="12"
              required
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter complete address"
              rows="3"
            />
          </div>

          <div>
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              id="documentType"
              name="documentType"
              value={formData.documentType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="AADHAR">AADHAR Card</option>
              <option value="PAN">PAN Card</option>
              <option value="UTILITY">Utility Bill</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.name || !formData.documentNumber || apiStatus === 'offline'}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : apiStatus === 'offline' ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Backend Offline
              </>
            ) : (
              'Verify Identity'
            )}
          </button>

          {apiStatus === 'offline' && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Start backend: <code className="bg-gray-100 px-2 py-1 rounded">cd backend && uvicorn main:app --reload</code>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default VerifyForm;

