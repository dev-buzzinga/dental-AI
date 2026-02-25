import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((text, type = 'message') => {
        setToast({ text, type });
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const iconMap = {
        success: 'fa-circle-check',
        ai: 'fa-robot',
        message: 'fa-message',
        error: 'fa-circle-exclamation',
    };

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type}`}>
                        <i className={`fas ${iconMap[toast.type] || iconMap.message}`} />
                        <span>{toast.text}</span>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};
