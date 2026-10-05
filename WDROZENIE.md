# Checklista wdrożenia

## Infrastruktura i dane

- [ ] Uruchom komplet testów i migracje na natywnym PostgreSQL 17, następnie próbny `docker compose up --build`.
- [ ] Region bazy, plików, replik i kopii w UE; umowy z hostingiem i podprocesorami. Zweryfikuj osobno dostawców komunikacji i płatności.
- [ ] HTTPS na reverse proxy; `NEXTAUTH_URL` z publiczną domeną HTTPS. Zablokuj publiczny dostęp do portu bazy. HSTS jest dodawany przez aplikację.
- [ ] Proxy nadpisuje X-Forwarded-For; dopiero wtedy ustaw `TRUST_PROXY=true`. W przeciwnym razie limit IP jest wspólny dla niezaufanej sieci.
- [ ] TLS dla połączeń do zdalnej bazy i magazynu. Szyfrowanie dysków, bazy, snapshotów i replik. Konto aplikacji nie jest superuserem.
- [ ] Zmienne środowiskowe w menedżerze sekretów. Backup klucza głównego i klucza kopii poza serwerem, z kontrolą dostępu. Nie rotuj MASTER_ENCRYPTION_KEY przez samo podmienienie wartości: potrzebne jest ponowne opakowanie kluczy i sekretów.
- [ ] Oddziel role migracyjną i runtime. Runtime: CONNECT, USAGE schema oraz wymagane SELECT/INSERT/UPDATE/DELETE, bez DDL/TRUNCATE. Dla AuditLog jedynie SELECT/INSERT. Migracje uruchamiaj odrębnym poświadczeniem.
- [ ] Sprawdź odtworzenie zaszyfrowanej bazy i dokumentów oraz powtórne zastosowanie rejestru usunięć po dacie kopii.
- [ ] Przechowuj poza kopiami kontrolowany rejestr zakończonych usunięć; po odtworzeniu odtwórz te usunięcia przed dopuszczeniem ruchu.
- [ ] Backup bazy i lokalnych plików w oknie zatrzymanych zapisów lub przez spójny snapshot. S3: replikacja/versioning i usuwanie starszych wersji zgodnie z retencją.
- [ ] Monitorowanie `/api/health`, worker heartbeat, błędów wysyłki, kolejek usuwania, nieudanych kopii i webhooków. Alert przy braku ukończonej kopii przez więcej niż 26 godzin.

## Aplikacja

- [ ] Bootstrap administratora bez demo; silne hasło i TOTP. Wyłącz niepotrzebną rejestrację.
- [ ] Przegląd uprawnień zespołu i osób upoważnionych. STAFF nie otrzymuje klinicznych endpointów.
- [ ] Konfiguracja godzin pracy, urlopów, strefy czasowej, cennika i danych gabinetu.
- [ ] Publiczna rezerwacja wyłączona do zatwierdzenia polityki prywatności i warunków rezerwacji.
- [ ] Formularze zgód i dokumenty prawne zatwierdzone; ustalone podstawy, retencja, obsługa wniosków oraz procedura incydentów. Dokonaj oceny potrzeby DPIA odpowiednio do planowanej skali.
- [ ] Skan plików i limity infrastruktury dostosowane do polityki organizacji. Aplikacja weryfikuje format i izoluje pliki, ale nie zawiera silnika antywirusowego.
- [ ] Manualny audyt dostępności całego interfejsu i czytników ekranu. Automatyczny axe obejmuje wybrane ścieżki, nie stanowi certyfikacji WCAG.
- [ ] Przegląd bezpieczeństwa przed przetwarzaniem rzeczywistych danych o zdrowiu, testy penetracyjne i monitoring zależności.

## Stripe

- [ ] Tryb testowy, poprawne ceny miesięczne i roczne, metadane gabinetu, webhook secret.
- [ ] Portal ma dozwolone plany, zasady zmian/cancel, metody płatności i faktury. Dane wystawcy, podatki oraz wymagania e-fakturowania skonfigurowane zgodnie z działalnością operatora.
- [ ] Przetestuj zakup, trial, zmianę planu, płatność nieudaną, grace period, READ_ONLY i ponowną aktywację.
- [ ] Wyślij powtórzony webhook i starsze zdarzenie. Sprawdź, że nie zmieniają nowszego stanu.
- [ ] Sprawdź, że aktualizacja subskrypcji nie znosi zawieszenia nałożonego przez administratora.
- [ ] Po sandbox przełącz sekrety i ceny na live; ustaw osobny sekret webhooka. Nie mieszaj identyfikatorów test/live.

## Przelewy24 i komunikacja

- [ ] Oddzielne konto sprzedawcy każdego gabinetu; poprawne merchantId/posId/API/CRC. Publiczny callback HTTPS.
- [ ] Test podpisu, weryfikacji kwoty, duplikatu, wygaśnięcia rezerwacji i wpłaty po terminie. Uzgodnij rzeczywiste odpowiedzi sandbox operatora.
- [ ] Scenariusz zwrotu w panelu P24 i potwierdzenie w Webify. Nie myl powrotu z operatora z potwierdzoną wpłatą.
- [ ] Resend: domena, SPF/DKIM/DMARC, poprawny nadawca. SMSAPI: środki, uprawnienia, zatwierdzony nadawca.
- [ ] Test wiadomości, braku zgody, jej wycofania, zmiany terminu i linków jednorazowych.
- [ ] Worker działa stale. Brak kluczy operatorów nie może być traktowany jako skuteczna wysyłka.

## Granice pierwszego wydania

iCal jest jednokierunkowy. Wideorozmowy realizuje zewnętrzny link. Faktury abonamentowe udostępnia Stripe; brak osobnej integracji z Fakturownią/wFirmą. Dokument wpłaty za wizytę nie zastępuje automatycznie faktury VAT ani fiskalizacji. Eksport prywatnych notatek wymaga udziału ich autorów. Duże migracje danych i duże zespoły wymagają osobnych testów skali; listy administracyjne są ograniczone do 1000 gabinetów, historia wizyt UI do 300 wpisów, listy raportowe mają limity, natomiast sumy raportu są liczone na pełnym zakresie w bazie.
