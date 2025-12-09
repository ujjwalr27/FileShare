import React from 'react';
import { X, AlertTriangle, Shield, Lock } from 'lucide-react';

interface PIIWarning {
  has_pii: boolean;
  risk_level: 'low' | 'medium' | 'high';
  summary: {
    person_names: number;
    emails: number;
    phones: number;
    ssns: number;
    credit_cards: number;
  };
}

interface PIIWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  piiWarning: PIIWarning;
  onProceed: () => void;
  onCancel: () => void;
}

const PIIWarningModal: React.FC<PIIWarningModalProps> = ({
  isOpen,
  onClose,
  fileName,
  piiWarning,
  onProceed,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b-2 ${getRiskColor(piiWarning.risk_level)}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertTriangle size={24} className={piiWarning.risk_level === 'high' ? 'text-red-600' : 'text-orange-600'} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {getRiskIcon(piiWarning.risk_level)} Personal Information Detected
              </h2>
              <p className="text-sm text-gray-600 mt-1">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Risk Level */}
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(piiWarning.risk_level)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm uppercase tracking-wide">Risk Level</span>
              <span className="text-2xl font-bold uppercase">{piiWarning.risk_level}</span>
            </div>
            <p className="text-sm">
              {piiWarning.risk_level === 'high' && 'This file contains sensitive personal information that requires special protection.'}
              {piiWarning.risk_level === 'medium' && 'This file contains personal information that should be handled carefully.'}
              {piiWarning.risk_level === 'low' && 'This file contains some personal information.'}
            </p>
          </div>

          {/* PII Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-sm mb-3 text-gray-700 uppercase tracking-wide">
              📊 Detected Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {piiWarning.summary.person_names > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">👤 Names:</span>
                  <span className="font-bold text-gray-800">{piiWarning.summary.person_names}</span>
                </div>
              )}
              {piiWarning.summary.emails > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📧 Emails:</span>
                  <span className="font-bold text-gray-800">{piiWarning.summary.emails}</span>
                </div>
              )}
              {piiWarning.summary.phones > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📱 Phones:</span>
                  <span className="font-bold text-gray-800">{piiWarning.summary.phones}</span>
                </div>
              )}
              {piiWarning.summary.ssns > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-red-600" />
                    SSNs:
                  </span>
                  <span className="font-bold text-red-600">{piiWarning.summary.ssns}</span>
                </div>
              )}
              {piiWarning.summary.credit_cards > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-red-600" />
                    Credit Cards:
                  </span>
                  <span className="font-bold text-red-600">{piiWarning.summary.credit_cards}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-sm mb-2 text-blue-800 flex items-center gap-2">
              <Shield size={16} />
              Security Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-blue-900">
              {piiWarning.risk_level === 'high' && (
                <>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Consider encrypting this file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Restrict sharing to trusted users only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Enable password protection for shares</span>
                  </li>
                </>
              )}
              {piiWarning.risk_level === 'medium' && (
                <>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Be careful when sharing this file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Set expiration dates on shared links</span>
                  </li>
                </>
              )}
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>This file will be marked as containing PII</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
          >
            Cancel Upload
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            Proceed Securely
          </button>
        </div>
      </div>
    </div>
  );
};

export default PIIWarningModal;
