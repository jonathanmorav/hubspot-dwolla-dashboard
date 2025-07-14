import { useRef, useCallback, useEffect } from 'react';
import { logger } from '../utils/logger';
export function useMessageHandler() {
    const abortControllerRef = useRef(null);
    const timeoutIdRef = useRef(null);
    // Cleanup function
    const cleanup = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
        }
    }, []);
    // Send message with cancellation support
    const sendMessage = useCallback(async (message, options = {}) => {
        const { timeout = 30000, retries = 0 } = options;
        // Cancel any pending request
        cleanup();
        // Create new abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const attemptRequest = async (retriesLeft) => {
            try {
                // Create timeout
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutIdRef.current = setTimeout(() => {
                        controller.abort();
                        reject(new Error(`Request timeout after ${timeout}ms`));
                    }, timeout);
                });
                // Create message promise
                const messagePromise = new Promise((resolve, reject) => {
                    // Check if already aborted
                    if (controller.signal.aborted) {
                        reject(new Error('Request was cancelled'));
                        return;
                    }
                    // Listen for abort
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error('Request was cancelled'));
                    });
                    // Send message
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        if (response?.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        resolve(response);
                    });
                });
                // Race between timeout and message
                const result = await Promise.race([messagePromise, timeoutPromise]);
                // Clear timeout on success
                if (timeoutIdRef.current) {
                    clearTimeout(timeoutIdRef.current);
                    timeoutIdRef.current = null;
                }
                return result;
            }
            catch (error) {
                // Clear timeout on error
                if (timeoutIdRef.current) {
                    clearTimeout(timeoutIdRef.current);
                    timeoutIdRef.current = null;
                }
                // Check if we should retry
                if (retriesLeft > 0 && !controller.signal.aborted) {
                    logger.warn('Retrying request', {
                        message: message.type,
                        retriesLeft,
                        error: error.message
                    });
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries - retriesLeft) * 1000));
                    return attemptRequest(retriesLeft - 1);
                }
                // Log final error
                logger.error('Message request failed', error, {
                    message: message.type,
                    timeout,
                    retries
                });
                throw error;
            }
        };
        return attemptRequest(retries);
    }, [cleanup]);
    // Cancel current request
    const cancel = useCallback(() => {
        cleanup();
    }, [cleanup]);
    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);
    return {
        sendMessage,
        cancel,
        isLoading: () => abortControllerRef.current !== null
    };
}
