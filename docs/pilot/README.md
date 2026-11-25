# Finance-pilotpakket — voorbereid, nog niet uitgevoerd

## Wat is al gedaan?

Een korte productdemo en een afzonderlijke benchmark op gelicentieerde openbare SECOP-betaalrecords zijn beschikbaar. Het publieke onderzoek bewijst geen Belgisch bedrijfsnut. Er is **geen** bedrijf of finance-reviewer bevestigd en geen herinneringsexperiment uitgevoerd. Deze map bevat lege sjablonen, geen resultaten of handtekeningen.

## Eerst een review, dan een proef

1. Gebruik [contactroutes](contact-routes.md) en de [conceptaanvraag](pilot-request-nl.txt) voor een eerste gesprek zonder gegevens. Een eerste reviewaanvraag is op 25 november 2026 met toestemming naar IvKM verstuurd. Reactie en deelname zijn nog niet bevestigd.
2. Laat de echte medewerker [finance-review.md](finance-review.md) invullen. Bespreek uitgiftevoorspelling versus opvolging van achterstallige facturen, betaalstatus, credits, registratietijdstippen, tijdsbesteding en huidige regels.
3. Leg met de data-eigenaar bron, toegelaten verwerking, lokale opslag, mapping van gepseudonimiseerde klanten en bewaartermijn vast. Laat de omvang en onzekerheidsanalyse door een geschikte methodereviewer beoordelen. Geen universele steekproefgrootte of ROI beloven.
4. Begin met een lokale audit/backtest op een volledig tijdvenster, inclusief onbetaalde en afwijkende dossiers. Gebruik het ledgercontract in ../OPERATIONS.md. Ontbrekende modelkenmerken mogen niet worden verzonnen; een ander model heeft een nieuw protocol nodig.
5. Start pas daarna een vooraf vastgelegde gecontroleerde proef: klantniveau, normale werkwijze versus extra opvolging, 14 dagen uitkomstmeting, volledige deelnemerslijst, concrete actie en succes-/stopcriteria. Het model meet geen behandelingseffect. Een reviewer moet het design goedkeuren vóór uitvoering.

## Lokale cohortregistratie

`cohort-template.csv` bevat uitsluitend kolomkoppen. Vul één regel per deelnemende klant in: customer_id (lokale code), currency (één valuta voor de hele proef), opening_minor (positief integer openingsbedrag in minor units). Leg per klant de bijbehorende openingsfacturen apart vast. Registreer vóór de actieperiode; kies en bevries de seed vóór uitkomsten bekend zijn. Geen seed zoeken die een gewenst groepsresultaat oplevert.

```sh
python -m scripts.pilot_workspace register \
  --cohort /PRIVATE/cohort.csv --workspace /PRIVATE/finrisk-pilot \
  --owner 'echte data-eigenaar en rol' --rights 'toestemmingsreferentie' \
  --source 'exportreferentie' --seed 'vooraf vastgelegde willekeurige seed' \
  --start '2027-01-11T09:00:00+01:00'
```

De startdatum is een voorbeeld; spreek de echte datum af. Het commando maakt protocol.json, een checksum en outcomes.csv met **lege** cash/tijdvelden. Het overschrijft geen bestaand cohort en blokkeert deelnemeropslag in publieke repositorymappen. Een hash is geen handtekening of onafhankelijke toestemming. Er moet een echte audit van uitvoering blijven.

## Tijdens de proef

Bewaar action-log-template.csv en receipts-template.csv lokaal. Houd alle facturen van één klant in dezelfde groep. Controle krijgt de normale werkwijze; leg beide werkwijzen concreet vast. Registreer ook overgeslagen toegewezen acties en uitzonderingen. Gebruik alleen daadwerkelijk ontvangen cash op de vastgelegde openingsfacturen binnen hetzelfde venster; credits zijn geen ontvangst. Rente, nieuwe facturen en koerswinsten horen niet in de uitkomst. Meet minuten in beide groepen. Stop volgens vooraf afgesproken criteria bij onjuiste of schadelijke opvolging; nooit automatisch berichten versturen.

## Rapporteren

Vul outcomes.csv in: customer_id, received_minor, minutes, observation_complete (`yes` pas na gecontroleerde volledige observatie). Behoud alle ingeschreven klanten, ook als de geplande actie niet gebeurde. Ontbrekend is geen nul. Het rapport weigert onvolledige cohorten, blanco uitkomsten, gewijzigde protocolbestanden en nog lopende meetvensters.

```sh
python -m scripts.pilot_workspace report \
  --workspace /PRIVATE/finrisk-pilot --output /PRIVATE/finrisk-pilot-aggregate.json
```

Het rapport is beschrijvend: cash/openingsbedrag per groep, minuten per klant en verschil in procentpunten. Het geeft geen causaliteitsbewijs, significantie of winstgarantie. Controleer rekrutering, afwijkingen, uitval, contaminatie, onzekerheid en uitsluitingen met de reviewer. Publiceer geen deelnemers, mapping, ruwe facturen of onbeoordeelde pilotresultaten.

## Klaarcriterium

Pas afgerond na daadwerkelijke data-eigenaarstoestemming, een ingevulde finance-review, gecontroleerde data, vooraf geregistreerd protocol, afgeronde observaties en gezamenlijke beoordeling. Een map met sjablonen voldoet daar niet aan.
