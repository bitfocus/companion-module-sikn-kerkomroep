# Bijlage A – Object `FsEquipment` (apparatuur / installed base)

Hoort bij `ONTWERP.md`, paragraaf 3.2. Status: concept.

## A.1 Welke informatie is nodig?

Gegroepeerd naar de vraag die de administratie moet beantwoorden.

### Identificatie – *wat is het?*
| Veld | Type | Toelichting |
|---|---|---|
| `ref` | varchar(128), uniek per entity | Automatische nummering (bijv. `EQ2609-0001`) |
| `label` | varchar(255) | Omschrijving, bijv. "Versterker kerkzaal" |
| `fk_product` | int → `llx_product` | Catalogusartikel: merk, model, artikelnummer komen hiervandaan |
| `serial_number` | varchar(128) | Serienummer van de fabrikant |
| `fk_product_lot` | int → `llx_product_lot` | Koppeling naar lot/serienummer als de voorraadmodule serienummers bijhoudt |
| `asset_tag` | varchar(64) | Eigen sticker- of QR-nummer; scanbaar op het mobiele scherm |
| `fk_type` | int → dictionary `c_fieldservice_equipment_type` | Bijv. versterker, mengpaneel, microfoon, encoder/streamer, luidspreker, ringleiding |
| `fk_parent` | int → `llx_fieldservice_equipment` | Onderdeel van een grotere installatie (boom: installatie → componenten) |

### Eigenaar en locatie – *van wie en waar?*
| Veld | Type | Toelichting |
|---|---|---|
| `fk_soc` | int → `llx_societe` | Klant (verplicht) |
| `fk_socpeople` | int → `llx_socpeople` | Locatiecontact / gebouwadres (contact van type adres) |
| `address`, `zip`, `town`, `fk_country` | | Alleen invullen als het afwijkt van het klantadres |
| `location_detail` | varchar(255) | Ruimte of plek in het gebouw: "consistorie, 19"-rack, positie 4" |
| `latitude`, `longitude` | double | Voor navigatie vanaf het mobiele scherm |
| `ownership` | int | 0 eigendom klant · 1 verhuur · 2 bruikleen · 3 eigendom leverancier |

### Levenscyclus – *sinds wanneer, tot wanneer, in welke staat?*
| Veld | Type | Toelichting |
|---|---|---|
| `date_purchase` | date | Aankoop- of leverdatum |
| `date_install` | date | Installatiedatum |
| `date_warranty_end` | date | Einde fabrieksgarantie |
| `date_warranty_labour_end` | date | Einde garantie op arbeid (indien anders) |
| `date_end_of_life` | date | Verwachte vervangdatum |
| `status` | int | 0 concept · 1 in bedrijf · 2 storing · 3 buiten gebruik · 4 vervangen · 9 verwijderd |
| `fk_replaced_by` | int → zelfde tabel | Opvolger bij vervanging |
| `fk_user_installer` | int → `llx_user` | Monteur die installeerde |
| `fk_fichinter_install` | int → `llx_fichinter` | Interventie waarbij het is geplaatst |

### Commercieel – *waaruit is het geleverd, wat dekt het?*
| Veld | Type | Toelichting |
|---|---|---|
| `fk_contrat` | int → `llx_contrat` | Onderhoudscontract |
| `fk_contratdet` | int → `llx_contratdet` | Contractregel die dit apparaat dekt (bepaalt facturatiemodus "onder contract") |
| `fk_facturedet` | int → `llx_facturedet` | Verkoopfactuurregel (bewijs van levering en garantie) |
| `fk_commandedet` | int → `llx_commandedet` | Orderregel |
| `fk_soc_supplier` | int → `llx_societe` | Leverancier (voor RMA en garantieclaims) |
| `supplier_ref` | varchar(128) | Referentie bij leverancier |
| `purchase_price`, `sale_price` | double | Historische waarden voor afschrijving en vervangingsadvies |

### Technisch – *hoe is het geconfigureerd?*
| Veld | Type | Toelichting |
|---|---|---|
| `firmware_version` | varchar(64) | |
| `ip_address`, `mac_address`, `hostname` | varchar | Voor netwerkapparatuur (encoders, streamers, DSP's) |
| `remote_access_url` | varchar(255) | Beheer-URL, VPN, cloudportaal |
| `config_notes` | text | Instellingen, kanaalindeling, presets |
| `credentials` | text, versleuteld | Inloggegevens via `dolEncrypt()`; alleen zichtbaar met apart recht `equipment_credentials` |

### Onderhoud – *wanneer moet er iets gebeuren?*
| Veld | Type | Toelichting |
|---|---|---|
| `maintenance_interval` | int (maanden) | 0 = geen periodiek onderhoud |
| `date_last_maintenance` | date | Bijgewerkt door trigger bij afronden onderhoudsinterventie |
| `date_next_maintenance` | date | Berekend; cron plant hieruit preventief onderhoud |
| `fk_checklist` | int → `llx_fieldservice_checklist` | Standaard checklist bij onderhoud |
| `criticality` | int | 1 laag · 2 normaal · 3 hoog (bepaalt prioriteit storing en SLA) |
| `inspection_required` | tinyint | Wettelijke of verzekeringskeuring |
| `meter_value`, `meter_unit`, `date_meter` | | Tellerstand (bedrijfsuren, cycli); optioneel |

### Documentatie en relaties
- ECM-documenten in de eigen documentmap: handleidingen, bekabelingsschema's, foto's.
- `note_public`, `note_private`.
- Gekoppelde objecten via `llx_element_element`: interventies, tickets, offertes, orders, facturen, contracten.
- Extrafields: klantspecifieke velden zonder codewijziging.

### Standaardvelden (Dolibarr-conventie)
`rowid`, `entity`, `datec`, `tms`, `fk_user_creat`, `fk_user_modif`, `import_key`, `model_pdf`, `last_main_doc`.

## A.2 Het object in Dolibarr-termen

```php
class FsEquipment extends CommonObject
{
    public $module        = 'fieldservice';
    public $element       = 'fieldservice_equipment';
    public $table_element = 'fieldservice_equipment';
    public $picto         = 'fa-microchip';
    public $ismultientitymanaged = 1;
    public $isextrafieldmanaged  = 1;

    const STATUS_DRAFT      = 0;
    const STATUS_ACTIVE     = 1;
    const STATUS_FAULT      = 2;
    const STATUS_OUT_OF_USE = 3;
    const STATUS_REPLACED   = 4;
    const STATUS_REMOVED    = 9;

    public $fields = array(
        'rowid'          => array('type' => 'integer', 'label' => 'TechnicalID', 'enabled' => 1, 'position' => 1, 'notnull' => 1, 'visible' => 0, 'index' => 1),
        'ref'            => array('type' => 'varchar(128)', 'label' => 'Ref', 'enabled' => 1, 'position' => 10, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1),
        'label'          => array('type' => 'varchar(255)', 'label' => 'Label', 'enabled' => 1, 'position' => 20, 'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'showoncombobox' => 2),
        'fk_product'     => array('type' => 'integer:Product:product/class/product.class.php:1', 'label' => 'Product', 'enabled' => 1, 'position' => 30, 'visible' => 1, 'picto' => 'product'),
        'serial_number'  => array('type' => 'varchar(128)', 'label' => 'SerialNumber', 'enabled' => 1, 'position' => 40, 'visible' => 1, 'searchall' => 1),
        'fk_product_lot' => array('type' => 'integer:Productlot:product/stock/class/productlot.class.php', 'label' => 'Batch', 'enabled' => 'isModEnabled("productbatch")', 'position' => 41, 'visible' => -1),
        'asset_tag'      => array('type' => 'varchar(64)', 'label' => 'AssetTag', 'enabled' => 1, 'position' => 45, 'visible' => 1, 'searchall' => 1),
        'fk_type'        => array('type' => 'sellist:c_fieldservice_equipment_type:label:rowid::active=1', 'label' => 'EquipmentType', 'enabled' => 1, 'position' => 50, 'visible' => 1),
        'fk_parent'      => array('type' => 'integer:FsEquipment:custom/fieldservice/class/fsequipment.class.php', 'label' => 'ParentEquipment', 'enabled' => 1, 'position' => 55, 'visible' => -1),
        'fk_soc'         => array('type' => 'integer:Societe:societe/class/societe.class.php:1:((status:=:1) AND (entity:IN:__SHARED_ENTITIES__))', 'label' => 'ThirdParty', 'enabled' => 'isModEnabled("societe")', 'position' => 60, 'notnull' => 1, 'visible' => 1, 'picto' => 'company'),
        'fk_socpeople'   => array('type' => 'integer:Contact:contact/class/contact.class.php', 'label' => 'SiteContact', 'enabled' => 1, 'position' => 61, 'visible' => -1),
        'location_detail'=> array('type' => 'varchar(255)', 'label' => 'LocationDetail', 'enabled' => 1, 'position' => 62, 'visible' => -1),
        'ownership'      => array('type' => 'integer', 'label' => 'Ownership', 'enabled' => 1, 'position' => 65, 'visible' => -1, 'arrayofkeyval' => array(0 => 'CustomerOwned', 1 => 'Rental', 2 => 'Loan', 3 => 'SupplierOwned')),
        'date_install'   => array('type' => 'date', 'label' => 'DateInstall', 'enabled' => 1, 'position' => 70, 'visible' => 1),
        'date_warranty_end' => array('type' => 'date', 'label' => 'WarrantyEnd', 'enabled' => 1, 'position' => 71, 'visible' => 1),
        'fk_contrat'     => array('type' => 'integer:Contrat:contrat/class/contrat.class.php', 'label' => 'Contract', 'enabled' => 'isModEnabled("contrat")', 'position' => 80, 'visible' => 1),
        'fk_contratdet'  => array('type' => 'integer', 'label' => 'ContractLine', 'enabled' => 'isModEnabled("contrat")', 'position' => 81, 'visible' => -1),
        'maintenance_interval' => array('type' => 'integer', 'label' => 'MaintenanceIntervalMonths', 'enabled' => 1, 'position' => 90, 'visible' => -1),
        'date_next_maintenance' => array('type' => 'date', 'label' => 'NextMaintenance', 'enabled' => 1, 'position' => 91, 'visible' => 1),
        'criticality'    => array('type' => 'integer', 'label' => 'Criticality', 'enabled' => 1, 'position' => 95, 'visible' => -1, 'arrayofkeyval' => array(1 => 'Low', 2 => 'Normal', 3 => 'High')),
        // ... technische en commerciële velden zoals in A.1 ...
        'note_public'    => array('type' => 'html', 'label' => 'NotePublic', 'enabled' => 1, 'position' => 200, 'visible' => 0),
        'note_private'   => array('type' => 'html', 'label' => 'NotePrivate', 'enabled' => 1, 'position' => 201, 'visible' => 0),
        'entity'         => array('type' => 'integer', 'label' => 'Entity', 'enabled' => 1, 'position' => 900, 'notnull' => 1, 'visible' => 0, 'default' => 1, 'index' => 1),
        'datec'          => array('type' => 'datetime', 'label' => 'DateCreation', 'enabled' => 1, 'position' => 910, 'notnull' => 1, 'visible' => -2),
        'tms'            => array('type' => 'timestamp', 'label' => 'DateModification', 'enabled' => 1, 'position' => 911, 'notnull' => 0, 'visible' => -2),
        'fk_user_creat'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 920, 'notnull' => 1, 'visible' => -2),
        'fk_user_modif'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif', 'enabled' => 1, 'position' => 921, 'visible' => -2),
        'import_key'     => array('type' => 'varchar(14)', 'label' => 'ImportId', 'enabled' => 1, 'position' => 930, 'visible' => -2),
        'status'         => array('type' => 'integer', 'label' => 'Status', 'enabled' => 1, 'position' => 1000, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'default' => 1,
                                  'arrayofkeyval' => array(0 => 'Draft', 1 => 'InService', 2 => 'Fault', 3 => 'OutOfService', 4 => 'Replaced', 9 => 'Removed')),
    );
}
```

Bijbehorende bestanden: `sql/llx_fieldservice_equipment.sql` en `.key.sql`
(indexen op `ref`+`entity` uniek, `fk_soc`, `fk_product`, `serial_number`,
`fk_parent`, `status`), `core/modules/fieldservice/mod_fsequipment_standard.php`
(nummering), `equipment_card.php`, `equipment_list.php`,
`equipment_interventions.php`, `equipment_document.php`, `equipment_note.php`,
`equipment_agenda.php`.

## A.3 Tabbladen op de apparaatkaart

1. **Kaart** – velden uit A.1, gegroepeerd; boomweergave van componenten
   (`fk_parent`); knoppen *Nieuwe interventie*, *Nieuw ticket*, *Vervangen*.
2. **Interventies** – alle gekoppelde interventies met datum, type, monteur,
   uitkomst; dit is de servicehistorie.
3. **Contract en facturen** – dekkende contractregel, verkoopfactuur, order.
4. **Onderhoud** – interval, volgende datum, checklistresultaten van de laatste
   beurten, tellerstanden.
5. **Documenten** – ECM: handleidingen, schema's, foto's.
6. **Notities**, **Agenda** (events met `elementtype = fieldservice_equipment`),
   **Logboek** (statuswijzigingen, verplaatsingen).

Op de **derdekaart** en **contractkaart** verschijnt via hook een tab
"Apparatuur" met de lijst per klant of per contract. Op de
**interventiekaart** kies je één of meer apparaten; de monteur ziet ze in
"Mijn dag" met serienummer, locatie in het gebouw en de laatste
onderhoudsdatum.

## A.4 Hoe ontstaan records?

| Bron | Mechanisme |
|---|---|
| Handmatig | Kaart in de module |
| Verkoop | Trigger `BILL_VALIDATE` / `ORDER_VALIDATE`: voor elke regel met een product dat als "apparatuur" is gemarkeerd (product-extrafield `fs_is_equipment`) wordt een record in concept aangemaakt, gekoppeld aan factuur- of orderregel |
| Installatie | Monteur registreert het apparaat op locatie vanuit de interventie (serienummer scannen), status gaat naar *in bedrijf*, `date_install` en `fk_fichinter_install` worden gevuld |
| Import | Standaard Dolibarr-importmodule (`import_key`), CSV vanuit de huidige administratie of Intervention Plus |
| Vervanging | Actie *Vervangen* op de kaart: oud record → *vervangen* met `fk_replaced_by`, nieuw record erft klant, locatie, contractregel |

## A.5 Openstaande keuzes voor dit object

1. **Locatie**: volstaat één adres per klant, of hebben klanten meerdere
   gebouwen (kerk, zalencentrum, begraafplaats)? Bij meerdere gebouwen is een
   apart object `FsSite` (gebouw met adres, contact, coördinaten,
   toegangsinstructies) netter dan een contact van type adres.
2. **Hiërarchie**: is één niveau (installatie → componenten) genoeg, of zijn
   diepere bomen nodig?
3. **Serienummers via de voorraadmodule** (lot/serienummer aan) of alleen als
   tekstveld op het apparaat?
4. **Inloggegevens** van streamers en encoders in Dolibarr opslaan
   (versleuteld, met apart recht) of bewust buiten het systeem houden?
5. **Tellerstanden** relevant (bedrijfsuren) of weglaten?
6. **Verhuur of bruikleen** van apparatuur komt voor? Zo niet, vervalt het
   veld `ownership`.
