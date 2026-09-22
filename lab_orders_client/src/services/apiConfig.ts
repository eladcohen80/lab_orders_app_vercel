const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '');

const PRODUCTION_URL = 'https://labordersserver-delta.vercel.app';

export const BASE_URL = API_BASE_URL || (import.meta.env.PROD ? PRODUCTION_URL : 'http://localhost:3000');
