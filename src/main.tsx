import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initPwa} from './services/pwa';
import {chooseEventTree} from './services/firestore';

initPwa();
// The real event or the rehearsal tree (an admin's switch), decided before anything reads or writes data.
chooseEventTree().then(() => createRoot(document.getElementById('root')!).render(<App />));
