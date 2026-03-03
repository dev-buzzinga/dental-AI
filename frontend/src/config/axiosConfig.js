import axios from "axios";

// Default axios instance: no token, behaves like before
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
    withCredentials: false,
});

// Auth axios instance: automatically attaches token from localStorage
const authAxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
    withCredentials: false,
});

authAxiosInstance.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");

            if (token) {
                config.headers = config.headers || {};
                config.headers["Authorization"] = `Bearer ${token}`;
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export { authAxiosInstance };
export default axiosInstance;

