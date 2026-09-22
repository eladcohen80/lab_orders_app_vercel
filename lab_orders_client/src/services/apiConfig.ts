const API_BASE_URL = import.meta.env.VITE_API_URL as string;

if (!API_BASE_URL) {
  console.warn('VITE_API_URL is not set. Falling back to http://localhost:3000');
}

export const BASE_URL = API_BASE_URL || 'http://localhost:3000';
