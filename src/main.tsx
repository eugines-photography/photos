import React from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import Gallery from '../app/page';
import '../app/globals.css';
import './analytics';

const root = document.getElementById('root')!;
const app = <React.StrictMode><Gallery/></React.StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
