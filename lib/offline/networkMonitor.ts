import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

/**
 * Network Monitor Service
 * Tracks internet connectivity and quality
 */

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  effectiveType?: string;
};

// Global network state
let currentNetworkStatus: NetworkStatus = {
  isConnected: false,
  isInternetReachable: null,
  type: NetInfoStateType.unknown,
  quality: 'offline',
};

// Listeners for network changes
const networkChangeListeners: Array<(status: NetworkStatus) => void> = [];

/**
 * Initialize network monitoring
 * Should be called once when app starts
 */
export function initNetworkMonitoring(): () => void {
  console.log('Initializing network monitoring...');

  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const newStatus = parseNetworkState(state);
    
    // Only notify if status actually changed
    if (hasNetworkStatusChanged(currentNetworkStatus, newStatus)) {
      console.log('Network status changed:', newStatus);
      currentNetworkStatus = newStatus;
      notifyListeners(newStatus);
    }
  });

  // Fetch initial state
  NetInfo.fetch().then((state) => {
    currentNetworkStatus = parseNetworkState(state);
    console.log('Initial network status:', currentNetworkStatus);
    notifyListeners(currentNetworkStatus);
  });

  return unsubscribe;
}

/**
 * Parse NetInfo state into our NetworkStatus format
 */
function parseNetworkState(state: NetInfoState): NetworkStatus {
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable;

  // Determine connection quality
  let quality: NetworkStatus['quality'] = 'offline';
  
  if (isConnected && isInternetReachable) {
    // Check connection type for quality estimation
    if (state.type === NetInfoStateType.wifi) {
      quality = 'excellent';
    } else if (state.type === NetInfoStateType.cellular) {
      // @ts-ignore - details.cellularGeneration exists on cellular connections
      const generation = state.details?.cellularGeneration;
      if (generation === '5g') {
        quality = 'excellent';
      } else if (generation === '4g') {
        quality = 'good';
      } else {
        quality = 'poor';
      }
    } else if (state.type === NetInfoStateType.ethernet) {
      quality = 'excellent';
    } else {
      quality = 'good'; // Other types (bluetooth, wimax, etc.)
    }
  } else if (isConnected && isInternetReachable === null) {
    // Connected but internet reachability unknown
    quality = 'poor';
  }

  return {
    isConnected,
    isInternetReachable,
    type: state.type,
    quality,
    // @ts-ignore - effectiveType exists on some connection types
    effectiveType: state.details?.effectiveType,
  };
}

/**
 * Check if network status has meaningfully changed
 */
function hasNetworkStatusChanged(
  oldStatus: NetworkStatus,
  newStatus: NetworkStatus
): boolean {
  return (
    oldStatus.isConnected !== newStatus.isConnected ||
    oldStatus.isInternetReachable !== newStatus.isInternetReachable ||
    oldStatus.type !== newStatus.type ||
    oldStatus.quality !== newStatus.quality
  );
}

/**
 * Notify all listeners of network status change
 */
function notifyListeners(status: NetworkStatus): void {
  networkChangeListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (error) {
      console.error('Error in network change listener:', error);
    }
  });
}

/**
 * Get current network status
 */
export async function getCurrentNetworkStatus(): Promise<NetworkStatus> {
  try {
    const state = await NetInfo.fetch();
    return parseNetworkState(state);
  } catch (error) {
    console.error('Error fetching network status:', error);
    return currentNetworkStatus;
  }
}

/**
 * Subscribe to network status changes
 * Returns unsubscribe function
 */
export function subscribeToNetworkChanges(
  callback: (status: NetworkStatus) => void
): () => void {
  networkChangeListeners.push(callback);

  // Immediately call with current status
  callback(currentNetworkStatus);

  // Return unsubscribe function
  return () => {
    const index = networkChangeListeners.indexOf(callback);
    if (index > -1) {
      networkChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const status = await getCurrentNetworkStatus();
  return status.isConnected && status.isInternetReachable === true;
}

/**
 * Check if device is offline
 */
export async function isOffline(): Promise<boolean> {
  return !(await isOnline());
}

/**
 * Wait for network connection
 * Returns a promise that resolves when online
 * Rejects after timeout
 */
export function waitForConnection(timeoutMs: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Network connection timeout'));
    }, timeoutMs);

    const unsubscribe = subscribeToNetworkChanges((status) => {
      if (status.isConnected && status.isInternetReachable) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * React hook for network status
 * Returns current network status and updates when it changes
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(currentNetworkStatus);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = subscribeToNetworkChanges((newStatus) => {
      setStatus(newStatus);
    });

    // Fetch fresh status
    getCurrentNetworkStatus().then((freshStatus) => {
      setStatus(freshStatus);
    });

    return unsubscribe;
  }, []);

  return status;
}

/**
 * React hook for simple online/offline status
 */
export function useOnlineStatus(): boolean {
  const networkStatus = useNetworkStatus();
  return networkStatus.isConnected && networkStatus.isInternetReachable === true;
}

/**
 * Test network speed (rough estimation)
 * Downloads a small test file and measures time
 */
export async function testNetworkSpeed(): Promise<{
  speed: 'fast' | 'medium' | 'slow' | 'offline';
  latencyMs: number;
}> {
  try {
    const startTime = Date.now();
    
    // Use a small test endpoint (you can replace with your own)
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    const latencyMs = Date.now() - startTime;

    let speed: 'fast' | 'medium' | 'slow' | 'offline';
    if (response.ok) {
      if (latencyMs < 200) {
        speed = 'fast';
      } else if (latencyMs < 500) {
        speed = 'medium';
      } else {
        speed = 'slow';
      }
    } else {
      speed = 'offline';
    }

    return { speed, latencyMs };
  } catch (error) {
    console.error('Error testing network speed:', error);
    return { speed: 'offline', latencyMs: -1 };
  }
}

/**
 * Check if network quality is good enough for sync
 */
export async function isGoodEnoughForSync(): Promise<boolean> {
  const status = await getCurrentNetworkStatus();
  
  if (!status.isConnected || !status.isInternetReachable) {
    return false;
  }

  // Don't sync on very poor connections
  return status.quality !== 'poor';
}

