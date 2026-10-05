# Architektura

Next.js App Router obsługuje widoki serwerowe, interaktywne formularze React oraz API. Prisma używa PostgreSQL. Komponenty klienckie nie importują klienta bazy. `check:boundaries` sprawdza granicę importów. Użytkowy tenant jest rozwiązywany z sesji zapisanej w bazie i weryfikowany przy każdym wywołaniu DAL.

## Najważniejsze relacje

- Tenant → User → AuthSession; User ma rolę zgodną z rodzajem tenantu.
- Tenant → Patient → Appointment; prowadzący należy do tego samego tenantu.
- Patient → ClinicalNote → NoteVersion; ClinicalNote ma autora i opcjonalną wizytę.
- Patient → TherapyGoal, TreatmentPlan, Document; dokument wskazuje szyfrowany obiekt poza publicznym katalogiem.
- Appointment → Payment, PaymentOrder, AppointmentToken, OutboxMessage.
- Tenant → Subscription, Feedback, AuditLog, ObjectDeletion.
- Tenant platformy → Plan, Coupon, WebhookEvent, SupportSession, SystemLog.

Każda tabela podległa ma tenantId; złożone FK chronią relacje kliniczne, użytkowników i wizyty. Ograniczenia specyficzne dla platformy oraz niezmienny audyt są w SQL, poza samym schematem Prisma.

## Transakcje

Planowanie wizyt i cykli, limity pacjentów/użytkowników, księgowanie, retencja i zmiany dokumentacji korzystają z blokady wiersza Tenant `FOR UPDATE`. Każdy zapis terminu w danym gabinecie serializuje się z innymi takimi zapisami. Cykl zapisuje się w całości albo wcale. Edycje pacjentów, wizyt, notatek, celów i planu mają numer wersji chroniący przed nadpisaniem zmian.

Notatka i jej nowa wersja oraz audyt są zapisywane w jednej transakcji. Prywatność jest sprawdzana także przy odczycie historycznej wersji. Sanitizacja HTML dopuszcza wyłącznie ograniczony zestaw znaczników bez atrybutów, linków i skryptów.

## Sesje

NextAuth Credentials: Argon2id, TOTP z odrzucaniem ponownego użycia kroku, atomowy limit prób po tożsamości HMAC. JWT przenosi niejawny identyfikator sesji, a nie zaufaną rolę/tenant od klienta. Serwer sprawdza DB sesji, aktywność, wersję konta, status tenantu, idle 15 minut i maksymalny czas 8 godzin. Reset hasła i zmiana uprawnień unieważniają stare sesje. Reset nie wyłącza TOTP.

## Płatności i wiadomości

Stripe weryfikuje podpis na ograniczonym surowym body i odczytuje aktualną subskrypcję. WebhookEvent daje trwałą idempotencję. Dane klientów Stripe i metadane muszą zgadzać się z gabinetem. Worker uzgadnia stan na wypadek utraconego webhooka.

Przelewy24 zapisuje zamówienie przed przekierowaniem; migawka poświadczeń jest szyfrowana, aby rotacja nie uniemożliwiła rozliczenia rozpoczętej płatności. Podpis powiadomienia i potwierdzenie API poprzedzają księgowanie. Operacja jest serializowana z pozostałymi wpłatami. Niepełna konfiguracja operatora nie tworzy fikcyjnego sukcesu.

Outbox używa atomowego przejęcia, lease i ograniczonych ponowień. Idempotencja zewnętrznej wysyłki zależy również od okna zapewnianego przez operatora; aplikacja nie ponawia starej niejednoznacznej próby po jego przekroczeniu.

## Zagrożenia i granice

UI nie jest zabezpieczeniem: te same kontrole obowiązują przy ręcznym wywołaniu API. CSRF dla JSON sprawdza dokładny Origin, NextAuth stosuje własny token. CSP używa nonce, HTML notatek jest sanitizowany, SQL jest parametryzowany. Pliki pobiera się jako załączniki z no-store i nosniff.

Klucz główny dostępny procesowi aplikacji umożliwia odpakowanie kluczy tenantów. Izolacja dotyczy użytkowników aplikacji; nie stanowi ochrony przed administratorem infrastruktury z dostępem do kluczy i bazy. Taki dostęp wymaga odrębnej kontroli operacyjnej, menedżera sekretów i audytu hostingu.

Nie wykonano tu analizy prawnej konkretnej praktyki ani certyfikacji zgodności. Szablony, hosting UE, retencja i umowy wymagają skonfigurowania przez operatora i administratora danych.
