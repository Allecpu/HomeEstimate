// Hook to check for data from browser extension
import { useEffect, useState } from 'react';

type ExtensionData = Record<string, unknown> | null;

export function useExtensionData() {
  const [extensionData, setExtensionData] = useState<ExtensionData>(null);

  useEffect(() => {
    // Check if data exists in localStorage (set by extension)
    const checkForExtensionData = () => {
      try {
        const data = localStorage.getItem('homeEstimateExtensionData');
        if (data) {
          const parsed: ExtensionData = JSON.parse(data);
          setExtensionData(parsed);
          // Clear after reading
          localStorage.removeItem('homeEstimateExtensionData');
        }
      } catch (error) {
        console.error('Error reading extension data:', error);
      }
    };

    // Check immediately
    checkForExtensionData();

    // Listen for storage events (when extension sets data)
    window.addEventListener('storage', checkForExtensionData);

    return () => {
      window.removeEventListener('storage', checkForExtensionData);
    };
  }, []);

  return extensionData;
}
