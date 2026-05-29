const DEV_API_URL = "http://localhost:5000";

export const API_BASE_URL = import.meta.env.DEV 
  ? DEV_API_URL 
  : (import.meta.env.VITE_API_URL || window.location.origin);

export const getApiUrl = (path) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
