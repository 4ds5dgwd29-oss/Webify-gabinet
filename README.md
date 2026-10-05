# Webify Gabinet

Polska aplikacja SaaS do prowadzenia jednoosobowej praktyki psychologicznej i małego zespołu. Repozytorium zawiera interfejs, serwer, schemat PostgreSQL, migracje, integracje, testy, demo i konfigurację uruchomienia. Nie wymaga usług płatniczych do sprawdzenia lokalnych modułów.

## Uruchomienie w Dockerze

Wymagane Docker Engine z Compose v2 oraz Node.js 22+ do wygenerowania konfiguracji.

```bash
node scripts/setup-env.mjs
docker compose up --build -d
docker compose run --rm -e ALLOW_DEMO_SEED=true app npm run db:seed
```

Otwórz **http://localhost:3000**. Migracje wykonuje jednorazowy kontener `migrate`; aplikacja czeka na jego powodzenie. Worker uruchamia kolejkę wiadomości, uzgadnianie subskrypcji, wygaszanie rezerwacji i czyszczenie danych technicznych.

Hasło demonstracyjne znajduje się w `DEMO_PASSWORD` w lokalnym `.env`. Generator tworzy osobne losowe sekrety; paczka nie zawiera gotowych haseł.

| Konto demo | Rola |
| --- | --- |
| anna@webify.example | Właściciel Gabinetu Spokój |
| recepcja@webify.example | Recepcja Gabinetu Spokój |
| piotr@webify.example | Właściciel innego, izolowanego gabinetu |
| admin@webify.example | Administrator Webify |

Wszystkie osoby, wizyty i notatki demo są fikcyjne. Seed nie nadpisuje istniejących haseł ani dokumentacji. Demo nie wysyła wiadomości bez skonfigurowanych operatorów. Nie uruchamiaj seed na rzeczywistych danych. `docker compose down` zachowuje wolumeny; opcja `-v` je usuwa.

## Uruchomienie bez Dockera

Wymagane Node.js 22+, npm oraz PostgreSQL 17. Utwórz osobne bazy `webify` i `webify_test`.

```bash
node scripts/setup-env.mjs
npm ci
# Dopasuj DATABASE_URL i TEST_DATABASE_URL w .env do swojej bazy.
npm run db:migrate
npm run db:seed
npm run dev
```

Drugi terminal dla zadań cyklicznych:

```bash
node --env-file=.env scripts/worker.mjs
```

W lokalnym `.env` ustaw `APP_INTERNAL_URL=http://localhost:3000`; adres `http://app:3000` dotyczy sieci Compose. Dla buildu produkcyjnego: `npm run build`, następnie `npm run start -- --hostname 0.0.0.0`. Obraz Docker korzysta z serwera standalone.

## Co jest zaimplementowane

| Etap | Funkcje |
| --- | --- |
| 1 | Next.js App Router, TypeScript, Prisma/PostgreSQL, logowanie hasłem, opcjonalne TOTP, role i izolacja gabinetów |
| 2 | Pacjenci, zgody, tagi, filtry, CSV, archiwum, kalendarz dzień/tydzień/miesiąc, cykle, kolizje, godziny i urlopy, iCal |
| 3 | Rich-text SOAP/DAP/wywiad, autozapis, wersje i prywatne notatki, szyfrowanie, plan terapii, cele, oś czasu, pliki i PDF |
| 4 | Dashboard, przypomnienia e-mail/SMS, jednorazowe linki, cennik, wpłaty, potwierdzenia PDF i raport miesięczny |
| 5 | Stripe Checkout/Portal/webhooki, plany i limity, grace period, Przelewy24, rezerwacja publiczna, zadatki i płatności pełne |
| 6 | Panel platformy, statusy gabinetów, plany, rabaty, metryki, konta, sesje wsparcia, opinie testerów, logi |
| 7 | Audit log, eksport, kontrolowana retencja/usuwanie, szablony dokumentów organizacyjnych, zabezpieczenia i E2E |
| 8 | Migracje, demo, Docker Compose, worker, szyfrowane kopie, odtwarzanie, bootstrap administratora, CI i dokumentacja |

Interfejs jest po polsku, responsywny, z trybem ciemnym, wyszukiwaniem `Ctrl/Cmd+K` i automatycznym wylogowaniem po 15 minutach bezczynności. Onboarding w ustawieniach ma trzy kroki: dane gabinetu, godziny pracy, CSV.

## Struktura

```text
src/app/                 strony App Router i endpointy API
src/app/(workspace)/    panel gabinetu, konto i panel platformy
src/components/         formularze, kalendarz i moduły interfejsu
src/components/ui/      lokalne komponenty w konwencji shadcn/ui
src/server/auth/        NextAuth, hasła, sesje, TOTP, limity prób
src/server/dal/         jedyna warstwa dostępu do danych aplikacji
src/server/security/    role, szyfrowanie, sanitizacja i obsługa HTTP
src/server/storage.ts   szyfrowane pliki lokalne lub S3
src/server/p24.ts       transport i podpisy Przelewy24
src/server/stripe.ts    klient Stripe
prisma/schema.prisma    schemat, indeksy i relacje
prisma/migrations/      migracje SQL, ograniczenia i niezmienny audyt
prisma/seed.ts          fikcyjne demo
scripts/                bootstrap, worker, kopie i odtwarzanie
tests/                  testy jednostkowe, integracyjne i Playwright
docs/                   architektura, wdrożenie, weryfikacja, podglądy
```

## Model danych i uprawnienia

Każdy rekord podległy ma `tenantId`. `Tenant` jest korzeniem izolacji. Złożone klucze obce, np. `(tenantId, patientId)`, zapobiegają przypięciu wizyty, dokumentu czy notatki do innego gabinetu. Metody DAL pobierają tenant z ponownie zweryfikowanej sesji, nigdy z żądania użytkownika. Plany, webhooki, kupony i logi systemowe należą do technicznego tenantu `webify-platform`; dodatkowe ograniczenia SQL wymuszają tę własność.

| Zasób | OWNER | STAFF | SUPER_ADMIN |
| --- | --- | --- | --- |
| Pacjenci, terminy, wpłaty | Własny gabinet | Własny gabinet | Brak |
| Notatki, cele, plan, dokumenty, eksport | Własny gabinet | Brak | Brak |
| Notatki „tylko dla mnie” | Tylko autor | Brak | Brak |
| Zespół, integracje, retencja | Własny gabinet | Brak | Brak bezpośredniego dostępu |
| Plany i konta platformy | Brak | Brak | Metadane administracyjne |

Tryb wsparcia administratora to ograniczona, audytowana sesja podglądu konfiguracji (15 minut), bez przejęcia tożsamości psychologa. Rozpoczęcie, odczyt i zakończenie są rejestrowane. Nie nadaje dostępu do kart pacjentów ani notatek.

Notatki, ich wersje, cele, plan, nazwy i zawartość dokumentów oraz migawki potwierdzeń płatności używają AES-256-GCM. Klucz danych jest osobny dla każdego gabinetu, opakowany kluczem głównym. AAD wiąże szyfrogram z gabinetem, zasobem i wersją. Utrata `MASTER_ENCRYPTION_KEY` oznacza utratę dostępu do tych danych; sam backup bazy nie wystarczy.

Dane kontaktowe i terminy są w bazie w postaci umożliwiającej wyszukiwanie. W produkcji wymagają szyfrowania dysków/bazy przez operatora hostingu, TLS i odpowiednich uprawnień. Aplikacja sama nie konfiguruje infrastruktury hostingu.

## Integracje

### Stripe — abonament gabinetu

1. Ustaw `STRIPE_SECRET_KEY` oraz `STRIPE_WEBHOOK_SECRET`.
2. Utwórz w Stripe miesięczne i roczne ceny w PLN. W panelu Webify wpisz ich `price_...` w planach Start/Pro/Zespół. Ceny w seed są przykładowe.
3. W Stripe skonfiguruj Customer Portal: zmiana planów, anulowanie, metody płatności i faktury. Ustal zasady proracji i dopuszczalne ceny.
4. Skieruj webhook na `/api/webhooks/stripe`. Zaznacz `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Checkout korzysta z pozostałej części aktualnego okresu próbnego, zamiast przyznawać kolejny trial przy każdym zakupie.

Podpis jest sprawdzany na surowym body. Przetworzone identyfikatory zdarzeń są unikalne. Stan jest odczytywany ponownie z API Stripe, starsze zdarzenia nie nadpisują nowszych. Worker okresowo uzgadnia subskrypcje. `past_due` daje 7 dni grace period; potem zapis zostaje zablokowany, dane pozostają do odczytu. Zawieszenia administracyjnego webhook nie odblokowuje. Faktury dla gabinetów są dostępne w Stripe Customer Portal. Kody rabatowe tworzone w panelu administratora są synchronizowane do Stripe.

### Przelewy24 — wpłaty pacjentów

Każdy gabinet konfiguruje **własne konto sprzedawcy** w widoku Subskrypcja i rezerwacje. `merchantId`, `posId`, klucz API, CRC i wybór sandbox/live są szyfrowane; API nie odsyła sekretów do formularza. Platforma nie działa jako pośrednik wypłacający środki gabinetom.

Callback: `/api/webhooks/p24`. Sprawdzane są SHA-384, sprzedawca, waluta, kwota i identyfikator zamówienia; następnie serwer wywołuje `transaction/verify`. Dopiero powodzenie zapisuje wpłatę. Powtórzony callback nie tworzy kolejnej wpłaty. Nie przechowujemy numerów kart. BLIK, karty i przelewy są wybierane na stronie operatora, zależnie od konfiguracji konta sprzedawcy.

Publiczna rezerwacja `/rezerwacja/<slug>` pokazuje dostępne godziny bez danych pacjentów. Tryby: bez przedpłaty, zadatek z cennika albo pełna kwota. Termin płatny jest blokowany na 15 minut. Nieudane połączenie z operatorem pozwala ponowić przekierowanie. Spóźniona wpłata, odwołana wizyta lub nadpłata otrzymuje stan wymagający uzgodnienia. Zwrot wykonuje się w panelu Przelewy24, a w Webify zapisuje jego potwierdzenie po ponownym podaniu hasła.

### E-mail i SMS

Resend: `RESEND_API_KEY`, `EMAIL_FROM` ze zweryfikowanej domeny. SMSAPI: `SMSAPI_TOKEN`, opcjonalnie zatwierdzony `SMS_FROM`. Włącz kanały w ustawieniach przypomnień. Worker obsługuje także zaproszenia i reset hasła. Bez niego wiadomości pozostaną w kolejce.

Przypomnienia są planowane w oknie 24 godzin przed wizytą. Ponownie sprawdzana jest zgoda na kontakt, wersja/status terminu i aktywność gabinetu. Wysyłka ma lease, limit prób, ponawianie i klucz idempotencji operatora. Po przekroczeniu okna idempotencji stara próba nie jest ponawiana automatycznie. Link wymaga świadomego kliknięcia przycisku; samo wejście GET niczego nie potwierdza ani nie odwołuje.

### Pliki i iCal

`STORAGE_DRIVER=local` zapisuje szyfrogramy poza katalogiem publicznym. Dla `s3` skonfiguruj bucket w UE, region, credentials lub rolę workload, opcjonalny endpoint zgodny z S3. Pliki są szyfrowane także przed wysłaniem do S3, a upload żąda SSE AES256. Limit pojedynczego pliku: 10 MB; PDF, PNG, JPEG, TXT. Pobieranie wyłącznie po autoryzacji, jako załącznik.

iCal to eksport i **jednokierunkowa subskrypcja** harmonogramu, bez nazw pacjentów i notatek. Link subskrypcji zawiera sekret; jego odnowienie unieważnia stary adres. Nie ma dwukierunkowej integracji z Google Calendar/Outlook. Wizyty online korzystają z podanego linku HTTPS; Webify nie jest serwerem wideokonferencji.

## Eksport i retencja

Ochrona danych → wybór pacjenta → eksport JSON zawiera dane kontaktowe, wizyty, dostępne notatki i wersje, plan, cele, wpłaty oraz dokumenty zakodowane base64. Prywatne notatki innych autorów pozostają chronione; eksport wskazuje liczbę pominiętych wpisów. Administrator danych musi skompletować osobne eksporty autorów przed odpowiedzią na żądanie dotyczące całości dokumentacji.

Domyślnie karta ma blokadę trwałego usunięcia. Właściciel ustala datę retencji po analizie obowiązków dokumentacyjnych i rozliczeniowych. Usunięcie wymaga: archiwum, upływu retencji, zdjęcia blokady, zamknięcia otwartych płatności, potwierdzenia tekstowego oraz hasła. Pliki usuwa ponawialna kolejka. Audyt nie przechowuje treści usuniętej karty. Kopie zapasowe wygasają osobno; procedura odtworzenia musi ponownie zastosować późniejsze usunięcia.

Generator PDF oferuje politykę prywatności, regulamin, umowę powierzenia i formularz zgód. Są to **projekty do uzupełnienia i zatwierdzenia przez prawnika**, nie certyfikat zgodności z RODO ani gotowe ustalenie okresów retencji.

## Kopie zapasowe

```bash
docker compose --profile backup up --build -d backup
```

Kopie tworzone są co 24 godziny, domyślna retencja 30 dni. Profil zapisuje szyfrowany zrzut PostgreSQL, a przy lokalnym storage również archiwum plików. AES-256-GCM używa odrębnego `BACKUP_ENCRYPTION_KEY`. Znacznik `.json` oznacza ukończenie zestawu. Przenieś kopie poza host aplikacji, do szyfrowanego magazynu w UE; lokalny wolumen nie chroni przed utratą serwera.

```bash
# Jednorazowa kopia w kontenerze backup:
docker compose --profile backup run --rm backup node scripts/backup.mjs --once
# Odtwarzanie: tylko do nowej pustej bazy i pustego katalogu plików.
node --env-file=.env scripts/restore.mjs db /sciezka/kopia.db.enc postgresql://.../pusta_baza --potwierdz-odtworzenie
node --env-file=.env scripts/restore.mjs files /sciezka/kopia.files.enc /pusty/katalog --potwierdz-odtworzenie
```

Odtworzenie wymaga PostgreSQL 17 client tools (`pg_restore`) i `tar`; są w obrazie backup. Cały szyfrogram jest uwierzytelniany przed odtwarzaniem. Dla spójnego punktu bazy i lokalnych plików wykonuj backup w oknie wstrzymanych zapisów albo użyj spójnych snapshotów infrastruktury. Dla S3 skonfiguruj niezależną replikację, wersjonowanie i politykę usuwania wersji; skrypt nie archiwizuje bucketa. Regularnie wykonuj próbne odtworzenie oraz kontrolę kompletności dokumentów.

## Testy

**Testy integracyjne czyszczą całą bazę wskazaną przez `TEST_DATABASE_URL`. Nigdy nie wskazuj bazy użytkowej.**

```bash
npm run typecheck
npm run check:boundaries
npm test
npm run test:backup
npm run test:integration
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --omit=dev
```

Osobnej bazie testowej należy wcześniej zastosować migracje: `DATABASE_URL=<adres_bazy_testowej> npm run db:migrate`. E2E wymagają demo w bazie aplikacji i `DEMO_PASSWORD`; Playwright uruchamia produkcyjny build. CI w `.github/workflows/ci.yml` definiuje PostgreSQL 17 i powyższe kontrole.

Szczegółowy wynik lokalnej weryfikacji i jej ograniczenia: [docs/WERYFIKACJA.md](docs/WERYFIKACJA.md). W dostarczonym środowisku testy bazy wykonano przez PostgreSQL WASM/PGlite; **nie wykonano tutaj startu Docker Compose ani testu na natywnym PostgreSQL 17**. To obowiązkowa bramka na docelowym środowisku przed realnymi danymi. Integracje operatorów testowano z kontrolowanymi odpowiedziami, bez rzeczywistych transakcji i wiadomości.

## Pierwsze wdrożenie bez demo

Zastosuj migracje, ustaw jednorazowo `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimum 16 znaków), `ADMIN_NAME`, uruchom `npm run db:bootstrap`, usuń hasło bootstrap z konfiguracji. Skrypt tworzy plany i pierwszego administratora; nie resetuje istniejących kont. Psycholog może zarejestrować gabinet, jeśli `ALLOW_REGISTRATION=true`.

Pełna checklista: [docs/WDROZENIE.md](docs/WDROZENIE.md). Przed udostępnieniem wymagane są własne klucze operatorów, HTTPS, hosting bazy i dokumentów w UE, oddzielna rola migracyjna i aplikacyjna PostgreSQL, kopie poza serwerem, akceptacja dokumentów prawnych i testy operatorów w sandbox. Aplikacja nie została opublikowana ani podłączona do rzeczywistych kont płatniczych.

## Dokumentacja operatorów

- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/webhooks/signature
- https://developers.przelewy24.pl/
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://www.smsapi.pl/docs
- https://www.prisma.io/docs/orm/prisma-client/queries/transactions

## Hosting Railway

Gotowe konfiguracje usług są w `deploy/railway/app.json` i `deploy/railway/worker.json`. Pełna procedura konfiguracji PostgreSQL, trwałych dokumentów, HTTPS, administratora i kopii: [HOSTING-RAILWAY.md](docs/HOSTING-RAILWAY.md). Konfiguracje nie oznaczają wykonanego wdrożenia; wymagane jest konto hostingowe. Test walidacji konfiguracji: `npm run test:hosting`.
