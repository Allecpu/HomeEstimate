// Popup script for HomeEstimate browser extension

let extractedData = null;

// DOM elements
const loadingEl = document.getElementById('loading');
const successEl = document.getElementById('success');
const errorEl = document.getElementById('error');
const dataPreviewEl = document.getElementById('dataPreview');
const extractBtn = document.getElementById('extractBtn');
const analyzePhotosBtn = document.getElementById('analyzePhotosBtn');
const sendBtn = document.getElementById('sendBtn');
const copyBtn = document.getElementById('copyBtn');
const errorMessageEl = document.getElementById('errorMessage');

function deriveListingId(url) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const segments = [parsed.hostname, ...parsed.pathname.split('/')].filter(Boolean);
    const combined = segments.join('-');
    const normalized = combined
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!normalized) {
      return undefined;
    }
    return normalized.length > 64 ? normalized.slice(-64) : normalized;
  } catch (error) {
    console.warn('Unable to derive listing id from url', url, error);
    return undefined;
  }
}

const FIELD_MAP = [
  { key: 'title', label: 'Titolo' },
  {
    key: 'price',
    label: 'Prezzo',
    formatter: (value) => `\u20AC ${Number(value).toLocaleString('it-IT')}`
  },
  {
    key: 'pricePerSqm',
    label: 'Prezzo al m\u00B2',
    formatter: (value) => `\u20AC ${Number(value).toLocaleString('it-IT')}/m\u00B2`
  },
  {
    key: 'condoFeesMonthly',
    label: 'Spese condominiali',
    formatter: (value) => `\u20AC ${Number(value).toLocaleString('it-IT')} / mese`
  },
  { key: 'address', label: 'Indirizzo' },
  { key: 'city', label: 'Citt\u00E0' },
  { key: 'province', label: 'Provincia' },
  { key: 'postalCode', label: 'CAP' },
  {
    key: 'surface',
    label: 'Superficie',
    formatter: (value) => `${value} m\u00B2`
  },
  {
    key: 'surfaceCommercial',
    label: 'Superficie commerciale',
    formatter: (value) => `${value} m\u00B2`
  },
  {
    key: 'surfaceUsable',
    label: 'Superficie calpestabile',
    formatter: (value) => `${value} m\u00B2`
  },
  { key: 'rooms', label: 'Locali' },
  { key: 'bedrooms', label: 'Camere' },
  { key: 'bathrooms', label: 'Bagni' },
  { key: 'floor', label: 'Piano' },
  { key: 'totalFloors', label: 'Piani edificio' },
  { key: 'yearBuilt', label: 'Anno costruzione' },
  {
    key: 'hasElevator',
    label: 'Ascensore',
    formatter: formatBoolean
  },
  {
    key: 'hasParking',
    label: 'Parcheggio',
    formatter: formatBoolean
  },
  {
    key: 'parkingIncluded',
    label: 'Box incluso nel prezzo',
    formatter: formatBoolean
  },
  {
    key: 'hasBalcony',
    label: 'Balcone',
    formatter: formatBoolean
  },
  {
    key: 'hasGarden',
    label: 'Giardino',
    formatter: formatBoolean
  },
  {
    key: 'hasAirConditioning',
    label: 'Aria condizionata',
    formatter: formatBoolean
  },
  {
    key: 'hasCellar',
    label: 'Cantina',
    formatter: formatBoolean
  },
  { key: 'gardenType', label: 'Tipo giardino' },
  { key: 'propertyType', label: 'Tipologia' },
  { key: 'state', label: 'Stato' },
  { key: 'orientation', label: 'Orientamento' },
  { key: 'heating', label: 'Riscaldamento' },
  { key: 'energyClass', label: 'Classe energetica' },
  {
    key: 'energyPerformance',
    label: 'Prestazione energetica',
    formatter: (value) => `${Number(value).toLocaleString('it-IT')} kWh/m\u00B2 anno`
  },
  { key: 'description', label: 'Descrizione' },
  {
    key: 'photos',
    label: 'Foto',
    formatter: (value) => Array.isArray(value) ? `${value.length} elemento/i` : value
  },
  {
    key: 'photoStorageCount',
    label: 'Foto salvate',
    formatter: (value) => typeof value === 'number' ? `${value} file` : value
  },
  {
    key: 'photoStorageId',
    label: 'Archivio foto',
  },
  { key: 'url', label: 'URL' },
  { key: 'source', label: 'Fonte' }
];

function hasDisplayValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBoolean(value) {
  return value ? 'S\u00EC' : 'No';
}

function renderRow(label, value) {
  return `
    <div class="data-item">
      <span class="data-label">${escapeHtml(label)}:</span>
      <span class="data-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function renderDataPreview(data) {
  const renderedKeys = new Set();
  const items = [];

  FIELD_MAP.forEach((field) => {
    if (!(field.key in data)) return;

    const value = data[field.key];
    if (!hasDisplayValue(value)) {
      renderedKeys.add(field.key);
      return;
    }

    const displayValue = field.formatter ? field.formatter(value) : value;
    items.push(renderRow(field.label, displayValue));
    renderedKeys.add(field.key);
  });

  Object.entries(data).forEach(([key, value]) => {
    if (renderedKeys.has(key)) return;
    if (!hasDisplayValue(value)) return;

    const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
    items.push(renderRow(key, displayValue));
  });

  dataPreviewEl.innerHTML =
    items.join('') || '<div style="text-align: center; opacity: 0.7;">Nessun dato trovato</div>';
}

// Show loading state
function showLoading() {
  loadingEl.classList.remove('hidden');
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  dataPreviewEl.classList.add('hidden');
  sendBtn.classList.add('hidden');
  copyBtn.classList.add('hidden');
  errorMessageEl.classList.add('hidden');
}

// Show success state
function showSuccess(data) {
  loadingEl.classList.add('hidden');
  successEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  dataPreviewEl.classList.remove('hidden');
  sendBtn.classList.remove('hidden');
  copyBtn.classList.remove('hidden');
  errorMessageEl.classList.add('hidden');

  // Show analyze photos button if there are photos
  if (data.photos && data.photos.length > 0) {
    analyzePhotosBtn.classList.remove('hidden');
  }

  renderDataPreview(data);
}

// Show error state
function showError(message) {
  loadingEl.classList.add('hidden');
  successEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  dataPreviewEl.classList.add('hidden');
  sendBtn.classList.add('hidden');
  copyBtn.classList.add('hidden');
  errorMessageEl.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

// Ensure the content script is available before messaging
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    console.log('HomeEstimate: Content script injected on demand');
  } catch (error) {
    console.error('Injection error:', error);
    throw new Error('Impossibile comunicare con la pagina. Prova a ricaricarla.');
  }
}

// Extract data from current tab
async function extractData() {
  showLoading();

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('Nessuna tab attiva trovata');
    }

    // Check if URL is supported
    const url = tab.url;
    if (!url.includes('idealista.it') && !url.includes('immobiliare.it') && !url.includes('casa.it')) {
      throw new Error('Questa pagina non è supportata. Vai su un annuncio di Idealista, Immobiliare.it o Casa.it');
    }

    // Send message to content script
    let response;

    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
    } catch (messageError) {
      if (
        messageError &&
        messageError.message &&
        messageError.message.includes('Receiving end does not exist')
      ) {
        // Content script not loaded yet, inject it and retry once
        await ensureContentScript(tab.id);
        response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      } else {
        throw messageError;
      }
    }

    if (response && response.success && response.data) {
      extractedData = response.data;
      showSuccess(extractedData);
    } else {
      throw new Error('Nessun dato estratto dalla pagina');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    showError(error.message || 'Errore durante l\'estrazione dei dati');
  }
}

// Send data to HomeEstimate app
async function sendToHomeEstimate() {
  if (!extractedData) {
    showError('Nessun dato da inviare');
    return;
  }

  showLoading();

  try {
    // Encode data in URL
    const dataParam = encodeURIComponent(JSON.stringify(extractedData));
    const homeEstimateUrl = `http://localhost:3000?extensionData=${dataParam}`;

    // Open new tab
    chrome.tabs.create({ url: homeEstimateUrl }, () => {
      // Keep popup open to show success
      setTimeout(() => {
        showSuccess(extractedData);
      }, 500);
    });

  } catch (error) {
    console.error('Send error:', error);
    showError(error.message || 'Errore durante l\'invio dei dati');
  }
}

// Copy data to clipboard
async function copyToClipboard() {
  if (!extractedData) {
    showError('Nessun dato da copiare');
    return;
  }

  try {
    const jsonData = JSON.stringify(extractedData, null, 2);
    await navigator.clipboard.writeText(jsonData);

    // Show temporary success message
    copyBtn.textContent = '\u2713 Copiato!';
    setTimeout(() => {
      copyBtn.textContent = 'Copia Dati';
    }, 2000);
  } catch (error) {
    console.error('Copy error:', error);
    showError('Errore durante la copia dei dati');
  }
}

// Download foto e invio al backend per analisi successiva
async function analyzePhotos() {
  if (!extractedData || !Array.isArray(extractedData.photos) || extractedData.photos.length === 0) {
    showError('Nessuna foto da scaricare');
    return;
  }

  const originalText = analyzePhotosBtn.textContent;
  analyzePhotosBtn.textContent = '⏳ Download in corso...';
  analyzePhotosBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('Nessuna tab attiva trovata');
    }

    console.log('Requesting photo download for', extractedData.photos.length, 'photos');
    let downloadResponse;

    try {
      downloadResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'downloadPhotos',
        photoUrls: extractedData.photos
      });
    } catch (messageError) {
      if (
        messageError &&
        messageError.message &&
        messageError.message.includes('Receiving end does not exist')
      ) {
        await ensureContentScript(tab.id);
        downloadResponse = await chrome.tabs.sendMessage(tab.id, {
          action: 'downloadPhotos',
          photoUrls: extractedData.photos
        });
      } else {
        throw messageError;
      }
    }

    const base64Photos = downloadResponse?.success ? downloadResponse.photos : null;
    const refererUrl = typeof extractedData.url === 'string' ? extractedData.url : tab.url;
    const listingId = deriveListingId(refererUrl);

    if (!Array.isArray(base64Photos) || base64Photos.length === 0) {
      throw new Error('Impossibile scaricare le foto. Apri la galleria dell\\'annuncio e riprova.');
    }

    console.log('Downloaded', base64Photos.length, 'photos as base64');

    const uploadResponse = await fetch('http://localhost:8000/api/analysis/photo-storage/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photos: base64Photos,
        listing_id: listingId || refererUrl,
      })
    });

    if (!uploadResponse.ok) {
      let errorMessage = 'Errore durante il salvataggio delle foto';
      try {
        const errorData = await uploadResponse.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (parseError) {
        console.warn('Unable to parse photo storage error response', parseError);
      }
      throw new Error(errorMessage);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Photo storage result:', uploadResult);

    extractedData.photoStorageId = uploadResult.listing_id;
    extractedData.photoStorageCount = uploadResult.saved;
    if (extractedData.photoCondition) {
      delete extractedData.photoCondition;
    }

    chrome.storage.local.set({ lastExtractedData: extractedData });

    analyzePhotosBtn.textContent = '✔️ Foto salvate!';
    setTimeout(() => {
      analyzePhotosBtn.textContent = originalText;
      analyzePhotosBtn.disabled = false;
      showSuccess(extractedData);
    }, 2000);
  } catch (error) {
    console.error('Photo download error:', error);
    analyzePhotosBtn.textContent = originalText;
    analyzePhotosBtn.disabled = false;

    showError(error?.message || 'Errore durante il salvataggio delle foto');
  }
}

// Event listeners
extractBtn.addEventListener('click', extractData);
analyzePhotosBtn.addEventListener('click', analyzePhotos);
sendBtn.addEventListener('click', sendToHomeEstimate);
copyBtn.addEventListener('click', copyToClipboard);

// Check for stored data on popup open
chrome.storage.local.get(['lastExtractedData'], (result) => {
  if (result.lastExtractedData) {
    extractedData = result.lastExtractedData;
    showSuccess(extractedData);
  }
});
