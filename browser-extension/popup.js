// Popup script for HomeEstimate browser extension

let extractedData = null;

// DOM elements
const loadingEl = document.getElementById('loading');
const successEl = document.getElementById('success');
const errorEl = document.getElementById('error');
const dataPreviewEl = document.getElementById('dataPreview');
const extractBtn = document.getElementById('extractBtn');
const sendBtn = document.getElementById('sendBtn');
const copyBtn = document.getElementById('copyBtn');
const errorMessageEl = document.getElementById('errorMessage');

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

// Render data preview
function renderDataPreview(data) {
  const items = [];

  // Basic info
  if (data.title) items.push({ label: 'Titolo', value: data.title });
  if (data.price) items.push({ label: 'Prezzo', value: `€ ${data.price.toLocaleString('it-IT')}` });

  // Location
  if (data.address) items.push({ label: 'Indirizzo', value: data.address });
  if (data.city) items.push({ label: 'Città', value: data.city });
  if (data.province) items.push({ label: 'Provincia', value: data.province });
  if (data.postalCode) items.push({ label: 'CAP', value: data.postalCode });

  // Characteristics
  if (data.surface) items.push({ label: 'Superficie', value: `${data.surface} m²` });
  if (data.rooms) items.push({ label: 'Locali', value: data.rooms });
  if (data.bedrooms) items.push({ label: 'Camere', value: data.bedrooms });
  if (data.bathrooms) items.push({ label: 'Bagni', value: data.bathrooms });
  if (data.floor !== undefined) items.push({ label: 'Piano', value: data.floor });
  if (data.totalFloors) items.push({ label: 'Piani edificio', value: data.totalFloors });
  if (data.yearBuilt) items.push({ label: 'Anno costruzione', value: data.yearBuilt });

  // Amenities
  if (data.hasElevator) items.push({ label: 'Ascensore', value: 'Sì' });
  if (data.hasParking) items.push({ label: 'Parcheggio', value: 'Sì' });
  if (data.hasBalcony) items.push({ label: 'Balcone', value: 'Sì' });
  if (data.hasCellar) items.push({ label: 'Cantina', value: 'Sì' });

  // Property details
  if (data.propertyType) items.push({ label: 'Tipologia', value: data.propertyType });
  if (data.state) items.push({ label: 'Stato', value: data.state });
  if (data.energyClass) items.push({ label: 'Classe energetica', value: data.energyClass });

  const html = items.map(item => `
    <div class="data-item">
      <span class="data-label">${item.label}:</span>
      <span class="data-value">${item.value}</span>
    </div>
  `).join('');

  dataPreviewEl.innerHTML = html || '<div style="text-align: center; opacity: 0.7;">Nessun dato trovato</div>';
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
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });

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
    copyBtn.textContent = '✓ Copiato!';
    setTimeout(() => {
      copyBtn.textContent = 'Copia Dati';
    }, 2000);
  } catch (error) {
    console.error('Copy error:', error);
    showError('Errore durante la copia dei dati');
  }
}

// Event listeners
extractBtn.addEventListener('click', extractData);
sendBtn.addEventListener('click', sendToHomeEstimate);
copyBtn.addEventListener('click', copyToClipboard);

// Check for stored data on popup open
chrome.storage.local.get(['lastExtractedData'], (result) => {
  if (result.lastExtractedData) {
    extractedData = result.lastExtractedData;
    showSuccess(extractedData);
  }
});
