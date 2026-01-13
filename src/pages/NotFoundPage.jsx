/**
 * NotFoundPage - Admin Panel 404 Page
 * 
 * PURPOSE:
 * Dedicated 404 page for invalid admin routes
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-orange-500 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-lg text-gray-600 mb-8">
            The admin page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-500 hover:text-white transition-colors duration-200 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-semibold"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8 border-t border-gray-300">
          <p className="text-gray-600 mb-4 flex items-center justify-center gap-2">
            <FileQuestion className="w-4 h-4" />
            Looking for something? Try these:
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => navigate('/users')} 
              className="text-orange-500 hover:underline font-medium"
            >
              Users
            </button>
            <button 
              onClick={() => navigate('/salons')} 
              className="text-orange-500 hover:underline font-medium"
            >
              Salons
            </button>
            <button 
              onClick={() => navigate('/appointments')} 
              className="text-orange-500 hover:underline font-medium"
            >
              Appointments
            </button>
            <button 
              onClick={() => navigate('/rm-management')} 
              className="text-orange-500 hover:underline font-medium"
            >
              RM Management
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
