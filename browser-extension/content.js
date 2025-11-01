// Content script that extracts data from property listing pages

console.log('HomeEstimate: Content script loaded');

// Function to extract number from text
function extractNumber(text) {
  if (!text) return null;
  // Remove whitespace and convert Italian number format
  text = text.replace(/\./g, '').replace(',', '.').trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

// Extract data from Idealista
function extractIdealista() {
  const data = {
    url: window.location.href,
    source: 'idealista'
  };

  // Title
  const titleElem = document.querySelector('h1.main-info__title-main, h1[class*="title"]');
  if (titleElem) data.title = titleElem.textContent.trim();

  // Price
  const priceElem = document.querySelector('span.info-data-price, [class*="price"]');
  if (priceElem) data.price = extractNumber(priceElem.textContent);

  // Address - improved extraction
  let addressElem = document.querySelector('span.main-info__title-minor');

  // Try to find the "Posizione" section for detailed address
  const allText = document.body.innerText;
  const posizioneMatch = allText.match(/Posizione\s*\n\s*([^\n]+)\s*\n\s*([^\n]+)/);
  if (posizioneMatch) {
    // Extract street address and city from Posizione section
    const streetAddress = posizioneMatch[1].trim();
    const locality = posizioneMatch[2].trim();

    if (streetAddress && streetAddress.length > 5 && !streetAddress.toLowerCase().includes('posizione')) {
      data.address = streetAddress;
    }
    if (locality && locality.length > 2) {
      data.city = locality.split(',')[0].trim(); // Get first part before comma
    }
  }

  // Fallback to main-info address
  if (!data.address && addressElem) {
    data.address = addressElem.textContent.trim();
  }

  // Extract from title if address still not good
  if (!data.address || data.address === data.city) {
    if (data.title) {
      const titleMatch = data.title.match(/in\s+(Via|Corso|Piazza|Viale)\s+([^,]+(?:,\s*\d+)?)/i);
      if (titleMatch) {
        data.address = (titleMatch[1] + ' ' + titleMatch[2]).trim();
      }
    }
  }

  // Clean up city name
  if (data.city) {
    // Remove "Complesso residenziale" or similar prefixes
    data.city = data.city.replace(/^(Complesso residenziale|Residence|Residenza)\s+/i, '').trim();
    // Take only first part if comma-separated
    if (data.city.includes(',')) {
      data.city = data.city.split(',')[0].trim();
    }
  }

  // Extract city from address if not already set
  if (data.address && !data.city) {
    const parts = data.address.split(',');
    if (parts.length > 1) {
      data.city = parts[parts.length - 1].trim();
    }
  }

  // Extract key metrics from the prominent display (price bar area)
  // This is more reliable than parsing all text
  const mainInfoText = document.body.innerText;

  // Surface: Look for pattern like "132 m2" in the main info
  const surfaceMatch = mainInfoText.match(/(\d{2,4})\s*m[2²]/i);
  if (surfaceMatch) {
    const foundSurface = parseInt(surfaceMatch[1]);
    // Only use if reasonable (10-5000 m²)
    if (foundSurface >= 10 && foundSurface <= 5000) {
      data.surface = foundSurface;
    }
  }

  // Rooms/Locali: Look for pattern like "3 locali"
  const roomsMatch = mainInfoText.match(/(\d+)\s*local[ie]/i);
  if (roomsMatch) {
    data.rooms = parseInt(roomsMatch[1]);
  }

  // Piano: Look for "Piano terra", "Piano 1", etc.
  const pianoMatch = mainInfoText.match(/Piano\s+(terra|seminterrato|interrato|rialzato|\d+)/i);
  if (pianoMatch) {
    const pianoText = pianoMatch[1].toLowerCase();
    if (pianoText === 'terra' || pianoText === 'rialzato') {
      data.floor = 0;
    } else if (pianoText === 'seminterrato' || pianoText === 'interrato') {
      data.floor = -1;
    } else {
      data.floor = parseInt(pianoText) || 0;
    }
  }

  // Ascensore
  if (mainInfoText.toLowerCase().includes('senza ascensore')) {
    data.hasElevator = false;
  } else if (mainInfoText.toLowerCase().includes('con ascensore') || mainInfoText.toLowerCase().includes('ascensore')) {
    data.hasElevator = true;
  }

  // Fallback: Details from feature lists
  const details = document.querySelectorAll('div.info-features span, [class*="details"] span, [class*="feature"] span, .details-property_features li');
  details.forEach(detail => {
    const text = detail.textContent.toLowerCase();

    // Only set if not already extracted
    if (!data.surface && (text.includes('m²') || text.includes('mq'))) {
      data.surface = extractNumber(text);
    }
    if (!data.rooms && (text.includes('locale') || text.includes('locali'))) {
      data.rooms = Math.floor(extractNumber(text) || 0);
    }
    if (!data.bedrooms && (text.includes('camera') || text.includes('camere'))) {
      data.bedrooms = Math.floor(extractNumber(text) || 0);
    }
    if (!data.bathrooms && (text.includes('bagno') || text.includes('bagni'))) {
      data.bathrooms = Math.floor(extractNumber(text) || 0);
    }
    if (text.includes('parcheggio') || text.includes('garage') || text.includes('box')) {
      data.hasParking = true;
    }
    if (text.includes('balcon') || text.includes('terrazza')) {
      data.hasBalcony = true;
    }
  });

  // Estimate bedrooms if not found
  if (!data.bedrooms && data.rooms) {
    // Common logic: trilocale (3 rooms) = 2 bedrooms, bilocale (2 rooms) = 1 bedroom
    // Subtract 1 for living room
    data.bedrooms = Math.max(1, data.rooms - 1);
  }

  // Description
  const descElem = document.querySelector('div.comment, [class*="description"], .detail-description');
  if (descElem) data.description = descElem.textContent.trim();

  // Photos
  const photos = [];
  const imgElements = document.querySelectorAll('img.detail-image, [class*="gallery"] img, .detail-multimedia img');
  imgElements.forEach(img => {
    const src = img.src || img.dataset.src;
    if (src && !src.includes('logo') && !photos.includes(src)) {
      photos.push(src);
    }
  });
  data.photos = photos.slice(0, 10); // Limit to 10 photos

  return data;
}

// Extract data from Immobiliare.it
function extractImmobiliare() {
  const data = {
    url: window.location.href,
    source: 'immobiliare'
  };

  const mainText = document.body.innerText;

  // Title
  const titleElem = document.querySelector('h1.im-titleBlock__title, h1');
  if (titleElem) data.title = titleElem.textContent.trim();

  // Price - extract from main display
  const priceMatch = mainText.match(/€\s*([\d.]+)/);
  if (priceMatch) {
    data.price = extractNumber(priceMatch[1]);
  }

  // Surface
  const surfaceMatch = mainText.match(/(\d{2,4})\s*m[²2q]/i);
  if (surfaceMatch) {
    data.surface = parseInt(surfaceMatch[1]);
  }

  // Rooms/Locali
  const roomsMatch = mainText.match(/(\d+)\s*local[ie]/i);
  if (roomsMatch) {
    data.rooms = parseInt(roomsMatch[1]);
  }

  // Bedrooms/Camere
  const bedroomsMatch = mainText.match(/(\d+)\s*camer[ae]/i);
  if (bedroomsMatch) {
    data.bedrooms = parseInt(bedroomsMatch[1]);
  }

  // Bathrooms/Bagni
  const bathroomsMatch = mainText.match(/(\d+)\s*bagn[io]/i);
  if (bathroomsMatch) {
    data.bathrooms = parseInt(bathroomsMatch[1]);
  }

  // Floor/Piano
  const floorMatch = mainText.match(/Piano:\s*(\d+|terra|seminterrato|interrato)/i);
  if (floorMatch) {
    const floorText = floorMatch[1].toLowerCase();
    if (floorText === 'terra') {
      data.floor = 0;
    } else if (floorText === 'seminterrato' || floorText === 'interrato') {
      data.floor = -1;
    } else {
      data.floor = parseInt(floorText);
    }
  }

  // Total Floors
  const totalFloorsMatch = mainText.match(/Piani\s+(?:dell')?edificio:\s*(\d+)/i);
  if (totalFloorsMatch) {
    data.totalFloors = parseInt(totalFloorsMatch[1]);
  }

  // Year Built / Anno costruzione
  const yearMatch = mainText.match(/Anno\s+(?:di\s+)?costruzione:\s*(\d{4})/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1800 && year <= new Date().getFullYear()) {
      data.yearBuilt = year;
    }
  }

  // Province and Postal Code
  const provinceMatch = mainText.match(/\(([A-Z]{2})\)/);
  if (provinceMatch) {
    data.province = provinceMatch[1];
  }

  const postalCodeMatch = mainText.match(/\b(\d{5})\b/);
  if (postalCodeMatch) {
    data.postalCode = postalCodeMatch[1];
  }

  // Amenities
  if (mainText.toLowerCase().includes('ascensore')) {
    data.hasElevator = true;
  }
  if (mainText.toLowerCase().includes('box') || mainText.toLowerCase().includes('posto auto') || mainText.toLowerCase().includes('garage')) {
    data.hasParking = true;
  }
  if (mainText.toLowerCase().includes('balcone') || mainText.toLowerCase().includes('terrazzo')) {
    data.hasBalcony = true;
  }
  if (mainText.toLowerCase().includes('cantina')) {
    data.hasCellar = true;
  }

  // Property State
  const stateText = mainText.toLowerCase();
  if (stateText.includes('ottimo stato') || stateText.includes('ottime condizioni')) {
    data.state = 'ottimo';
  } else if (stateText.includes('buono stato') || stateText.includes('buone condizioni')) {
    data.state = 'buono';
  } else if (stateText.includes('da ristrutturare')) {
    data.state = 'da_ristrutturare';
  } else if (stateText.includes('discreto')) {
    data.state = 'discreto';
  }

  // Property Type
  if (stateText.includes('signorile') || stateText.includes('prestigio')) {
    data.propertyType = 'signorile';
  } else if (stateText.includes('economico')) {
    data.propertyType = 'economico';
  } else if (stateText.includes('ufficio')) {
    data.propertyType = 'ufficio';
  } else if (stateText.includes('negozio') || stateText.includes('commerciale')) {
    data.propertyType = 'negozio';
  } else {
    data.propertyType = 'residenziale';
  }

  // Energy Class
  const energyMatch = mainText.match(/Classe\s+energetica:\s*(A[1-4]|[A-G]|NC)/i);
  if (energyMatch) {
    data.energyClass = energyMatch[1].toUpperCase();
  }

  // Address and City - improved extraction from text
  // Try to find address from title first
  // Formats supported:
  // - "Trilocale via Giuseppe Ripamonti 234, Milano"
  // - "Quadrilocale piazza Po, Vercelli - Wagner, Milano"
  // - "Bilocale corso Italia 15, Quartiere, Roma"
  console.log('HomeEstimate: Extracting address and city from title:', data.title);

  if (data.title) {
    // Look for street pattern (via|corso|piazza|viale) followed by name
    const streetMatch = data.title.match(/(via|corso|piazza|viale)\s+([^,]+)/i);
    console.log('HomeEstimate: Street match:', streetMatch);

    if (streetMatch) {
      const streetType = streetMatch[1];
      const streetName = streetMatch[2].trim();

      // Try to extract street number if present
      const numberMatch = streetName.match(/^(.+?)\s+(\d+)$/);
      if (numberMatch) {
        data.address = streetType + ' ' + numberMatch[1] + ' ' + numberMatch[2];
      } else {
        data.address = streetType + ' ' + streetName;
      }
      console.log('HomeEstimate: Extracted address:', data.address);
    }

    // Extract city - it's usually the last part after commas
    const commaParts = data.title.split(',');
    console.log('HomeEstimate: Title parts:', commaParts);

    if (commaParts.length >= 2) {
      // City is the last part
      let cityPart = commaParts[commaParts.length - 1].trim();
      console.log('HomeEstimate: Raw city part:', cityPart);

      // Clean up: remove anything after dash (neighborhoods)
      if (cityPart.includes('-')) {
        cityPart = cityPart.split('-').pop().trim();
      }

      // Remove common prefixes
      cityPart = cityPart.replace(/^(zona|quartiere|zona\s+)/i, '').trim();

      if (cityPart && cityPart.length >= 2) {
        data.city = cityPart;
        console.log('HomeEstimate: Extracted city:', data.city);
      }
    }
  }

  // Fallback: Try structured elements
  if (!data.address) {
    const addressElem = document.querySelector('[class*="location"], [class*="address"]');
    if (addressElem) {
      const addressText = addressElem.textContent.trim();
      const addressParts = addressText.split(',');

      if (addressParts.length > 0) {
        data.address = addressParts[0].trim();
      }
      if (addressParts.length > 1) {
        data.city = addressParts[addressParts.length - 1].trim();
      }
    }
  }

  // Fallback: Features from structured data
  const features = document.querySelectorAll('div.im-features__item, [class*="feature"], dl dt, dl dd');
  features.forEach((feature, index) => {
    const text = feature.textContent.toLowerCase();

    if (!data.surface && (text.includes('superficie') || text.includes('m²'))) {
      data.surface = extractNumber(text);
    }
    if (!data.rooms && text.includes('locali')) {
      data.rooms = Math.floor(extractNumber(text) || 0);
    }
    if (!data.bedrooms && text.includes('camere')) {
      data.bedrooms = Math.floor(extractNumber(text) || 0);
    }
    if (!data.bathrooms && text.includes('bagni')) {
      data.bathrooms = Math.floor(extractNumber(text) || 0);
    }
  });

  // Estimate bedrooms if not found
  if (!data.bedrooms && data.rooms) {
    data.bedrooms = Math.max(1, data.rooms - 1);
  }

  // Description
  const descElem = document.querySelector('[class*="description"], .im-description');
  if (descElem) data.description = descElem.textContent.trim();

  return data;
}

// Extract data from Casa.it
function extractCasa() {
  const data = {
    url: window.location.href,
    source: 'casa'
  };

  // Title
  const titleElem = document.querySelector('h1');
  if (titleElem) data.title = titleElem.textContent.trim();

  // Price
  const priceElem = document.querySelector('span.price, [class*="price"]');
  if (priceElem) data.price = extractNumber(priceElem.textContent);

  return data;
}

// Main extraction function
function extractPropertyData() {
  const hostname = window.location.hostname;

  if (hostname.includes('idealista.it')) {
    return extractIdealista();
  } else if (hostname.includes('immobiliare.it')) {
    return extractImmobiliare();
  } else if (hostname.includes('casa.it')) {
    return extractCasa();
  }

  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractPropertyData();
    sendResponse({ success: true, data });
  }
  return true;
});

// Auto-extract data when page loads and store it
window.addEventListener('load', () => {
  setTimeout(() => {
    const data = extractPropertyData();
    if (data) {
      chrome.storage.local.set({ lastExtractedData: data }, () => {
        console.log('HomeEstimate: Data extracted and stored', data);
      });
    }
  }, 2000);
});
