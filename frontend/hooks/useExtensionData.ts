// Hook to check for data from browser extension
import { useEffect, useState } from 'react';

export function useExtensionData() {
  const [extensionData, setExtensionData] = useState<any>(null);

  useEffect(() => {
    // Check if data exists in localStorage (set by extension)
    const checkForExtensionData = () => {
      try {
        const data = localStorage.getItem('homeEstimateExtensionData');
        if (data) {
          const parsed = JSON.parse(data);
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
