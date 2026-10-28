import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initPwa} from './services/pwa';

initPwa();
createRoot(document.getElementById('root')!).render(<App />);
