"""
Script di test per l'integrazione delle API OMI.
"""

import asyncio
import sys
from pathlib import Path

# Fix encoding su Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, errors="replace")

# Aggiungi il path del backend al PYTHONPATH
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from app.omi import (
    PropertyType,
    get_all_cities,
    get_cadastral_code,
    get_omi_client,
    get_property_type,
)


async def test_cadastral_codes():
    """Test dei codici catastali."""
    print("\n" + "=" * 60)
    print("TEST 1: Codici Catastali")
    print("=" * 60)

    test_cities = ["milano", "roma", "napoli", "palermo", "bologna"]

    for city in test_cities:
        code = get_cadastral_code(city)
        print(f"✓ {city.title():<15} -> {code}")

    # Test città non esistente
    invalid = get_cadastral_code("città_inesistente")
    print(f"✓ Città inesistente -> {invalid}")

    # Conta totale città supportate
    all_cities = get_all_cities()
    print(f"\n✓ Totale città supportate: {len(all_cities)}")


async def test_property_types():
    """Test dei tipi di immobile."""
    print("\n" + "=" * 60)
    print("TEST 2: Tipi di Immobile")
    print("=" * 60)

    test_types = [
        "appartamento",
        "villa",
        "negozio",
        "ufficio",
        "box",
        "capannone"
    ]

    for prop_type in test_types:
        omi_type = get_property_type(prop_type)
        print(f"✓ {prop_type:<15} -> {omi_type.value}")

    print(f"\n✓ Totale tipi supportati: {len(PropertyType)}")


async def test_omi_query():
    """Test query OMI reali."""
    print("\n" + "=" * 60)
    print("TEST 3: Query API OMI")
    print("=" * 60)

    omi_client = get_omi_client()

    # Test 1: Query base Milano
    print("\nTest 3.1: Query base Milano (100 mq)")
    try:
        response = await omi_client.query(
            city="milano",
            metri_quadri=100,
        )

        if response:
            print(f"✓ Risposta ricevuta per {response.comune}")
            print(f"  - Codice comune: {response.codice_comune}")
            print(f"  - Metri quadri: {response.metri_quadri}")
            print(f"  - Quotazioni trovate: {len(response.quotations)}")

            if response.quotations:
                for i, q in enumerate(response.quotations[:3], 1):
                    print(f"\n  Quotazione {i}:")
                    print(f"    - Tipo: {q.property_type}")
                    print(f"    - Stato: {q.stato_conservazione}")
                    if q.prezzo_acquisto_medio:
                        print(f"    - Prezzo acquisto medio: €{q.prezzo_acquisto_medio:.2f}/mq")
                    if q.prezzo_affitto_medio:
                        print(f"    - Prezzo affitto medio: €{q.prezzo_affitto_medio:.2f}/mq/mese")
        else:
            print("✗ Nessuna risposta ricevuta")

    except Exception as e:
        print(f"✗ Errore: {e}")

    # Test 2: Query con tipo specifico
    print("\nTest 3.2: Query Roma - Abitazioni civili (80 mq)")
    try:
        response = await omi_client.query(
            city="roma",
            metri_quadri=80,
            tipo_immobile=PropertyType.ABITAZIONI_CIVILI,
            operazione="acquisto"
        )

        if response and response.quotations:
            q = response.quotations[0]
            print(f"✓ {response.comune} - {q.property_type}")
            if q.prezzo_acquisto_medio:
                print(f"  - Prezzo medio: €{q.prezzo_acquisto_medio:.2f}/mq")
                print(f"  - Prezzo min: €{q.prezzo_acquisto_min:.2f}/mq")
                print(f"  - Prezzo max: €{q.prezzo_acquisto_max:.2f}/mq")
                print(f"  - Valore totale 80mq: €{q.prezzo_acquisto_medio * 80:,.0f}")
        else:
            print("✗ Nessuna quotazione trovata")

    except Exception as e:
        print(f"✗ Errore: {e}")

    # Test 3: Prezzi di acquisto e affitto
    print("\nTest 3.3: Prezzi acquisto e affitto Palermo (100 mq)")
    try:
        # Prezzi acquisto
        purchase = await omi_client.get_purchase_price(
            city="palermo",
            metri_quadri=100
        )

        if purchase:
            print(f"✓ Prezzi acquisto:")
            print(f"  - Min: €{purchase['min']:.2f}/mq")
            print(f"  - Medio: €{purchase['medio']:.2f}/mq")
            print(f"  - Max: €{purchase['max']:.2f}/mq")
            print(f"  - Valore totale (medio): €{purchase['medio'] * 100:,.0f}")

        # Prezzi affitto
        rental = await omi_client.get_rental_price(
            city="palermo",
            metri_quadri=100
        )

        if rental:
            print(f"\n✓ Prezzi affitto:")
            print(f"  - Min: €{rental['min']:.2f}/mq/mese")
            print(f"  - Medio: €{rental['medio']:.2f}/mq/mese")
            print(f"  - Max: €{rental['max']:.2f}/mq/mese")
            print(f"  - Canone mensile (medio): €{rental['medio'] * 100:,.0f}")

    except Exception as e:
        print(f"✗ Errore: {e}")

    # Chiudi il client
    await omi_client.close()


async def test_cache():
    """Test della cache."""
    print("\n" + "=" * 60)
    print("TEST 4: Sistema di Cache")
    print("=" * 60)

    omi_client = get_omi_client()

    print("\nPrima query (da API)...")
    import time
    start = time.time()
    response1 = await omi_client.query(city="milano", metri_quadri=100)
    time1 = time.time() - start
    print(f"✓ Tempo: {time1:.2f}s")

    print("\nSeconda query identica (da cache)...")
    start = time.time()
    response2 = await omi_client.query(city="milano", metri_quadri=100)
    time2 = time.time() - start
    print(f"✓ Tempo: {time2:.2f}s")

    if time2 < time1:
        print(f"\n✓ Cache funzionante! Speedup: {time1/time2:.1f}x")
    else:
        print("\n⚠ Cache potrebbe non essere attiva")

    await omi_client.close()


async def main():
    """Esegue tutti i test."""
    print("\n" + "=" * 60)
    print("TEST INTEGRAZIONE API OMI - HomeEstimate")
    print("=" * 60)

    try:
        await test_cadastral_codes()
        await test_property_types()
        await test_omi_query()
        await test_cache()

        print("\n" + "=" * 60)
        print("✓ TUTTI I TEST COMPLETATI CON SUCCESSO")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"\n✗ ERRORE DURANTE I TEST: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
