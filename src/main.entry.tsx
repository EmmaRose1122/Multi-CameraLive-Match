// Ensure window.fetch setter compatibility in iframe environments
if (typeof window !== 'undefined') {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    if (desc && !desc.set && desc.get) {
      let _customFetch = window.fetch ? window.fetch.bind(window) : undefined;
      Object.defineProperty(window, 'fetch', {
        get: () => _customFetch,
        set: (fn) => { _customFetch = fn; },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    // Ignore if not permitted
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
