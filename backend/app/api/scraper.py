import asyncio
import hashlib
import logging
import re
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.common.exceptions import TimeoutException as SeleniumTimeout, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager

from app.valuation.photo_condition import (
    PhotoConditionResult,
    PhotoConditionServiceError,
    analyze_photo_condition,
)

router = APIRouter()
logger = logging.getLogger(__name__)

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
    photoCondition: Optional[PhotoConditionResult] = None
    source: Optional[str] = None

def fetch_url_with_selenium(url: str) -> str:
    """Fetch URL content using Selenium (headless Edge)"""
    # Setup Edge options
    edge_options = Options()
    edge_options.add_argument('--headless=new')
    edge_options.add_argument('--no-sandbox')
    edge_options.add_argument('--disable-dev-shm-usage')
    edge_options.add_argument('--disable-gpu')
    edge_options.add_argument('--window-size=1920,1080')
    edge_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    edge_options.add_argument('--lang=it-IT')
    edge_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    # Initialize the driver with Chrome for Testing
    from selenium.webdriver.edge.service import Service as EdgeService
    from webdriver_manager.microsoft import EdgeChromiumDriverManager
    
    service = EdgeService(EdgeChromiumDriverManager().install())
    driver = webdriver.Edge(service=service, options=edge_options)
    driver.set_page_load_timeout(30)
    
    try:
        # Navigate to the URL
        driver.get(url)
        
        # Wait for dynamic content (implicit wait)
        import time
        time.sleep(2)
        
        # Get the HTML content
        html = driver.page_source
        
        return html
    finally:
        driver.quit()

async def download_photos_locally(photo_urls: list[str], listing_url: str) -> list[str]:
    """
    Download photos from URLs to local storage.
    Returns list of local file paths.

    Args:
        photo_urls: List of photo URLs to download
        listing_url: Original listing URL (used to create unique ID)

    Returns:
        List of local file paths where photos were saved
    """
    # Create unique ID for this listing based on URL
    listing_id = hashlib.md5(listing_url.encode()).hexdigest()[:12]

    # Create photos directory if it doesn't exist
    photos_dir = Path("storage/photos") / listing_id
    photos_dir.mkdir(parents=True, exist_ok=True)

    local_paths = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, photo_url in enumerate(photo_urls):
            try:
                # Download photo
                response = await client.get(photo_url)
                response.raise_for_status()

                # Determine file extension from URL or content-type
                ext = 'jpg'
                if '.' in photo_url:
                    url_ext = photo_url.split('.')[-1].split('?')[0].lower()
                    if url_ext in ['jpg', 'jpeg', 'png', 'webp']:
                        ext = url_ext

                # Save to local file
                filename = f"photo_{idx:03d}.{ext}"
                filepath = photos_dir / filename

                with open(filepath, 'wb') as f:
                    f.write(response.content)

                local_paths.append(str(filepath))
                logger.info(f"Downloaded photo {idx + 1}/{len(photo_urls)}: {filename}")

            except Exception as e:
                logger.warning(f"Failed to download photo {photo_url}: {e}")
                continue

    return local_paths

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

    # Address - try multiple selectors for Immobiliare.it
    address_elem = soup.select_one('div.im-titleBlock__location, [class*="address"], [class*="location"], .re-title__location')
    if address_elem:
        address_text = address_elem.text.strip()
        data.address = address_text

        # Try to extract city, province and postal code
        # Format examples: "via del Pirich, Lesa (NO)" or "via Roma, 20121 Milano (MI)"
        if ',' in address_text:
            parts = [p.strip() for p in address_text.split(',')]

            # Last part may contain city and province: "Lesa (NO)" or "20121 Milano (MI)"
            if len(parts) >= 2:
                last_part = parts[-1]

                # Extract province from parentheses: "(NO)" or "(MI)"
                province_match = re.search(r'\(([A-Z]{2})\)', last_part)
                if province_match:
                    data.province = province_match.group(1)
                    # Remove province from text: "Lesa (NO)" -> "Lesa"
                    last_part = re.sub(r'\s*\([A-Z]{2}\)', '', last_part).strip()

                # Extract postal code if present
                postal_match = re.search(r'\b(\d{5})\b', last_part)
                if postal_match:
                    data.postalCode = postal_match.group(1)
                    # Remove postal code from text: "20121 Milano" -> "Milano"
                    last_part = re.sub(r'\b\d{5}\b', '', last_part).strip()

                # What remains is the city
                if last_part:
                    data.city = last_part

            # Also try to extract address from first part
            if len(parts) >= 1 and not data.address:
                data.address = parts[0]

        # If no postal code found in address, search in whole text
        if not data.postalCode:
            postal_match = re.search(r'\b(\d{5})\b', address_text)
            if postal_match:
                data.postalCode = postal_match.group(1)

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
        html = fetch_url_with_selenium(url_str)
        soup = BeautifulSoup(html, 'lxml')

        # Parse based on source
        if source == 'idealista':
            data = parse_idealista(soup, url_str)
        elif source == 'immobiliare':
            data = parse_immobiliare(soup, url_str)
        else:  # casa
            data = parse_casa(soup, url_str)

        if data.images:
            photo_urls = [
                image.get("url")
                for image in data.images
                if isinstance(image, dict) and image.get("url")
            ]
            if photo_urls:
                # Download photos locally
                try:
                    logger.info(f"Downloading {len(photo_urls)} photos for listing...")
                    local_paths = await download_photos_locally(photo_urls[:8], url_str)  # Limit to 8 photos
                    logger.info(f"Successfully downloaded {len(local_paths)} photos locally")

                    # Analyze photos using local paths
                    if local_paths:
                        try:
                            # Pass local file paths directly (will be converted to base64)
                            analysis = await analyze_photo_condition(local_paths)
                        except PhotoConditionServiceError as exc:
                            logger.info("Photo condition analysis skipped: %s", exc)
                        except Exception as exc:  # noqa: BLE001
                            logger.warning("Unexpected error during photo analysis: %s", exc)
                        else:
                            if analysis:
                                data.photoCondition = analysis
                                if not data.state:
                                    data.state = analysis.label
                except Exception as e:
                    logger.warning(f"Failed to download photos: {e}")

        return data

    except SeleniumTimeout:
        raise HTTPException(
            status_code=504,
            detail="Timeout nel caricamento della pagina. Riprova più tardi."
        )
    except Exception as e:
        logger.exception("Error parsing URL: %s", url_str)
        raise HTTPException(
            status_code=500,
            detail=f"Errore nel parsing: {str(e)}"
        )

@router.get("/health")
async def health():
    return {"status": "healthy", "service": "scraper"}
