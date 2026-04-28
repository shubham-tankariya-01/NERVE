import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import FloatingManualButton from '../common/FloatingManualButton';

export default function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-canvas)' }}>
      <div style={{ position: 'relative', zIndex: 1000 }}>
        <Topbar />
      </div>
      <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <Outlet />
        </main>
      </div>
      <FloatingManualButton />
    </div>
  );
}
