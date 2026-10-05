# Wdrożenie Webify Gabinet na Railway

Status: konfiguracja przygotowana; nie utworzono jeszcze projektu ani publicznego adresu. Potrzebne jest połączone konto Railway. Pliki JSON nie tworzą usług, wolumenów ani harmonogramów kopii samodzielnie.

## Usługi

Utwórz projekt i trzy usługi w regionie EU West (Amsterdam): PostgreSQL 17, `app` oraz `worker`. Kod źródłowy obu usług to katalog projektu zawierający Dockerfile. W ustawieniach **Config File Path** wybierz odpowiednio `/deploy/railway/app.json` i `/deploy/railway/worker.json`. Wyłącz usypianie usług. Ustaw jedną replikę; worker działa stale, a aplikacja korzysta z lokalnego wolumenu.

Nie udostępniaj PostgreSQL ani workera publicznie. PostgreSQL wymaga własnego trwałego wolumenu i włączonych kopii. Konfiguracja aplikacji wybiera region Amsterdam, lecz bazę i jej wolumen trzeba utworzyć w tym samym regionie osobno. Nie zmieniaj regionu istniejącej produkcyjnej bazy bez planu migracji.

## Zmienne aplikacji

Wartości poufne wpisuj w ustawieniach usługi, nie w repozytorium ani czacie. Wygeneruj świeże klucze produkcyjne. Zachowaj MASTER_ENCRYPTION_KEY w niezależnym sejfie: jego utrata uniemożliwi odczyt dokumentacji także po odtworzeniu bazy.

| Zmienna | Wartość |
| --- | --- |
| DATABASE_URL | Referencja do prywatnego URL PostgreSQL z usługi bazy |
| NEXTAUTH_URL | Pełny adres HTTPS wygenerowanej domeny aplikacji |
| NEXTAUTH_SECRET | Losowy sekret, minimum 32 znaki |
| MASTER_ENCRYPTION_KEY | Losowe 32 bajty zakodowane base64 |
| CRON_SECRET | Osobny losowy sekret, minimum 32 znaki |
| PORT | 3000 |
| HOSTNAME | :: |
| STORAGE_DRIVER | local |
| LOCAL_STORAGE_PATH | /app/storage |
| RAILWAY_RUN_UID | 0, wyłącznie w usłudze app |
| ALLOW_REGISTRATION | false na czas odbioru wdrożenia |
| TRUST_PROXY | false do czasu potwierdzenia sposobu nadpisywania nagłówków IP przez proxy |

Do `app` dołącz wolumen pod `/app/storage`. Railway dostarcza RAILWAY_VOLUME_MOUNT_PATH automatycznie. Skrypt startowy odmawia startu bez trwałego wolumenu lub kompletnych kluczy. Inicjuje uprawnienia katalogu jako root, po czym usuwa grupy dodatkowe i przełącza proces serwera na UID/GID 1000. Nie wymaga uruchamiania serwera WWW jako root. Nie montuj w tym miejscu istniejących danych z innym właścicielem bez wcześniejszego przygotowania uprawnień.

Alternatywa: STORAGE_DRIVER=s3 i konfiguracja z `.env.example`, bez wolumenu i RAILWAY_RUN_UID. Wybierz prywatny bucket w UE, TLS, szyfrowanie dostawcy, wersjonowanie i niezależną politykę kopii. Samo wpisanie S3_REGION nie potwierdza lokalizacji danych ani kopii dostawcy.

## Worker

Ustaw wyłącznie CRON_SECRET (ten sam co app) i APP_INTERNAL_URL na `http://${{app.RAILWAY_PRIVATE_DOMAIN}}:3000`. Worker nie potrzebuje klucza szyfrowania, hasła bazy ani dostępu do dokumentów. Serwer app nasłuchuje również IPv6, aby obsłużyć prywatne połączenia. Po starcie sprawdź komunikat „Zadania wykonane” w logach workera. Bez skonfigurowanych operatorów email/SMS powiadomienia nie zostaną dostarczone.

## Pierwsze uruchomienie

1. Wygeneruj domenę dla portu 3000 usługi app, ustaw NEXTAUTH_URL i wdrożenie. Pre-deploy wykona migracje, a `/api/health` potwierdzi połączenie z bazą. Nie uruchamiaj `db:seed` w produkcji.
2. Jednorazowo ustaw ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (minimum 16 znaków) i uruchom `npm run db:bootstrap` w kontenerze app. Usuń ADMIN_PASSWORD po utworzeniu administratora.
3. Sprawdź logowanie, wylogowanie, 2FA, utworzenie gabinetu, pacjenta, wizyty, notatki i dokumentu na danych testowych. Wykonaj restart aplikacji i potwierdź zachowanie danych oraz odczyt dokumentu.
4. Włącz automatyczne kopie obu wolumenów (PostgreSQL oraz dokumenty), ustal retencję i alarmy pojemności. Wykonaj próbne odtworzenie do oddzielnego środowiska z właściwym kluczem szyfrowania. Nie nadpisuj produkcji podczas próby. Uzgodnij punkt odtworzenia bazy i dokumentów; harmonogramy dwóch wolumenów nie gwarantują wspólnej transakcyjnej migawki.
5. Skonfiguruj Stripe i webhooki, Resend/SMS oraz P24 według README. Przetestuj w środowiskach testowych operatorów, a następnie świadomie przełącz konta na produkcyjne. Sama publikacja strony nie aktywuje płatności.
6. Sprawdź TLS, przekierowania, nagłówki bezpieczeństwa, izolację kont i brak publicznej bazy. Ustaw alerty błędów, użycia zasobów i budżetu. Dopiero po odbiorze ustaw ALLOW_REGISTRATION=true.

W Railway używaj kopii wolumenów lub oddzielnie skonfigurowanego magazynu kopii. Istniejący skrypt `backup.mjs` z Docker Compose nie widzi automatycznie wolumenu innej usługi Railway i nie jest tu uruchamiany. Nie należy uważać kopii za działające przed sprawdzeniem ich wyniku i odtworzenia.

## Zakres weryfikacji

Lokalnie sprawdzono testy walidatora konfiguracji oraz ponownie testy jednostkowe i build aplikacji. Uruchomienie obrazu, prywatna sieć, wolumeny, automatyczne kopie i domena pozostają do sprawdzenia na podłączonym koncie. Lokalizacja usług w UE nie zastępuje weryfikacji umowy powierzenia, podwykonawców i zasad retencji operatora.

Dokumentacja referencyjna (sprawdzona 2026-10-05):
- https://docs.railway.com/config-as-code/reference
- https://docs.railway.com/volumes
- https://docs.railway.com/deployments/regions
- https://docs.railway.com/guides/postgres-backups-restores
