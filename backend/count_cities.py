"""
Script semplice per contare le città supportate per regione
"""
from app.omi.cadastral_codes import get_all_cities

cities = get_all_cities()

# Definisci i comuni per regione in base ai capoluoghi e province
lombardia_keywords = [
    'milano', 'bergamo', 'brescia', 'como', 'cremona', 'lecco', 'lodi', 'mantova',
    'monza', 'pavia', 'sondrio', 'varese',
    # Comuni provincia Milano
    'rho', 'sesto', 'cinisello', 'legnano', 'abbiategrasso', 'magenta', 'corbetta',
    'melzo', 'gorgonzola', 'segrate', 'cologno', 'donato', 'corsico', 'rozzano',
    'opera', 'buccinasco', 'giuliano', 'pioltello', 'vimodrone', 'peschiera',
    # Comuni provincia Monza e Brianza
    'desio', 'seregno', 'lissone', 'cesano', 'limbiate', 'vimercate', 'carate',
    'brugherio', 'giussano', 'muggio',
    # Comuni provincia Bergamo
    'treviglio', 'seriate', 'dalmine', 'romano', 'albino', 'alzano', 'caravaggio',
    'stezzano', 'ponte', 'trescore',
    # Comuni provincia Brescia
    'desenzano', 'montichiari', 'lumezzane', 'chiari', 'rezzato', 'ghedi',
    'palazzolo', 'manerbio', 'orzinuovi', 'rovato',
    # Comuni provincia Como
    'erba', 'cantù', 'mariano', 'olgiate', 'lomazzo', 'menaggio', 'cernobbio',
    # Comuni provincia Varese
    'busto', 'gallarate', 'saronno', 'tradate', 'luino', 'castellanza', 'somma',
    'malnate', 'cassano',
    # Comuni provincia Pavia
    'vigevano', 'voghera', 'mortara', 'stradella',
    # Comuni provincia Cremona
    'crema', 'casalmaggiore',
    # Comuni provincia Mantova
    'castiglione', 'suzzara', 'viadana',
    # Comuni provincia Lecco
    'merate', 'calolziocorte',
    # Comuni provincia Lodi
    'codogno', 'angelo',
    # Comuni provincia Sondrio
    'tirano', 'morbegno'
]

piemonte_keywords = [
    'torino', 'alessandria', 'asti', 'biella', 'cuneo', 'novara', 'verbania', 'vercelli',
    # Comuni provincia Torino
    'moncalieri', 'rivoli', 'collegno', 'settimo', 'nichelino', 'venaria', 'chieri',
    'pinerolo', 'carmagnola', 'ivrea', 'grugliasco', 'chivasso', 'orbassano',
    'beinasco', 'mauro', 'caselle', 'alpignano', 'avigliana', 'giaveno', 'cirié',
    'leini', 'volpiano', 'rivarolo', 'trofarello', 'cuorgné', 'piossasco',
    # Comuni provincia Alessandria
    'casale', 'novi', 'tortona', 'acqui', 'valenza', 'ovada',
    # Comuni provincia Asti
    'canelli', 'nizza',
    # Comuni provincia Biella
    'cossato', 'candelo',
    # Comuni provincia Cuneo
    'alba', 'bra', 'fossano', 'mondovì', 'savigliano', 'saluzzo', 'borgo',
    # Comuni provincia Novara
    'arona', 'borgomanero', 'galliate', 'trecate',
    # Comuni provincia Verbania
    'omegna', 'domodossola', 'villadossola', 'stresa',
    # Comuni provincia Vercelli
    'borgosesia', 'santhià'
]

# Conta le città per regione
lombardia_cities = {name: code for name, code in cities.items()
                   if any(keyword in name for keyword in lombardia_keywords)}
piemonte_cities = {name: code for name, code in cities.items()
                  if any(keyword in name for keyword in piemonte_keywords)}

print(f"📊 Statistiche Città Supportate\n")
print(f"Totale città supportate: {len(cities)}")
print(f"\n🏔️  Lombardia: {len(lombardia_cities)} città")
print(f"🏔️  Piemonte: {len(piemonte_cities)} città")
print(f"\n📍 Altre regioni: {len(cities) - len(lombardia_cities) - len(piemonte_cities)} città")

print("\n✅ Top 10 città Lombardia:")
for i, (city, code) in enumerate(list(lombardia_cities.items())[:10], 1):
    print(f"   {i}. {city.title()} - {code}")

print("\n✅ Top 10 città Piemonte:")
for i, (city, code) in enumerate(list(piemonte_cities.items())[:10], 1):
    print(f"   {i}. {city.title()} - {code}")
