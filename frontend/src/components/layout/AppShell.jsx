import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import FloatingManualButton from '../common/FloatingManualButton';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import BottomNav from './BottomNav';

export default function AppShell() {
  const { isMobile } = useBreakpoint();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-canvas)' }}>
      <div style={{ position: 'relative', zIndex: 1000 }}>
        <Topbar />
      </div>
      <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        {!isMobile && <Sidebar />}
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          position: 'relative',
          paddingBottom: isMobile ? '64px' : '0px'
        }}>
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <FloatingManualButton />
    </div>
  );
}
