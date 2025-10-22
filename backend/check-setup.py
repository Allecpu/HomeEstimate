"""
Script to check if all dependencies are correctly installed
"""
import sys

def check_dependency(module_name, import_name=None):
    """Check if a Python module is installed"""
    if import_name is None:
        import_name = module_name

    try:
        __import__(import_name)
        print(f"✓ {module_name} is installed")
        return True
    except ImportError:
        print(f"✗ {module_name} is NOT installed")
        return False

def check_playwright_browsers():
    """Check if Playwright browsers are installed"""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch()
                browser.close()
                print("✓ Playwright Chromium browser is installed")
                return True
            except Exception as e:
                print(f"✗ Playwright Chromium browser is NOT installed: {e}")
                return False
    except ImportError:
        print("✗ Cannot check Playwright browsers (playwright not installed)")
        return False

def main():
    print("=" * 60)
    print("HomeEstimate Backend Dependencies Check")
    print("=" * 60)
    print()

    print("Python version:", sys.version)
    print("Python executable:", sys.executable)
    print()

    print("Checking dependencies...")
    print("-" * 60)

    deps = [
        ('fastapi', 'fastapi'),
        ('uvicorn', 'uvicorn'),
        ('pydantic', 'pydantic'),
        ('httpx', 'httpx'),
        ('beautifulsoup4', 'bs4'),
        ('lxml', 'lxml'),
        ('playwright', 'playwright'),
        ('tenacity', 'tenacity'),
    ]

    all_installed = True
    for module_name, import_name in deps:
        if not check_dependency(module_name, import_name):
            all_installed = False

    print()
    print("Checking Playwright browsers...")
    print("-" * 60)
    browsers_ok = check_playwright_browsers()

    print()
    print("=" * 60)
    if all_installed and browsers_ok:
        print("✓ All dependencies are correctly installed!")
        print()
        print("You can now start the backend with:")
        print("  uvicorn app.main:app --reload --port 8000")
    else:
        print("✗ Some dependencies are missing!")
        print()
        print("To install missing dependencies:")
        print("  1. pip install -r requirements.txt")
        print("  2. python -m playwright install chromium")
    print("=" * 60)

if __name__ == "__main__":
    main()
