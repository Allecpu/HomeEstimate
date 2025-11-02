"""Test script to debug the suggest endpoint."""
import traceback
import sys
sys.path.insert(0, '.')

async def test_suggest():
    """Test the suggest endpoint logic directly."""
    try:
        from app.omi.suggester import suggest_property_type, suggest_omi_zone

        address = "Via Roma 10"
        city = "Milano"

        print(f"Testing suggest functions with address='{address}', city='{city}'")

        # Test 1: suggest_property_type
        print("\n1. Testing suggest_property_type...")
        suggested_type = suggest_property_type(address, None)
        print(f"   Result: {suggested_type}")

        # Test 2: suggest_omi_zone
        print("\n2. Testing suggest_omi_zone...")
        suggested_zone = await suggest_omi_zone(city, address)
        print(f"   Result: {suggested_zone}")

        # Test 3: Full response
        print("\n3. Testing full response...")
        result = {
            "suggested_property_type": suggested_type,
            "suggested_zone": suggested_zone,
            "confidence": "medium"
        }
        print(f"   Result: {result}")

        print("\n✅ All tests passed!")
        return result

    except Exception as e:
        print(f"\n❌ Error occurred:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        print(f"\nFull traceback:")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_suggest())
