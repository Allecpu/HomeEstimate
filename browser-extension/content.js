// Content script that extracts data from property listing pages

console.log('HomeEstimate: Content script loaded');

// Function to extract number from text
function extractNumber(rawText) {
  if (rawText === undefined || rawText === null) return null;
  let text = String(rawText);
  // Remove whitespace and convert Italian number format
  text = text.replace(/\./g, '').replace(',', '.').trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function capitalizeWords(value) {
  if (!value) return '';
  return value
    .split(/\s+/)
    .map(word => word.length === 0 ? '' : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

function formatList(value) {
  if (!value) return '';
  return value
    .split(/[,;]+/)
    .map(part => capitalizeWords(part.trim()))
    .filter(part => part.length > 0)
    .join(', ');
}

function hasAirConditioningKeyword(text) {
  if (!text) return false;
  const lowered = text.toLowerCase();
  return (
    lowered.includes('aria condizionata') ||
    lowered.includes('impianto di condizionamento') ||
    lowered.includes('condizionamento') ||
    lowered.includes('climatizzatore') ||
    lowered.includes('climatizzato') ||
    lowered.includes('climatizzate') ||
    lowered.includes('climatizzati')
  );
}

function extractEnergyClassFromText(text) {
  if (!text) return null;
  const matches = Array.from(
    text.matchAll(/classe\s+energetica[^\n]*?([A-G](?:[1-4])?|NC)/gi)
  );

  for (const match of matches) {
    const value = match[1];
    if (!value) continue;
    if (value === value.toUpperCase()) {
      return value.toUpperCase();
    }
  }

  if (matches.length > 0) {
    return matches[matches.length - 1][1].toUpperCase();
  }

  const fallback = text.match(/\bclasse\s+([A-G](?:[1-4])?|NC)\b/i);
  return fallback ? fallback[1].toUpperCase() : null;
}

function addPhotoUrl(photosSet, rawUrl) {
  if (!rawUrl) return;
  let url = String(rawUrl).trim();
  if (!url || url.startsWith('data:')) return;

  const lowered = url.toLowerCase();
  if (lowered.includes('logo') || lowered.includes('placeholder')) return;

  if (url.startsWith('//')) {
    url = window.location.protocol + url;
  } else if (url.startsWith('/')) {
    try {
      url = new URL(url, window.location.origin).href;
    } catch {
      return;
    }
  } else if (!/^https?:/i.test(url)) {
    return;
  }

  photosSet.add(url);
}

function extractPhotoUrlsFromJson(value, photosSet, visited = new WeakSet()) {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    addPhotoUrl(photosSet, value);
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach(item => extractPhotoUrlsFromJson(item, photosSet, visited));
    return;
  }

  const directKeys = ['image', 'images', 'photos', 'photo', 'contentUrl', 'url', 'thumbnail', 'thumbnailUrl', 'mainImage'];
  for (const key of directKeys) {
    try {
      if (key in value) {
        extractPhotoUrlsFromJson(value[key], photosSet, visited);
      }
    } catch (err) {
      console.warn('HomeEstimate: unable to inspect photo key', key, err);
    }
  }

  let keys;
  try {
    keys = Object.keys(value);
  } catch (err) {
    return;
  }

  keys.forEach(key => {
    if (!directKeys.includes(key)) {
      try {
        extractPhotoUrlsFromJson(value[key], photosSet, visited);
      } catch (err) {
        console.warn('HomeEstimate: unable to inspect nested key', key, err);
      }
    }
  });
}

function collectIdealistaDomPhotoCandidates() {
  const photosSet = new Set();
  const selectors = [
    'img.detail-image',
    '[class*="gallery"] img',
    '.detail-multimedia img',
    'picture img',
    'img[data-src]',
    'img[data-lazy]',
    'img[data-srcset]'
  ];

  document.querySelectorAll(selectors.join(',')).forEach(img => {
    const candidates = [
      img.currentSrc,
      img.src,
      img.getAttribute('data-src'),
      img.getAttribute('data-original'),
      img.getAttribute('data-lazy'),
      img.getAttribute('data-srcset')
    ].filter(Boolean);

    candidates.forEach(candidate => {
      if (candidate.includes(',')) {
        candidate
          .split(',')
          .map(part => part.trim().split(' ')[0])
          .forEach(url => addPhotoUrl(photosSet, url));
      } else {
        addPhotoUrl(photosSet, candidate);
      }
    });
  });

  return photosSet;
}

function extractIdealistaPhotos() {
  const photosSet = new Set();

  try {
    const parseJsonAttribute = attrValue => {
      if (!attrValue) return;
      try {
        const parsed = JSON.parse(attrValue);
        extractPhotoUrlsFromJson(parsed, photosSet);
      } catch (_) {
        // Ignore malformed JSON payloads
      }
    };

    document.querySelectorAll('[data-urls],[data-gallery],[data-gallery-images],[data-images]').forEach(element => {
      parseJsonAttribute(element.getAttribute('data-urls'));
      parseJsonAttribute(element.getAttribute('data-gallery'));
      parseJsonAttribute(element.getAttribute('data-gallery-images'));
      parseJsonAttribute(element.getAttribute('data-images'));
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      const text = script.textContent;
      if (!text) return;
      try {
        extractPhotoUrlsFromJson(JSON.parse(text), photosSet);
      } catch (_) {
        // Some ld+json blocks may contain multiple JSON objects; try to parse line by line
        text
          .split(/\n{2,}/)
          .map(chunk => chunk.trim())
          .filter(chunk => chunk.startsWith('{') || chunk.startsWith('['))
          .forEach(chunk => {
            try {
              extractPhotoUrlsFromJson(JSON.parse(chunk), photosSet);
            } catch (err) {
              console.warn('HomeEstimate: failed to parse JSON-LD chunk for photos', err);
            }
          });
      }
    });

    const potentialState = window.__INITIAL_STATE__ || window.__state || window.__DATA__;
    if (potentialState) {
      try {
        extractPhotoUrlsFromJson(potentialState, photosSet);
      } catch (err) {
        console.warn('HomeEstimate: failed to parse initial state photos', err);
      }
    }

    const domCandidates = collectIdealistaDomPhotoCandidates();
    domCandidates.forEach(url => photosSet.add(url));
  } catch (err) {
    console.warn('HomeEstimate: failed to gather Idealista photos via structured data', err);
  }

  if (photosSet.size === 0) {
    const fallback = collectIdealistaDomPhotoCandidates();
    fallback.forEach(url => photosSet.add(url));
  }

  return Array.from(photosSet);
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
  const loweredMainText = mainInfoText.toLowerCase();

  const pricePerSqmMatch = mainInfoText.match(/prezzo\s+al\s+m(?:\u00B2|2)[\s:]*([\d\.,]+)/i);
  if (pricePerSqmMatch) {
    data.pricePerSqm = extractNumber(pricePerSqmMatch[1]);
  }

  const condoFeesMatch = mainInfoText.match(/(\d[\d\.,]*)\s*\u20AC\s*(?:\/\s*mese|al\s*mese)?[^\n]*spese\s+condominiali/i);
  if (condoFeesMatch) {
    data.condoFeesMonthly = extractNumber(condoFeesMatch[1]);
  }

  // Surface: Look for pattern like "132 m2" in the main info
  const surfaceMatch = mainInfoText.match(/(\d{2,4})\s*m(?:\u00B2|2)/i);
  if (surfaceMatch) {
    const foundSurface = parseInt(surfaceMatch[1]);
    // Only use if reasonable (10-5000 m²)
    if (foundSurface >= 10 && foundSurface <= 5000) {
      data.surface = foundSurface;
    }
  }

  if (!data.surfaceCommercial) {
    const surfaceCommercialMatch = mainInfoText.match(/(\d+(?:[\.,]\d+)?)\s*m(?:\u00B2|2)\s*commercial/i);
    if (surfaceCommercialMatch) {
      const commercialValue = extractNumber(surfaceCommercialMatch[1]);
      if (commercialValue !== null && commercialValue !== undefined) {
        data.surfaceCommercial = commercialValue;
      }
    }
  }

  if (!data.surfaceUsable) {
    const surfaceUsableMatch = mainInfoText.match(/(\d+(?:[\.,]\d+)?)\s*m(?:\u00B2|2)\s*(?:calpestabil|abitabil)/i);
    if (surfaceUsableMatch) {
      const usableValue = extractNumber(surfaceUsableMatch[1]);
      if (usableValue !== null && usableValue !== undefined) {
        data.surfaceUsable = usableValue;
      }
    }
  }

  if (!data.orientation) {
    const orientationMatch = mainInfoText.match(/orientamento\s*[:\-]?\s*([^\n]+)/i);
    if (orientationMatch) {
      data.orientation = formatList(orientationMatch[1]);
    }
  }

  if (!data.heating) {
    const heatingMatch = mainInfoText.match(/riscaldamento\s*[:\-]?\s*([^\n]+)/i);
    if (heatingMatch) {
      const heatingValue = heatingMatch[1]?.trim() || heatingMatch[0];
      const includesLabel = heatingValue.toLowerCase().includes('riscaldamento');
      const normalisedHeating = includesLabel
        ? capitalizeWords(heatingValue)
        : `Riscaldamento ${capitalizeWords(heatingValue)}`;
      data.heating = normalisedHeating;

      if (!data.heatingType) {
        const typeCandidate = heatingMatch[1]?.trim() || heatingMatch[0];
        const cleanedType = typeCandidate.replace(/riscaldamento/i, '').trim();
        data.heatingType = cleanedType ? capitalizeWords(cleanedType) : 'Riscaldamento';
      }
    }
  }

  if (!data.hasAirConditioning) {
    if (loweredMainText.includes('senza aria condizionata')) {
      data.hasAirConditioning = false;
    } else if (hasAirConditioningKeyword(mainInfoText)) {
      data.hasAirConditioning = true;
    }
  }

  if (!data.energyPerformance) {
    const energyPerfMatch = mainInfoText.match(/(\d+(?:[\.,]\d+)?)\s*kwh\/?\s*m(?:\u00B2|2)/i);
    if (energyPerfMatch) {
      const perfValue = extractNumber(energyPerfMatch[1]);
      if (perfValue !== null && perfValue !== undefined) {
        data.energyPerformance = perfValue;
      }
    }
  }

  if (!data.hasGarden) {
    const gardenMatch = mainInfoText.match(/giardino\s*(comune|privato|condominiale|di\s+propriet\u00E0)?/i);
    if (gardenMatch) {
      data.hasGarden = true;
      const descriptor = gardenMatch[1] ? capitalizeWords(gardenMatch[1]) : '';
      data.gardenType = descriptor ? `Giardino ${descriptor}` : 'Giardino';
    }
  }

  if (!data.parkingIncluded) {
    const parkingIncludedMatch = mainInfoText.match(/box\s+(?:incluso|compreso)[^\n]*prezzo/i);
    if (parkingIncludedMatch) {
      data.parkingIncluded = true;
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
    const rawText = detail.textContent ? detail.textContent.trim() : '';
    if (!rawText) return;
    const text = rawText.toLowerCase();
    const segments = rawText.split(/[\n,;\u2022]/);

    segments.forEach(segment => {
      const segmentText = segment.trim().toLowerCase();
      if (!segmentText) return;

      if (!data.surfaceCommercial && segmentText.includes('commercial')) {
        const commercialValue = extractNumber(segment);
        if (commercialValue !== null && commercialValue !== undefined) {
          data.surfaceCommercial = commercialValue;
        }
      }

      if (!data.surfaceUsable && (segmentText.includes('calpest') || segmentText.includes('abitabil'))) {
        const usableValue = extractNumber(segment);
        if (usableValue !== null && usableValue !== undefined) {
          data.surfaceUsable = usableValue;
        }
      }

      if (!data.yearBuilt) {
        const builtMatch = segment.match(/costruito\s+(?:nel\s+)?(\d{4})/i);
        if (builtMatch) {
          const year = parseInt(builtMatch[1], 10);
          if (year >= 1800 && year <= new Date().getFullYear()) {
            data.yearBuilt = year;
          }
        }
      }

      if (!data.energyPerformance) {
        const energyPerfMatch = segment.match(/(\d+(?:[\.,]\d+)?)\s*kwh\/?\s*m(?:\u00B2|2)/i);
        if (energyPerfMatch) {
          const perfValue = extractNumber(energyPerfMatch[0]);
          if (perfValue !== null && perfValue !== undefined) {
            data.energyPerformance = perfValue;
          }
        }
      }

      if (!data.hasAirConditioning && hasAirConditioningKeyword(segment) && !segment.toLowerCase().includes('senza aria condizionata')) {
        data.hasAirConditioning = true;
      }
    });

    // Only set if not already extracted
    if (!data.surface && (text.includes('m\u00B2') || text.includes('mq') || text.includes('m2'))) {
      data.surface = extractNumber(rawText);
    }
    if (!data.rooms && (text.includes('locale') || text.includes('locali'))) {
      data.rooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (!data.bedrooms && (text.includes('camera') || text.includes('camere'))) {
      data.bedrooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (!data.bathrooms && (text.includes('bagno') || text.includes('bagni'))) {
      data.bathrooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (text.includes('parcheggio') || text.includes('garage') || text.includes('box') || text.includes('posto auto')) {
      data.hasParking = true;
    }
    if (text.includes('balcon') || text.includes('terrazza')) {
      data.hasBalcony = true;
    }
    if (text.includes('giardino')) {
      data.hasGarden = true;
      if (!data.gardenType) {
        const gardenMatch = rawText.match(/giardino\s*[:\-]?\s*(.*)/i);
        const gardenValue = gardenMatch && gardenMatch[1] ? gardenMatch[1].trim() : '';
        const descriptor = gardenValue ? capitalizeWords(gardenValue) : '';
        data.gardenType = descriptor ? `Giardino ${descriptor}` : capitalizeWords(rawText);
      }
    }
    if (!data.orientation && text.includes('orientament')) {
      const orientationMatch = rawText.match(/orientamento\s*[:\-]?\s*(.*)/i);
      const orientationValue = orientationMatch && orientationMatch[1] ? orientationMatch[1].trim() : rawText;
      const formattedOrientation = formatList(orientationValue);
      data.orientation = formattedOrientation || capitalizeWords(rawText);
    }
    if (!data.heating && text.includes('riscaldament')) {
      const heatingMatch = rawText.match(/riscaldamento\s*[:\-]?\s*(.*)/i);
      const heatingValue = heatingMatch && heatingMatch[1] ? heatingMatch[1].trim() : rawText;
      const includesLabel = heatingValue.toLowerCase().includes('riscaldamento');
      const normalisedHeating = includesLabel
        ? capitalizeWords(heatingValue)
        : `Riscaldamento ${capitalizeWords(heatingValue)}`;
      data.heating = normalisedHeating;
      if (!data.heatingType) {
        const cleanedType = heatingValue.replace(/riscaldamento/i, '').trim();
        data.heatingType = cleanedType ? capitalizeWords(cleanedType) : 'Riscaldamento';
      }
    }
    if (!data.hasAirConditioning && hasAirConditioningKeyword(rawText) && !rawText.toLowerCase().includes('senza aria condizionata')) {
      data.hasAirConditioning = true;
    }
    if (!data.energyClass) {
      const extractedEnergyClass = extractEnergyClassFromText(rawText);
      if (extractedEnergyClass) {
        data.energyClass = extractedEnergyClass;
      }
    }
    if (!data.parkingIncluded && text.includes('box') && (text.includes('incluso') || text.includes('compreso'))) {
      data.parkingIncluded = true;
    }
  });

  // Property state and type fallbacks from global text
  if (!data.state) {
    if (loweredMainText.includes('ottimo stato') || loweredMainText.includes('ottime condizioni')) {
      data.state = 'ottimo';
    } else if (loweredMainText.includes('buono stato') || loweredMainText.includes('buone condizioni')) {
      data.state = 'buono';
    } else if (loweredMainText.includes('da ristrutturare')) {
      data.state = 'da_ristrutturare';
    } else if (loweredMainText.includes('discreto')) {
      data.state = 'discreto';
    }
  }

  if (!data.propertyType) {
    if (loweredMainText.includes('signorile') || loweredMainText.includes('prestigio')) {
      data.propertyType = 'signorile';
    } else if (loweredMainText.includes('economico')) {
      data.propertyType = 'economico';
    } else if (loweredMainText.includes('ufficio')) {
      data.propertyType = 'ufficio';
    } else if (loweredMainText.includes('negozio') || loweredMainText.includes('commerciale')) {
      data.propertyType = 'negozio';
    } else {
      data.propertyType = 'residenziale';
    }
  }

  if (!data.energyClass) {
    const extractedEnergyClass = extractEnergyClassFromText(mainInfoText);
    if (extractedEnergyClass) {
      data.energyClass = extractedEnergyClass;
    }
  }

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
  const photos = extractIdealistaPhotos();
  data.photos = photos;

  return data;
}

// Extract data from Immobiliare.it
function extractImmobiliare() {
  const data = {
    url: window.location.href,
    source: 'immobiliare'
  };

  const mainText = document.body.innerText;
  const loweredMainText = mainText.toLowerCase();

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

  if (!data.hasAirConditioning) {
    if (loweredMainText.includes('senza aria condizionata')) {
      data.hasAirConditioning = false;
    } else if (hasAirConditioningKeyword(mainText)) {
      data.hasAirConditioning = true;
    }
  }

  // Amenities
  if (loweredMainText.includes('ascensore')) {
    data.hasElevator = true;
  }
  if (loweredMainText.includes('box') || loweredMainText.includes('posto auto') || loweredMainText.includes('garage')) {
    data.hasParking = true;
  }
  if (loweredMainText.includes('balcone') || loweredMainText.includes('terrazzo')) {
    data.hasBalcony = true;
  }
  if (loweredMainText.includes('cantina')) {
    data.hasCellar = true;
  }

  // Property State
  if (loweredMainText.includes('ottimo stato') || loweredMainText.includes('ottime condizioni')) {
    data.state = 'ottimo';
  } else if (loweredMainText.includes('buono stato') || loweredMainText.includes('buone condizioni')) {
    data.state = 'buono';
  } else if (loweredMainText.includes('da ristrutturare')) {
    data.state = 'da_ristrutturare';
  } else if (loweredMainText.includes('discreto')) {
    data.state = 'discreto';
  }

  // Property Type
  if (loweredMainText.includes('signorile') || loweredMainText.includes('prestigio')) {
    data.propertyType = 'signorile';
  } else if (loweredMainText.includes('economico')) {
    data.propertyType = 'economico';
  } else if (loweredMainText.includes('ufficio')) {
    data.propertyType = 'ufficio';
  } else if (loweredMainText.includes('negozio') || loweredMainText.includes('commerciale')) {
    data.propertyType = 'negozio';
  } else {
    data.propertyType = 'residenziale';
  }

  // Energy Class
  if (!data.energyClass) {
    const extractedEnergyClass = extractEnergyClassFromText(mainText);
    if (extractedEnergyClass) {
      data.energyClass = extractedEnergyClass;
    }
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
  features.forEach((feature) => {
    const rawText = feature.textContent ? feature.textContent.trim() : '';
    if (!rawText) return;
    const text = rawText.toLowerCase();

    if (!data.surface && (text.includes('superficie') || text.includes('m²'))) {
      data.surface = extractNumber(rawText);
    }
    if (!data.rooms && text.includes('locali')) {
      data.rooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (!data.bedrooms && text.includes('camere')) {
      data.bedrooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (!data.bathrooms && text.includes('bagni')) {
      data.bathrooms = Math.floor(extractNumber(rawText) || 0);
    }
    if (!data.hasAirConditioning && hasAirConditioningKeyword(rawText) && !text.includes('senza aria condizionata')) {
      data.hasAirConditioning = true;
    }
    if (!data.energyClass) {
      const extractedEnergyClass = extractEnergyClassFromText(rawText);
      if (extractedEnergyClass) {
        data.energyClass = extractedEnergyClass;
      }
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

// Download photos as base64
async function downloadPhotosAsBase64(photoUrls) {
  const base64Photos = [];

  const uniqueUrls = Array.from(new Set((photoUrls || []).filter(Boolean)));

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    try {
      console.log(`HomeEstimate: Downloading photo ${i + 1}/${uniqueUrls.length}: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch photo: ${response.status} ${response.statusText}`);
        continue;
      }

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      base64Photos.push(base64);
      console.log(`HomeEstimate: Converted photo ${i + 1} to base64`);
    } catch (error) {
      console.error(`Failed to download photo ${url}:`, error);
    }
  }

  return base64Photos;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'extractData') {
    const data = extractPropertyData();
    sendResponse({ success: true, data });
  } else if (request.action === 'downloadPhotos') {
    // Download photos as base64 (async operation)
    downloadPhotosAsBase64(request.photoUrls)
      .then(base64Photos => {
        sendResponse({ success: true, photos: base64Photos });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
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
