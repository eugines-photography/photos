import React from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import About from '../app/about';
import '../app/globals.css';
import './analytics';

const root = document.getElementById('root')!;
const app = <React.StrictMode><About/></React.StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
