from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
from bs4 import BeautifulSoup
import re
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
import asyncio

router = APIRouter()

class ParseURLRequest(BaseModel):
    url: HttpUrl

class PropertyData(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postalCode: Optional[str] = None
    surface: Optional[float] = None
    rooms: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floor: Optional[int] = None
    totalFloors: Optional[int] = None
    hasElevator: Optional[bool] = None
    hasParking: Optional[bool] = None
    hasBalcony: Optional[bool] = None
    hasCellar: Optional[bool] = None
    propertyType: Optional[str] = None
    state: Optional[str] = None
    energyClass: Optional[str] = None
    yearBuilt: Optional[int] = None
    images: list[dict] = []
    source: Optional[str] = None

async def fetch_url_with_playwright(url: str) -> str:
    """Fetch URL content using Playwright (headless browser)"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='it-IT',
        )

        page = await context.new_page()

        try:
            # Navigate to the URL and wait for network to be idle
            await page.goto(url, wait_until='networkidle', timeout=30000)

            # Wait for the main content to load (specific to each site)
            try:
                await page.wait_for_selector('body', timeout=10000)
            except PlaywrightTimeout:
                pass

            # Get the HTML content
            html = await page.content()

            return html
        finally:
            await browser.close()

def extract_number(text: str) -> Optional[float]:
    """Extract first number from text"""
    if not text:
        return None
    # Remove whitespace and convert Italian number format
    text = text.replace('.', '').replace(',', '.').strip()
    match = re.search(r'\d+(?:\.\d+)?', text)
    return float(match.group()) if match else None

def parse_idealista(soup: BeautifulSoup, url: str) -> PropertyData:
    """Parse Idealista listing"""
    data = PropertyData(url=url, source='idealista')

    # Title
    title_elem = soup.select_one('h1.main-info__title-main')
    if not title_elem:
        title_elem = soup.select_one('h1[class*="title"]')
    if title_elem:
        data.title = title_elem.text.strip()

    # Price
    price_elem = soup.select_one('span.info-data-price')
    if not price_elem:
        price_elem = soup.select_one('[class*="price"]')
    if price_elem:
        data.price = extract_number(price_elem.text)

    # Address
    address_elem = soup.select_one('span.main-info__title-minor')
    if not address_elem:
        address_elem = soup.select_one('[class*="address"]')
    if address_elem:
        address_text = address_elem.text.strip()
        data.address = address_text

        # Try to extract city from address
        if ',' in address_text:
            parts = [p.strip() for p in address_text.split(',')]
            if len(parts) >= 2:
                data.city = parts[-1]

        # Try to extract postal code
        postal_match = re.search(r'\b\d{5}\b', address_text)
        if postal_match:
            data.postalCode = postal_match.group()

    # Details from various sections
    details = soup.select('div.info-features span, [class*="details"] span, [class*="feature"] span')
    for detail in details:
        text = detail.text.lower()

        if 'm²' in text or 'mq' in text:
            data.surface = extract_number(text)
        elif 'locale' in text or 'locali' in text:
            data.rooms = int(extract_number(text) or 0)
        elif 'camera' in text or 'camere' in text:
            data.bedrooms = int(extract_number(text) or 0)
        elif 'bagno' in text or 'bagni' in text:
            data.bathrooms = int(extract_number(text) or 0)
        elif 'piano' in text and 'piani' not in text:
            floor_num = extract_number(text)
            if floor_num is not None:
                data.floor = int(floor_num)
        elif 'piani edificio' in text or 'totale piani' in text:
            total_floors = extract_number(text)
            if total_floors is not None:
                data.totalFloors = int(total_floors)
        elif 'ascensore' in text:
            data.hasElevator = True
        elif 'box' in text or 'posto auto' in text or 'garage' in text:
            data.hasParking = True
        elif 'balcone' in text or 'terrazzo' in text or 'terrazza' in text:
            data.hasBalcony = True
        elif 'cantina' in text or 'taverna' in text:
            data.hasCellar = True
        elif 'classe energetica' in text:
            # Extract energy class (A4, A3, A2, A1, B, C, D, E, F, G)
            energy_match = re.search(r'\b(A[1-4]|[A-G])\b', text.upper())
            if energy_match:
                data.energyClass = energy_match.group(1)
        elif 'anno' in text and ('costruzione' in text or 'realizzazione' in text):
            year = extract_number(text)
            if year and 1800 <= year <= 2025:
                data.yearBuilt = int(year)

    # Try to extract property state from description or details
    all_text = soup.get_text().lower()
    if 'ottimo stato' in all_text or 'ottime condizioni' in all_text:
        data.state = 'ottimo'
    elif 'buono stato' in all_text or 'buone condizioni' in all_text:
        data.state = 'buono'
    elif 'da ristrutturare' in all_text or 'da rinnovare' in all_text:
        data.state = 'da_ristrutturare'
    elif 'discreto' in all_text:
        data.state = 'discreto'

    # Try to extract property type
    if 'signorile' in all_text or 'prestigio' in all_text:
        data.propertyType = 'signorile'
    elif 'economico' in all_text:
        data.propertyType = 'economico'
    elif 'ufficio' in all_text:
        data.propertyType = 'ufficio'
    elif 'negozio' in all_text or 'commerciale' in all_text:
        data.propertyType = 'negozio'
    else:
        data.propertyType = 'residenziale'

    # Description
    desc_elem = soup.select_one('div.comment, [class*="description"]')
    if desc_elem:
        data.description = desc_elem.text.strip()

    # Images - extract with better structure
    photos = soup.select('img.detail-image, [class*="gallery"] img, picture img')
    for img in photos:
        img_url = img.get('src') or img.get('data-src') or img.get('data-original')
        if img_url and img_url.startswith('http'):
            img_data = {
                'url': img_url,
                'alt': img.get('alt', ''),
                'caption': img.get('title', img.get('alt', ''))
            }
            if img_data not in data.images:
                data.images.append(img_data)

    return data

def parse_immobiliare(soup: BeautifulSoup, url: str) -> PropertyData:
    """Parse Immobiliare.it listing"""
    data = PropertyData(url=url, source='immobiliare')

    # Title
    title_elem = soup.select_one('h1.im-titleBlock__title')
    if not title_elem:
        title_elem = soup.select_one('h1')
    if title_elem:
        data.title = title_elem.text.strip()

    # Price
    price_elem = soup.select_one('div.im-mainFeatures__price')
    if not price_elem:
        price_elem = soup.select_one('[class*="price"]')
    if price_elem:
        data.price = extract_number(price_elem.text)

    # Address
    address_elem = soup.select_one('[class*="address"], [class*="location"]')
    if address_elem:
        address_text = address_elem.text.strip()
        data.address = address_text

        # Try to extract city and postal code
        if ',' in address_text:
            parts = [p.strip() for p in address_text.split(',')]
            if len(parts) >= 2:
                data.city = parts[-1]

        postal_match = re.search(r'\b\d{5}\b', address_text)
        if postal_match:
            data.postalCode = postal_match.group()

    # Description
    desc_elem = soup.select_one('[class*="description"]')
    if desc_elem:
        data.description = desc_elem.text.strip()

    # Features
    features = soup.select('div.im-features__item, [class*="feature"]')
    for feature in features:
        label = feature.select_one('dt, [class*="label"]')
        value = feature.select_one('dd, [class*="value"]')

        if not label or not value:
            continue

        label_text = label.text.lower()
        value_text = value.text.lower()

        if 'superficie' in label_text:
            data.surface = extract_number(value_text)
        elif 'locali' in label_text:
            data.rooms = int(extract_number(value_text) or 0)
        elif 'camere' in label_text:
            data.bedrooms = int(extract_number(value_text) or 0)
        elif 'bagni' in label_text:
            data.bathrooms = int(extract_number(value_text) or 0)
        elif 'piano' in label_text and 'piani' not in label_text:
            data.floor = int(extract_number(value_text) or 0)
        elif 'piani edificio' in label_text or 'totale piani' in label_text:
            data.totalFloors = int(extract_number(value_text) or 0)
        elif 'ascensore' in value_text or 'ascensore' in label_text:
            data.hasElevator = 'sì' in value_text or 'presente' in value_text
        elif 'box' in value_text or 'posto auto' in value_text or 'garage' in value_text:
            data.hasParking = True
        elif 'balcon' in value_text or 'terrazzo' in value_text:
            data.hasBalcony = True
        elif 'cantina' in value_text:
            data.hasCellar = True
        elif 'classe energetica' in label_text:
            energy_match = re.search(r'\b(A[1-4]|[A-G])\b', value_text.upper())
            if energy_match:
                data.energyClass = energy_match.group(1)
        elif 'anno' in label_text:
            year = extract_number(value_text)
            if year and 1800 <= year <= 2025:
                data.yearBuilt = int(year)
        elif 'stato' in label_text or 'condizioni' in label_text:
            if 'ottimo' in value_text:
                data.state = 'ottimo'
            elif 'buono' in value_text:
                data.state = 'buono'
            elif 'ristrutturare' in value_text:
                data.state = 'da_ristrutturare'
            elif 'discreto' in value_text:
                data.state = 'discreto'

    # Extract property type from page content
    all_text = soup.get_text().lower()
    if 'signorile' in all_text or 'prestigio' in all_text:
        data.propertyType = 'signorile'
    elif 'economico' in all_text:
        data.propertyType = 'economico'
    elif 'ufficio' in all_text:
        data.propertyType = 'ufficio'
    elif 'negozio' in all_text or 'commerciale' in all_text:
        data.propertyType = 'negozio'
    else:
        data.propertyType = 'residenziale'

    # Images
    photos = soup.select('img[class*="gallery"], picture img, [class*="photo"] img')
    for img in photos:
        img_url = img.get('src') or img.get('data-src') or img.get('data-original')
        if img_url and img_url.startswith('http'):
            img_data = {
                'url': img_url,
                'alt': img.get('alt', ''),
                'caption': img.get('title', img.get('alt', ''))
            }
            if img_data not in data.images:
                data.images.append(img_data)

    return data

def parse_casa(soup: BeautifulSoup, url: str) -> PropertyData:
    """Parse Casa.it listing"""
    data = PropertyData(url=url, source='casa')

    # Title
    title_elem = soup.select_one('h1')
    if title_elem:
        data.title = title_elem.text.strip()

    # Price
    price_elem = soup.select_one('span.price, [class*="price"]')
    if price_elem:
        data.price = extract_number(price_elem.text)

    return data

@router.post("/parse-url", response_model=PropertyData)
async def parse_url(request: ParseURLRequest):
    """
    Parse property listing URL and extract data using Playwright.
    Supports Idealista, Immobiliare.it, and Casa.it
    """
    url_str = str(request.url)

    # Determine source and validate URL pattern
    if 'idealista.it' in url_str:
        source = 'idealista'
        # Idealista URLs should contain /immobile/ followed by a number
        if not re.search(r'/immobile/\d+', url_str):
            raise HTTPException(
                status_code=400,
                detail="URL Idealista non valido. Deve contenere un annuncio specifico (es. /immobile/12345678)"
            )
    elif 'immobiliare.it' in url_str:
        source = 'immobiliare'
        # Immobiliare.it URLs should contain specific listing patterns
        if not re.search(r'/(vendita|affitto)/', url_str):
            raise HTTPException(
                status_code=400,
                detail="URL Immobiliare.it non valido. Deve essere un annuncio di vendita o affitto"
            )
    elif 'casa.it' in url_str:
        source = 'casa'
    else:
        raise HTTPException(
            status_code=400,
            detail="URL non supportato. Usa Idealista, Immobiliare.it o Casa.it"
        )

    try:
        # Fetch HTML using Playwright
        html = await fetch_url_with_playwright(url_str)
        soup = BeautifulSoup(html, 'lxml')

        # Parse based on source
        if source == 'idealista':
            data = parse_idealista(soup, url_str)
        elif source == 'immobiliare':
            data = parse_immobiliare(soup, url_str)
        else:  # casa
            data = parse_casa(soup, url_str)

        return data

    except PlaywrightTimeout:
        raise HTTPException(
            status_code=504,
            detail="Timeout nel caricamento della pagina. Riprova più tardi."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore nel parsing: {str(e)}"
        )

@router.get("/health")
async def health():
    return {"status": "healthy", "service": "scraper"}
