import axios from 'axios';
import { useAuthStore } from '../store/authStore';

import { Capacitor } from '@capacitor/core';

export const getServerUrls = () => {
  // 1. Check custom saved URL in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedUrl = window.localStorage.getItem('clipvault-api-url');
    if (savedUrl) {
      return {
        api_url: savedUrl,
        socket_url: savedUrl.replace(/\/api\/?$/, '')
      };
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;

  // 2. Check if we are on a native mobile app (Capacitor)
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();

    // If an envUrl is defined and is NOT pointing to localhost/127.0.0.1 (e.g. it is a real LAN IP or production URL)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return {
        api_url: envUrl,
        socket_url: envUrl.replace(/\/api\/?$/, '')
      };
    }

    // Default to the correct native loopbacks (Android uses 10.0.2.2 to access host machine, iOS uses localhost)
    if (platform === 'android') {
      return {
        api_url: 'http://10.0.2.2:4000/api',
        socket_url: 'http://10.0.2.2:4000'
      };
    }
    return {
      api_url: 'http://localhost:4000/api',
      socket_url: 'http://localhost:4000'
    };
  }

  // 3. Web environment variable check
  if (envUrl) {
    return {
      api_url: envUrl,
      socket_url: envUrl.replace(/\/api\/?$/, '')
    };
  }
  
  // 4. Web environment hostname fallback
  if (typeof window !== 'undefined' && window.location) {
    return {
      api_url: `http://${window.location.hostname}:4000/api`,
      socket_url: `http://${window.location.hostname}:4000`
    };
  }
  
  return {
    api_url: 'http://localhost:4000/api',
    socket_url: 'http://localhost:4000'
  };
};

const initialUrls = getServerUrls();
console.log('ClipVault API Client initialized with URL:', initialUrls.api_url);

export const api = axios.create({
  baseURL: initialUrls.api_url,
});

// Request interceptor to add the auth token to headers and set dynamic base URL
api.interceptors.request.use(
  (config) => {
    // Dynamically resolve base URL on each request to support settings changes
    const urls = getServerUrls();
    config.baseURL = urls.api_url;

    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
