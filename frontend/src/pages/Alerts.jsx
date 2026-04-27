import React from 'react';
import { useAppWebSocket } from '../context/WebSocketContext';
import AlertPanel from '../old_components/AlertPanel';
import DisruptionGenerator from '../old_components/DisruptionGenerator';
import AgentLog from '../old_components/AgentLog';

export default function Alerts() {
  const { data, connected } = useAppWebSocket();
  const alerts = data?.alerts || [];
  const weather = data?.weather || [];
  const agentLogs = data?.agent_logs || [];
  const timestamp = data?.timestamp;

  return (
    <div className="animate-slide-up dashboard-grid">
      <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ flex: 1 }}>
          <AlertPanel alerts={alerts} weather={weather} timestamp={timestamp} connected={connected} />
        </div>
        <div className="glass-panel" style={{ height: '300px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Multi-Agent Resolution Log</h2>
          <AgentLog logs={agentLogs} compact={false} forceExpanded={true} />
        </div>
      </div>
      <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel">
          <DisruptionGenerator onToast={(m) => console.log(m)} />
        </div>
      </div>
    </div>
  );
}
