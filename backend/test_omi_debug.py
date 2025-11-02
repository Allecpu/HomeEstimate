"""
Script di debug per vedere la struttura esatta della risposta API OMI.
"""

import asyncio
import json
import sys
from pathlib import Path

# Fix encoding su Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, errors="replace")

# Aggiungi il path del backend al PYTHONPATH
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

import httpx

async def debug_omi_response():
    """Analizza la struttura della risposta OMI."""
    print("Debug risposta API OMI\n" + "=" * 60)

    # Test con Milano
    url = "https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca"
    params = {
        "codice_comune": "F205",  # Milano
        "metri_quadri": 100,
    }

    print(f"\nURL: {url}")
    print(f"Parametri: {json.dumps(params, indent=2)}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            print(f"\nCodice risposta: {response.status_code}")
            print(f"\nTipo risposta: {type(data)}")
            print(f"\nNumero di chiavi nella risposta: {len(data) if isinstance(data, dict) else 'N/A'}")

            # Mostra la struttura generale
            print("\n\nSTRUTTURA RISPOSTA:")
            print("=" * 60)

            if isinstance(data, dict):
                for key, value in list(data.items())[:3]:  # Mostra primi 3 elementi
                    print(f"\nChiave: '{key}'")
                    print(f"Tipo valore: {type(value)}")

                    if isinstance(value, dict):
                        print(f"Campi nel dizionario:")
                        for subkey, subvalue in value.items():
                            print(f"  - {subkey}: {type(subvalue).__name__} = {subvalue}")
                    else:
                        print(f"Valore: {value}")

            # Salva la risposta completa in un file per analisi
            debug_file = backend_path / "omi_response_debug.json"
            with open(debug_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            print(f"\n\n✓ Risposta completa salvata in: {debug_file}")

            # Prova anche con tipo specifico
            print("\n\n" + "=" * 60)
            print("Test con tipo immobile specifico")
            print("=" * 60)

            params2 = {
                "codice_comune": "F205",
                "metri_quadri": 100,
                "tipo_immobile": "abitazioni_civili",
                "operazione": "acquisto"
            }

            response2 = await client.get(url, params=params2)
            data2 = response2.json()

            debug_file2 = backend_path / "omi_response_specific.json"
            with open(debug_file2, "w", encoding="utf-8") as f:
                json.dump(data2, f, indent=2, ensure_ascii=False)

            print(f"✓ Risposta con tipo specifico salvata in: {debug_file2}")

            print("\nPrime chiavi della risposta con tipo specifico:")
            if isinstance(data2, dict):
                for key in list(data2.keys())[:5]:
                    print(f"  - {key}")

        except Exception as e:
            print(f"\n✗ Errore: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(debug_omi_response())
