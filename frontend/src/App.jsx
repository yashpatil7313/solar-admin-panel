import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ConsumersPage from './pages/ConsumersPage';
import RTSPage from './pages/RTSPage';
import NationalPortalPage from './pages/NationalPortalPage';
import DocumentsUploadPage from './pages/DocumentsUploadPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('consumers');
  const [preselectedConsumerId, setPreselectedConsumerId] = useState('');

  // Helper to jump directly to Document Upload for a specific consumer
  const handleJumpToDocuments = (consumerId) => {
    setPreselectedConsumerId(String(consumerId));
    setActiveTab('documents');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'consumers':
        return <ConsumersPage onUploadDocs={handleJumpToDocuments} setActiveTab={setActiveTab} />;
      case 'rts':
        return <RTSPage onUploadDocs={handleJumpToDocuments} />;
      case 'national-portal':
        return <NationalPortalPage onUploadDocs={handleJumpToDocuments} />;
      case 'documents':
        return <DocumentsUploadPage initialConsumerId={preselectedConsumerId} />;
      default:
        return <ConsumersPage onUploadDocs={handleJumpToDocuments} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActivePage()}
      </main>
      <footer className="bg-white/80 backdrop-blur border-t border-slate-200/80 py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="font-medium text-slate-700">
            SolarAdmin Pro &mdash; Solar Installation &amp; Subsidy Management Platform
          </div>
          <div>
            &copy; {new Date().getFullYear()} All Rights Reserved &bull; RTS &amp; National Portal Operations
          </div>
        </div>
      </footer>
    </div>
  );
}
