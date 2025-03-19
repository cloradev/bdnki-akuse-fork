// Import the XHR patch first, before any other imports
import '../modules/xhr-patch';
// Import the safe-headers utility to patch fetch
import '../modules/safe-headers';

import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
// window.electron.ipcRenderer.once('ipc-example', (arg: any) => {
//   console.log(arg);
// });
// window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
