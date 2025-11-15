import React from 'react';
import { CheckCircle, AlertCircle, XCircle, TrendingUp, Shield, FileText } from 'lucide-react';

/**
 * ResultCard Component
 * Displays fraud detection results with colored alerts and detailed information
 */
const ResultCard = ({ result, onNewVerification }) => {
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No verification results available</h2>
          <p className="text-gray-500 mb-4">Please perform a verification first.</p>
          {onNewVerification && (
            <button 
              onClick={onNewVerification} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Verification
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine colors based on risk level
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          text: 'text-green-600',
          badge: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: AlertCircle,
          iconColor: 'text-yellow-600'
        };
      case 'High':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-600',
          badge: 'bg-red-100 text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          text: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          iconColor: 'text-gray-600'
        };
    }
  };

  const getStatusColor = (status) => {
    return status === 'Verified' ? 'text-green-600' : 'text-red-600';
  };

  const getProbabilityColor = (probability) => {
    if (probability < 30) return 'text-green-600';
    if (probability < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const colors = getRiskColor(result.riskLevel);
  const StatusIcon = colors.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Main Result Card */}
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Verification Result</h2>
          <StatusIcon className={`w-8 h-8 ${colors.iconColor}`} />
        </div>

        {/* Verification ID and Timestamp */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Verification ID</p>
            <p className="text-lg font-semibold text-gray-800">{result.id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Timestamp</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alert Card - Status and Risk Level */}
        <div className={`mb-6 p-6 border-2 rounded-lg ${colors.bg} ${colors.border}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${colors.iconColor}`} />
              <span className="text-lg font-semibold text-gray-800">Status</span>
            </div>
            <span className={`text-xl font-bold ${getStatusColor(result.status)}`}>
              {result.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className={`w-6 h-6 ${colors.iconColor}`} />
              <span className="text-lg font-semibold text-gray-800">Risk Level</span>
            </div>
            <span className={`px-4 py-2 rounded-full text-lg font-bold ${colors.badge}`}>
              {result.riskLevel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className={`w-6 h-6 ${colors.iconColor}`} />
              <span className="text-lg font-semibold text-gray-800">Fraud Probability</span>
            </div>
            <span className={`text-3xl font-bold ${getProbabilityColor(result.fraudProbability)}`}>
              {result.fraudProbability.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-800">Confidence Score</span>
            <span className="text-2xl font-bold text-blue-600">
              {result.confidence.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Verification Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">Verification Details</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Name</span>
              <span className="font-semibold text-gray-800">{result.name}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Document Number</span>
              <span className="font-semibold text-gray-800">{result.documentNumber || result.aadharNumber}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Document Type</span>
              <span className="font-semibold text-gray-800">{result.documentType}</span>
            </div>
            
            {result.details && (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Document Authenticity</span>
                  <span className={`font-semibold ${
                    result.details.documentAuthenticity === 'Valid' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.details.documentAuthenticity}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Address Verification</span>
                  <span className={`font-semibold ${
                    result.details.addressVerification === 'Verified' 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`}>
                    {result.details.addressVerification}
                  </span>
                </div>
                
                {result.details.anomalyScore && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Anomaly Score</span>
                    <span className="font-semibold text-gray-800">{result.details.anomalyScore}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message */}
        {result.message && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.status === 'Verified' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              result.status === 'Verified' ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </p>
          </div>
        )}

        {/* Action Button */}
        {onNewVerification && (
          <button 
            onClick={onNewVerification} 
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            New Verification
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultCard;

