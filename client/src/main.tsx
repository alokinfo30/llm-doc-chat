import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import PDF text/annotation layer styles required by react-pdf
// These provide the correct positioning and styling for selectable text and annotations.
// Path may vary by react-pdf version; the ESM paths work with react-pdf v10+.
// Use the distributable CSS paths present in the installed `react-pdf` package.
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
