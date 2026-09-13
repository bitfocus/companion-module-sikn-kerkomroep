# Ontwerp: Dolibarr module **FieldService** (v22+)

Status: **concept ter bespreking** – zie open vragen onderaan.
Datum: 2026-09-12

## 1. Doel en uitgangspunten

Een Dolibarr-module voor buitendienst (field service) die de functionaliteit van
het (niet meer verkrijgbare) Dolistore-module *Intervention Plus* opnieuw
opbouwt op de moderne Dolibarr v22 basis, en die maximaal gebruik maakt van
bestaande kernobjecten in plaats van ze te dupliceren.

Wat Intervention Plus bood (publieke productbeschrijving):

| Fase | Functie |
|---|---|
| Voorbereiding | Onderwerp/type interventie kiezen (installatie, onderhoud, service) met eigen items; technicus of team toewijzen |
| Planning | Interventie in agenda van technicus op telefoon/tablet, met bekijk-historie |
| Notificatie | Vooraf ingestelde herinneringen (1 of 2 uur voor aanvang) |
| Uitvoering | Klant bellen met één tik (belhistorie); navigatie starten naar adres (navigatiehistorie) |
| Afronding | Uitkomst kiezen (te factureren / offerte maken / geen actie); elektronische handtekening van technicus én klant |
| Nacalculatie | Overzicht bestede tijd ter plaatse en geleverde onderdelen |
| Facturatie | Van planning tot factuur |

Ontwerpprincipes:

1. **Kern hergebruiken.** Het kernobject `Fichinter` (Interventies) blijft hét
   interventiedocument: nummering, PDF, koppeling aan derde/project/contract,
   online ondertekening, facturatie vanuit interventie en de REST API bestaan
   al. De module verrijkt dit met extrafields, hooks, triggers en eigen tabellen.
2. **Geen eigen agenda.** Planning wordt opgeslagen als kern-agenda-events
   (`actioncomm`) zodat de agenda van Dolibarr, DoliDroid, CalDAV/ICS-export en
   de mobiele weergave meteen werken. De module houdt daarnaast een
   toewijzingstabel bij voor planbord en status.
3. **Mobile first voor de monteur.** Eigen, lichte responsive pagina's binnen
   Dolibarr (geen aparte app in fase 1), later optioneel een PWA op de REST API.
4. **ModuleBuilder-conventies** (v22): objecten met `fields`-array,
   `CommonObject`, `sql/*.sql` + `*.key.sql`, module-descriptor met
   `module_parts`, rechten, menu's, dictionaries, cronjobs en extrafields.
5. **GPL v3**, Dolistore packaging-regels, meertalig (nl_NL, en_US, fr_FR).

## 2. Hergebruikte Dolibarr-kernobjecten

| Kernobject | Rol in FieldService | Hoe |
|---|---|---|
| **Fichinter** (interventie + regels) | Werkorder / interventiedocument | Extrafields, extra tab "Field Service", hooks op kaart en lijst, triggers |
| **ActionComm** (Agenda) | Planning van monteurs, herinneringen | Één event per toewijzing, `fk_element = fichinter`, `elementtype = fichinter` |
| **Societe / Socpeople** | Klant, locatiecontact, telefoon voor "bel klant" | Extrafields voor GPS-coördinaten en toegangsinstructies |
| **Contrat / ContratLigne** | Onderhoudscontract, SLA, "onder contract" facturatiemodus | Koppeling via `fk_contrat`, periodiek onderhoud genereren uit contractregels |
| **Ticket** | Storingsmelding → interventie | Knop "Interventie aanmaken" op ticketkaart, `element_element`-koppeling |
| **Product / Service** | Onderdelen en uurtarieven | Regels op interventie en onderdeeltabel |
| **Stock / Entrepot / MouvementStock / ProductLot** | Buswoorraad per monteur, serienummers | Onderdelen boeken als voorraadmutatie uit magazijn van de monteur |
| **Facture** | Facturatie | Kern: factuur uit interventie (`origin=fichinter`), aangevuld met tijd en onderdelen |
| **Propal** | Uitkomst "offerte maken" | Offerte aanmaken vanuit interventie, voorgevuld |
| **Projet / Task / TaskTime** | Grote projecten, urenregistratie | Optioneel: tijdlogs spiegelen naar `projet_task_time` |
| **User / UserGroup / Holiday** | Monteurs, teams, beschikbaarheid | Extrafields op gebruiker: vaardigheden, regio, standaard magazijn, voertuig |
| **Resource** | Voertuigen, meetapparatuur | Reservering via agenda-event |
| **ECM / documenten** | Foto's, PDF-rapport, handtekeningbestanden | Standaard document-directory van fichinter |
| **Online signature** (`public/onlinesign`) | Klant tekent op afstand | Kern; module voegt tekenen op het toestel van de monteur toe |
| **Notification / Mailing** | E-mail naar klant en monteur | Eigen cron met e-mailtemplates (`c_email_templates`) |
| **WebPortal** (v19+) | Klantportaal: interventies inzien, afspraak bevestigen | Hook op portaalpagina's (fase 3) |
| **Cron** | Herinneringen, periodiek onderhoud, opschonen | `module_parts['cronjobs']` |
| **Extrafields / Dictionaries** | Configureerbaar zonder code | Interventietypes als dictionary |

## 3. Nieuwe objecten van de module

Tabelprefix `llx_fieldservice_`. Alle objecten zijn `CommonObject`-klassen met
`fields`-array, `entity`, `datec/tms`, `fk_user_creat/modif`, `import_key`,
extrafields-ondersteuning en REST API.

### 3.1 Dictionary `c_fieldservice_type` – interventietype
`code`, `label`, `color`, `default_duration` (min), `billing_mode`
(factureren / onder contract / garantie / geen), `checklist_default`
(fk naar checklist), `active`. Standaardwaarden: Installatie, Onderhoud,
Storing, Inspectie, Levering.

### 3.2 `FsEquipment` – installed base (apparatuur bij de klant)
`ref`, `label`, `fk_product`, `serial` / `fk_product_lot`, `fk_soc`,
`fk_socpeople` (locatiecontact), adresvelden + `latitude`/`longitude`,
`fk_contrat`, `fk_contratdet`, `date_install`, `date_warranty_end`,
`fk_parent` (samengestelde installatie), `status` (actief / inactief /
vervangen), notities.
Koppeling naar interventies via `element_element`
(`sourcetype = fieldservice_equipment`). Tab "Installed base" op derde- en
contractkaart. Historie van alle interventies per apparaat.

### 3.3 `FsAssignment` – toewijzing / planning
`fk_fichinter`, `fk_user`, `fk_actioncomm` (gespiegeld agenda-event),
`date_start`, `date_end`, `travel_minutes`, `is_lead`, `sort_order`,
`status`: gepland → bevestigd → genotificeerd → onderweg → ter plaatse →
gepauzeerd → afgerond → geannuleerd.
Meerdere monteurs per interventie (team). Wijzigingen in agenda worden via
trigger `ACTION_MODIFY` teruggesynchroniseerd.

### 3.4 `FsTimelog` – tijdregistratie
`fk_fichinter`, `fk_user`, `type` (reis / werk / wachten / pauze),
`date_start`, `date_end`, `duration`, `billable`, `note`, optioneel
`fk_fichinterdet` en `fk_task_time`. Start/stop vanaf het mobiele scherm;
back-office kan corrigeren en valideren.

### 3.5 `FsPart` – gebruikte onderdelen
`fk_fichinter`, `fk_product`, `qty`, `fk_entrepot`, `fk_stock_mouvement`,
`batch/serial`, `fk_equipment` (ingebouwd in), `billable`, `subprice`,
`fk_facturedet` (na facturatie). Boekt voorraadmutatie uit buswoorraad en
wordt factuurregel.

### 3.6 `FsChecklist`, `FsChecklistItem`, `FsChecklistResult`
Sjablonen per interventietype: items van type ja/nee, tekst, getal, keuze,
foto; `required`. Resultaten per interventie met gebruiker, tijdstip en
optioneel `fk_ecm_file` (foto). Komen in het PDF-rapport.

### 3.7 `FsSignature`
`fk_fichinter`, `signer_type` (monteur / klant), `signer_name`, `date`,
`filename`, `ip`. Klanthandtekening kan ook via kern online-signing; dan wordt
`signed_status` van fichinter gevolgd.

### 3.8 `FsLog` – gebeurtenissenlogboek
`fk_fichinter`, `fk_user`, `date`, `event_type` (bekeken / gebeld /
navigatie gestart / notificatie verzonden / statuswijziging / ondertekend),
`payload` (JSON). Dit dekt de "historie"-functies van Intervention Plus.

### 3.9 Extrafields (aangemaakt bij activatie)
- **fichinter**: `fs_type` (dictionary), `fs_priority`, `fs_field_status`,
  `fs_outcome` (te factureren / offerte / geen actie / onder contract /
  garantie), `fs_equipment` (hoofdapparaat), `fs_planned_start`,
  `fs_planned_end`, `fs_report_sent`.
- **societe / socpeople**: `fs_latitude`, `fs_longitude`,
  `fs_access_notes`, `fs_opening_hours`.
- **user**: `fs_is_technician`, `fs_skills` (checkbox), `fs_zone`,
  `fs_default_warehouse`, `fs_vehicle` (fk resource), `fs_phone_mobile`.

## 4. Statusmodel

Kernstatus van `Fichinter` blijft leidend (0 concept, 1 gevalideerd,
2 gefactureerd, 3 afgerond). Daarnaast:

```
Veldstatus (fs_field_status)      Uitkomst (fs_outcome)
 0 te plannen                       TO_INVOICE   te factureren
 1 gepland                          TO_QUOTE     offerte maken
 2 onderweg                         NO_ACTION    geen actie
 3 ter plaatse                      CONTRACT     onder contract
 4 gepauzeerd                       WARRANTY     garantie
 5 afgerond door monteur
 6 goedgekeurd door back-office
```

## 5. Proces (end-to-end)

1. **Aanvraag**: handmatig, vanuit ticket, vanuit contract (periodiek
   onderhoud, gegenereerd door cron) of vanuit offerte/order.
2. **Voorbereiding**: type, prioriteit, apparaat, checklist, benodigde
   onderdelen (regels op de interventie), geschatte duur.
3. **Planning**: planbord (week/dag per monteur, drag & drop) →
   `FsAssignment` + agenda-event; controle op verlof (Holiday) en
   vaardigheden; reistijd-indicatie.
4. **Notificatie**: cron verstuurt X uur vooraf e-mail (en optioneel SMS via
   externe provider) naar monteur en klant; klant kan bevestigen via
   publieke link.
5. **Uitvoering (mobiel, "Mijn dag")**: lijst van vandaag → interventie
   openen → *Bel klant* (tel:-link, gelogd) → *Navigeer* (Google/Apple/OSM,
   gelogd) → *Onderweg* → *Ter plaatse* (tijd start) → onderdelen scannen of
   kiezen → checklist en foto's → werkbeschrijving → uitkomst → handtekening
   monteur en klant op het toestel → *Afronden*.
6. **Afronding**: PDF-rapport (werk, tijd, onderdelen, checklist, foto's,
   handtekeningen) gegenereerd en gemaild; fichinter naar "afgerond";
   back-office keurt goed.
7. **Facturatie**: bij uitkomst *te factureren*: factuur uit interventie met
   uurregels (tarief per type/monteur) en onderdelen; bij *offerte*:
   offerte voorgevuld; bij *contract/garantie*: geen factuur, wel registratie.
8. **Rapportage**: dashboard (open, vandaag, te laat, te factureren),
   productiviteit per monteur, first-time-fix, contractmarge.

## 6. Technische structuur (v22 ModuleBuilder-conventies)

```
htdocs/custom/fieldservice/
├── core/modules/modFieldService.class.php        # descriptor (id 500100, need_dolibarr_version [22,0], phpmin [8,1])
├── core/modules/fieldservice/                    # nummering + PDF-modellen
│   ├── mod_fsequipment_standard.php
│   └── doc/pdf_fsreport.modules.php              # interventierapport
├── core/triggers/interface_99_modFieldService_FieldServiceTriggers.class.php
├── core/boxes/box_fs_today.php, box_fs_toinvoice.php
├── core/tpl/                                     # fragmenten (mobiele kaart, tabs)
├── class/
│   ├── fsequipment.class.php  fsassignment.class.php  fstimelog.class.php
│   ├── fspart.class.php  fschecklist.class.php  fschecklistitem.class.php
│   ├── fschecklistresult.class.php  fssignature.class.php  fslog.class.php
│   ├── actions_fieldservice.class.php            # hooks
│   ├── api_fieldservice.class.php                # REST API
│   └── fieldservicecron.class.php                # cron-methoden
├── sql/  llx_fieldservice_*.sql, *.key.sql, data.sql (dictionary-waarden)
├── admin/ setup.php, checklists.php, about.php
├── lib/ fieldservice.lib.php
├── langs/ nl_NL/, en_US/, fr_FR/
├── dispatch.php                                  # planbord
├── equipment_card.php, equipment_list.php, equipment_agenda.php
├── checklist_card.php, checklist_list.php
├── mobile/ index.php (Mijn dag), intervention.php, sign.php
├── public/ confirm.php                           # klantbevestiging afspraak
├── css/ js/ img/
├── ChangeLog.md  README.md  COPYING
```

**Hooks** (`module_parts['hooks']`): `interventioncard`, `interventionlist`,
`interventiondao`, `agendacard`, `agendaview`, `thirdpartycard`,
`thirdpartycomm`, `contractcard`, `ticketcard`, `invoicecard`, `usercard`,
`propalcard`, `webportalpage`, `pdfgeneration`.

**Triggers**: `FICHINTER_CREATE/MODIFY/VALIDATE/CLOSE/DELETE/REOPEN`
(assignment- en agendasynchronisatie, logboek), `ACTION_MODIFY/DELETE`
(agenda → assignment), `BILL_VALIDATE` (parts → `fk_facturedet`),
`TICKET_CREATE` (optioneel automatisch interventie), `CONTRACT_SERVICE_ACTIVATE`
(periodiek onderhoud inplannen).

**Cronjobs**: `sendReminders` (elke 15 min), `generatePreventiveMaintenance`
(dagelijks), `syncAgenda` (uurlijks), `alertWarrantyAndContractExpiry`
(dagelijks).

**Rechten**: `fieldservice->equipment (read/write/delete)`,
`->planning (read/write)`, `->mobile (own / all)`, `->timelog (validate)`,
`->checklist (admin)`, `->report`, `->setup`.

**Menu**: Field Service → Dashboard · Planbord · Interventies (kern) ·
Installed base · Checklists · Mijn dag · Rapportages · Instellingen.

**Instellingen (admin/setup.php)**: herinneringsuren (bijv. 24 en 2),
e-mailtemplates, kaartprovider, handtekening verplicht ja/nee, standaard
facturatiemodus per type, uurtarief-service per type, automatische factuur
ja/nee, projectkoppeling ja/nee, voorraadboeking ja/nee, PDF-model.

**REST API**: `/fieldservice/mydays`, `/fieldservice/interventions/{id}/status`,
`/timelogs`, `/parts`, `/checklistresults`, `/signatures`, `/equipment`.
Basis voor een latere PWA of app.

**Compatibiliteit**: Dolibarr ≥ 22.0, PHP ≥ 8.1, MySQL/MariaDB en PostgreSQL.
Multi-entity (multicompany) via `entity`-kolommen.

## 7. Fasering

| Fase | Inhoud |
|---|---|
| 1 – MVP | Descriptor, dictionary, extrafields, `FsAssignment` + agenda-sync, planbord (basis), Mijn dag (status, bellen, navigatie, tijd, onderdelen, handtekeningen), logboek, herinneringen, PDF-rapport, facturatie uit interventie |
| 2 | Installed base (`FsEquipment`), checklists en foto's, ticketkoppeling, periodiek onderhoud uit contracten, buswoorraad |
| 3 | Klantportaal (WebPortal), REST API en PWA, drag & drop planbord met reistijd, dashboards en KPI's, migratie vanuit Intervention Plus |

## 8. Open vragen (graag beantwoorden voor de bouw start)

1. **Basis**: akkoord met bouwen op het kernobject Interventie (`Fichinter`)
   in plaats van een eigen werkorder-object? (Aanbevolen: ja.)
2. **Intervention Plus**: draait dit nu bij jullie en moet er data
   gemigreerd worden? Welke functies zijn onmisbaar, welke overbodig?
3. **Use case**: gaat het om installatie en onderhoud van
   kerkomroep-installaties (installed base per kerk, onderhoudscontracten,
   storingsdienst)? Dat bepaalt de prioriteit van fase 2.
4. **Mobiel**: voldoen responsive Dolibarr-pagina's met Dolibarr-login voor
   monteurs, of is een aparte app/PWA (met offline-werking) vereist?
5. **Planning**: is een drag & drop planbord nodig in fase 1, of volstaat de
   kern-agenda voorlopig? Teams van meerdere monteurs per interventie?
6. **Facturatie**: per interventie, verzamelfactuur per periode, of via
   contract? Uurtarieven per type of per monteur? Voorrijkosten?
7. **Voorraad**: wordt de Stock-module gebruikt en wil je buswoorraad per
   monteur?
8. **Notificaties**: alleen e-mail, of ook SMS/push? Welke provider?
9. **Klantportaal**: interventies inzien en afspraken bevestigen via het
   WebPortal-module?
10. **Tickets**: storingsmeldingen via de Ticket-module → interventie?
11. **Checklists en foto's**: nodig in fase 1?
12. **Repository en distributie**: nieuwe repository (bijv.
    `dolibarr-module-fieldservice`) in plaats van deze Companion-repo?
    Intern gebruik of publicatie op Dolistore? Talen: NL/EN/FR?
