# Dagelijkse opvolging en finance-pilot

Status: werkende synthetische replay, geen bedrijfsvalidatie of bewezen incassowinst.

## Dagelijkse werklijst

Open [Daily workflow](https://phlppgdfry.github.io/finrisk-ai/#operations). Vijftien dagen, veertig klanten en drie afzonderlijke strategieën: uitgiftescore, openstaand bedrag en historische laatratio. Iedere strategie houdt haar eigen opvolghistoriek bij. Maximaal tien dossiers per dag, één per klant, zeven kalenderdagen afkoelperiode. Eerst maximaal twee handmatige plaatsen; resterende capaciteit wordt met ondersteunde modelprofielen en daarna beschikbare handmatige dossiers gevuld. Dit is een transparante demonstratiepolicy, geen geoptimaliseerde inzetverdeling.

Alleen werkelijk achterstallige open facturen komen in aanmerking. Onbekende status gaat naar reconciliatie; betwistingen naar aparte dossierbehandeling; volledig betaalde/gecrediteerde dossiers vallen weg. Dit systeem verstuurt geen herinneringen en bewaart geen echte dossiers. Het betreft een vooraf berekende replay, geen live taakbeheersysteem. Geen gebruikers, persistentie, auditlog van medewerkeracties of ERP-koppeling.

De score wordt bij uitgifte berekend. Een uitgiftescore voor laat betalen is **geen actuele kans op betaling**, zodra de factuur al achterstallig is. De demo vergelijkt beleid; een operationeel model voor invorderbaarheid zou een nieuw doel, nieuwe kenmerken en eigen validatie nodig hebben. Aantallen bekeken dossiers zijn capaciteit, geen geïnde omzet. Historische top-10-resultaten blijven een afzonderlijke offline test.

## Operationeel ledgercontract

`Bill`: id, customer, issued, due, amount (positieve integer in centen/minor units), currency (EUR/GBP/USD in deze demo), status_known, disputed. `Event`: invoice, occurred (economische datum), recorded (eerste beschikbaarheid in de administratie), amount, currency, kind (`payment` of `credit`). Gebeurtenissen tellen pas mee wanneer beide datums bekend zijn. Een betaling op 1 januari die op 9 januari geregistreerd wordt, kan op 5 januari nog geen historisch kenmerk zijn.

Openstaand = factuurbedrag − betalingen − credits. Valuta van gebeurtenis en factuur moeten overeenkomen; negatieve posten en overallocatie worden afgewezen voor reconciliatie. Geen automatische conversie van losse betaalgebeurtenissen. Een betwiste factuur krijgt geen gewone betalingsherinnering. Credits gelden niet als ontvangen geld of succesvol betaald historisch dossier. Voorschotten, refunds, terugboekingen, rente, belastingcorrecties en boekhoudkundige matching vereisen nog een uitgebreid ERP-contract. De exporteur moet duplicaten voorkomen.

Voor rangschikking naar bedrag gebruikt de demo expliciet fictieve GBP/EUR 1,18. USD zonder koers wordt geblokkeerd. Koersdatum mag niet in de toekomst liggen. Er is nog geen koersprovider of ouderdomslimiet; leg die voor een echte pilot vast. Alleen EUR-profielen met geldige historie krijgen hier de forest-score. Nieuwe klanten en andere valuta krijgen een handmatige route zonder kanspercentage.

Historische kenmerken worden uit volledig cash-betaalde, niet-gecrediteerde en niet-betwiste eerdere facturen opgebouwd: `prior_invoices`, `prior_late_rate`, `avg_days_late` (gemiddelde uitsluitend van te laat betaalde dossiers). Zowel gebeurtenis als registratiedatum moeten **strikt vóór** de uitgiftedag liggen. De dagresolutie sluit conservatief ook gebeurtenissen eerder op dezelfde dag uit. Status/dispuutvlaggen zijn snapshots; echte wijzigingen vereisen een gedateerd auditlog. Andere kenmerken (tenure, kredietbenutting, voorwaarden, bedrag) moeten afzonderlijk uit hun bron worden gecontroleerd.

## Echte data lokaal controleren

Zie [REAL_DATA.md](REAL_DATA.md). De invoer bevat een expliciete betaalstatus, volledig betaalde datum, betaald bedrag, creditbedrag, valuta en dispuutvlag. Een lege betaaldatum alleen wordt nooit als bewijs van onbetaald geaccepteerd. De lokale validator reconstrueert de drie historische kenmerken met een aanvullend ledger. Bronrechten en volledigheid blijven verantwoordelijkheid van de data-eigenaar. Publiceer geen klantgegevens of pilotrecords in deze repository.

## Pilot: meten of extra opvolging helpt

Leg vooraf met de finance-eigenaar vast: doelgroep en uitsluitingen, normale werkwijze, extra opvolgactie, klantniveau als toewijzingseenheid, willekeurig gekozen en bevroren seed, 14-dagenvenster, gewenste verbetering, tijdskosten en benodigde steekproef. De seed wordt vóór de uitkomsten vastgelegd; geen klanten selecteren op een gunstige uitkomst. Eén klant blijft met alle facturen in dezelfde groep. Controle is de bestaande werkwijze, geen onthouding van verplichte dienstverlening.

`invoice_risk.pilot.arm_for(customer_id, seed)` geeft reproduceerbaar `review` of `control` via een hash. Dit is een allocation helper; het bewijst niet dat werving en uitvoering onbevooroordeeld waren. Registreer ook niet-uitgevoerde toegewezen opvolging. Analyseer alle ingeschreven klanten in hun oorspronkelijke groep.

Lokaal JSON-bestand: lijst van records met `customer_id`, `arm`, `currency`, `enrolled_at`, `observed_until`, `opening_minor`, `received_minor`, `minutes`. Bedragen zijn integer minor units en beide groepen gebruiken één expliciete valuta. `observed_until` moet exact 14 dagen na `enrolled_at` zijn. `received_minor` omvat uitsluitend cash ontvangen op de bij inschrijving vastgelegde openstaande facturen binnen dat venster (dus geen nieuwe verkopen of credits); maximaal het openingsbedrag. Log voor beide groepen de werkelijk bestede minuten. Identieke tijdzoneconventie vereist.

```sh
python -m scripts.pilot_report /PRIVATE/pilot.json --seed 'vooraf-vastgelegde-seed' --output /PRIVATE/pilot-aggregate.json
```

Het rapport geeft per groep cash/openingsbedrag, minuten per klant en verschil in procentpunten. Geen gefabriceerde uitkomsten, ROI, significantie of causale conclusie. Een professioneel experiment vereist bovendien uitvoering/audit, uitval- en contaminatiecontrole, onzekerheidsanalyse en voldoende steekproef; de rapportage vervangt dat niet. Een rangschikmodel voorspelt risico, geen behandelingseffect.

## Vaste release v1.2.0

`releases/current.json` wijst naar een snapshot met model, trainingsdataset, evaluatierapport, browsermodel, parity-fixtures en replay. Het manifest bevat SHA-256 per bestand. Restore controleert alle hashes vóór kopiëren. Een bestaande versie overschrijven wordt geweigerd. Hashes detecteren onbedoelde afwijkingen; ze zijn geen digitale handtekening tegen een kwaadwillige wijziging van de hele repository.

```sh
make restore             # exact gepubliceerde snapshot herstellen
make train               # expliciet een nieuwe lokale kandidaat trainen
python -m scripts.operations_demo
python -m scripts.model_release freeze --version v1.3.0  # alleen bij bewuste nieuwe modelrelease
```

Kies een ongebruikte versie en controleer kandidaat, rapport en parity vóór freeze. Commit de snapshot en code samen. Documentatiepublicatie, CI en Docker herstellen de gekozen release en trainen niet opnieuw. Nieuwe code/afhankelijkheden kunnen nog steeds incompatibel worden; de tests blijven daarom verplicht. Dit model is op synthetische gegevens getraind en bewijst geen prestaties op bedrijfsdata.
