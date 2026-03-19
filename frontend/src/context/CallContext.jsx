import { createContext, useContext, useState, useCallback, useRef } from 'react';

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
    const [requestedCall, setRequestedCall] = useState(null);
    const makeCallHandlerRef = useRef(null);

    // External components can call this to initiate a call
    const makeCall = useCallback((phoneNumber) => {
        if (!phoneNumber) {
            console.error('Phone number is required to make a call');
            return;
        }

        console.log('📞 CallContext: Requesting call to', phoneNumber);

        // If VoipWidget has registered its handler, use it
        if (makeCallHandlerRef.current) {
            makeCallHandlerRef.current(phoneNumber);
        } else {
            // Otherwise, store the request for when VoipWidget mounts
            setRequestedCall(phoneNumber);
        }
    }, []);

    // VoipWidget registers its call handler here
    const registerCallHandler = useCallback((handler) => {
        makeCallHandlerRef.current = handler;
        console.log('📡 CallContext: VoipWidget call handler registered');
    }, []);

    const value = {
        makeCall,
        registerCallHandler,
        requestedCall,
        setRequestedCall,
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

// Custom hook to use call functionality
export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within CallProvider');
    }
    return context;
};
