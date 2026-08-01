import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setAuthToken: (token: string) => ipcRenderer.send('set-auth-token', token),
  setMonitoringState: (state: boolean) => ipcRenderer.send('set-monitoring-state', state),
  onMonitoringStateChanged: (callback: (state: boolean) => void) => {
    const subscription = (_event: any, state: boolean) => callback(state);
    ipcRenderer.on('monitoring-state-changed', subscription);
    return () => ipcRenderer.removeListener('monitoring-state-changed', subscription);
  },
});
