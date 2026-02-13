import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Drivebar from '../partials/Drivebar';
import Header from '../partials/Header';

const DriveLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-[100dvh] overflow-hidden'>
      <Drivebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className='relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto'>
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className='grow'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DriveLayout;
