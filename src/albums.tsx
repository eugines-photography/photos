import React from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import ExploreAlbums from '../app/explore-albums';
import '../app/globals.css';
import './analytics';

const root = document.getElementById('root')!;
const app = <React.StrictMode><ExploreAlbums/></React.StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
