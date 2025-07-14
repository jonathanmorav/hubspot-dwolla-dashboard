import { useState, useEffect, useCallback, useRef } from 'react';
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
export function useDebouncedCallback(callback, delay) {
    const timeoutRef = useRef(null);
    const callbackRef = useRef(callback);
    // Update callback ref when it changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);
    const debouncedCallback = useCallback((...args) => {
        cancel();
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay, cancel]);
    // Cleanup on unmount
    useEffect(() => {
        return cancel;
    }, [cancel]);
    return [debouncedCallback, cancel];
}
