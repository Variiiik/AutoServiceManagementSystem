import React, { useState } from 'react';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Vehicles } from './components/Vehicles';
import { WorkOrders } from './components/WorkOrders';
import { Inventory } from './components/Inventory';
import { Appointments } from './components/Appointments';
import { Billing } from './components/Billing';

function App() {
  const auth = useAuthProvider();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <AuthContext.Provider value={auth}>
        <Auth />
      </AuthContext.Provider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'customers': return <Customers />;
      case 'vehicles': return <Vehicles />;
      case 'work-orders': return <WorkOrders />;
      case 'inventory': return <Inventory />;
      case 'appointments': return <Appointments />;
      case 'billing': return <Billing />;
      default: return <Dashboard />;
    }
  };

  return (
    <AuthContext.Provider value={auth}>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </AuthContext.Provider>
  );
}

export default App;