# Raport weryfikacji

Wersja 1.0.0, weryfikacja lokalna 5 października 2026. Wszystkie dane użyte do testów są fikcyjne.

## Wyniki końcowe

| Kontrola | Wynik |
| --- | --- |
| TypeScript (`tsc --noEmit`) | OK |
| Produkcyjny build Next.js i generowanie Prisma Client | OK |
| Granice importów klienta bazy | OK |
| Vitest — jednostkowe | 30 testów |
| Vitest — integracyjne | 61 testów |
| Playwright Chromium | 16 scenariuszy |
| Szyfrowanie i integralność kopii (Node test runner) | 1 test |
| npm audit, zależności produkcyjne | 0 zgłoszonych podatności w dniu weryfikacji |
| Compose i CI | poprawna składnia YAML; bez uruchomienia Dockera w tym środowisku |

Łącznie 108 testów/scenariuszy. Dane operatorów płatności i wysyłki w testach integracyjnych są kontrolowane przez mocki; nie wykonano rzeczywistych transakcji, zwrotów ani wysyłki wiadomości.

## Bramki etapów

| Etap | Jednostkowe | Integracyjne | Pozostałe |
| --- | --- | --- | --- |
| 1 | 24 | 31 | build, 12 E2E |
| 2 | 30 | 38 | build |
| 3 | 30 | 44 | build |
| 4 | 30 | 49 | build |
| 5 | 30 | 53 | build |
| 6 | 30 | 57 | build |
| 7 | 30 | 60 | build, 15 E2E |
| 8 / końcowe poprawki | 30 | 61 | build, 16 E2E, integralność kopii |

Test E2E wykrył problem z jednoznacznym wyborem elementu formularza oraz z oczekiwaniem testu na zakończenie nawigacji. Poprawiono etykietę select i synchronizację scenariusza. Sprawdzono ponownie całą ścieżkę pacjent → notatka → wizyta → wpłata → eksport.

## Co obejmują testy

- izolacja tenantów także dla nieznanego/obcego identyfikatora; złożone FK w bazie;
- odmowa odczytu dokumentacji dla STAFF i SUPER_ADMIN, prywatność autora notatki i jej wersji;
- blokady kont, sesje, bezczynność, odwołanie uprawnień, hasła, TOTP i próby ponownego użycia kodu;
- szyfrogramy i AAD, odrzucenie modyfikacji, brak jawnej treści w bazie/plikach;
- kolizje, godziny pracy, urlopy, zmiana czasu, cykle i kontrola wersji;
- idempotencja wpłat/webhooków, kwoty, podpis P24, kolejność zdarzeń Stripe;
- zgody, deduplikacja przypomnień, jednorazowy link i wycofanie zgody;
- reset hasła, sesje wsparcia, zarządzanie zespołem i izolacja feedbacku;
- eksport prywatnych notatek oraz eksport ponad 300 wizyt, retencja, usuwanie i kolejka plików;
- logowanie, rejestracja, responsywność, motyw, Ctrl+K, CSRF, nagłówki i publiczna rezerwacja;
- automatyczny skan axe dashboardu pod reguły WCAG 2 A/AA oraz WCAG 2.1 AA;
- uwierzytelnienie kopii przed udostępnieniem jawnych danych.

## Ograniczenia środowiska

Kontener wykonawczy nie pozwalał uruchomić natywnego PostgreSQL/Dockera. Migracje i testy integracyjne wykonano na dwóch oddzielnych instancjach PostgreSQL WASM/PGlite z adapterem protokołu PostgreSQL. Każdy plik testów uruchamiano osobno, czyszcząc przygotowane instrukcje adaptera pomiędzy procesami. E2E korzystały z produkcyjnego buildu Next.js i Chromium 153.

To sprawdza logikę SQL, relacje, autoryzację oraz ścieżki aplikacji, ale **nie zastępuje testów wieloprocesowych blokad i wydajności na natywnym PostgreSQL**. Workflow CI zawiera PostgreSQL 17; należy uruchomić go w docelowym repozytorium. Nie potwierdzono startu obrazu Docker, rzeczywistego pg_dump/pg_restore ani konfiguracji hostingu, domeny, TLS czy kont operatorów. Test kopii dotyczył warstwy szyfrowania/integralności, nie odzyskiwania rzeczywistego serwera.

Automatyczna dostępność nie jest pełnym audytem WCAG. Brak podatności w `npm audit` oznacza brak zgłoszeń w użytej bazie advisory w danym momencie, nie brak wszystkich możliwych problemów bezpieczeństwa.

## Podglądy

- `podglad-gabinet.png` — dashboard na komputerze.
- `podglad-telefon.png` — dashboard przy szerokości 390 px.

Instrukcja samodzielnej weryfikacji i konfiguracji operatorów jest w README i WDROZENIE.md.

## Uzupełnienie hostingu (2026-10-05)

Po dodaniu konfiguracji Railway ponownie przeszło 30 testów jednostkowych, 4 nowe testy konfiguracji produkcyjnej, kontrola granic dostępu do bazy, TypeScript i produkcyjny build. Nie powtarzano pozostałych testów integracyjnych/E2E: warstwa biznesowa nie uległa zmianie. Nie wykonano wdrożenia Railway — potrzebne połączenie konta.
