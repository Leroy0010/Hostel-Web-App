import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App.tsx';

// NOTE: ThemeProvider is applied once, inside App.tsx. It was previously
// duplicated here as well, which meant two separate ThemeProvider instances
// each reading/writing the same localStorage key on mount — harmless but
// wasteful, and a common source of confusing theme-flicker bugs later.
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
