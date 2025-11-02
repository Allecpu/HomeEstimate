from fastapi import APIRouter

router = APIRouter()

from app.api import photo_analysis, scraper, valuation

# Include sub-routes
router.include_router(scraper.router, prefix="/scraper", tags=["scraper"])
router.include_router(valuation.router, prefix="/valuation", tags=["valuation"])
router.include_router(photo_analysis.router, prefix="/analysis", tags=["analysis"])
