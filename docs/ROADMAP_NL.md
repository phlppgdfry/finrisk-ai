# Hoe FinRisk AI nog sterker wordt

De grootste volgende stap is bewijskracht: aantonen dat het systeem onder realistische omstandigheden een nuttige beslissing ondersteunt. Meer technieken alleen maken het project niet sterker.

## 1. Een realistische, toegelaten dataset — hoogste prioriteit

Werk met geanonimiseerde of aantoonbaar rechtmatig beschikbare factuurhistoriek. Leg samen met een domeinexpert vast wat “te laat” betekent, wanneer je voorspelt en welke informatie op dat moment werkelijk beschikbaar was. Beschrijf herkomst, toestemming, databereik en ontbrekende waarden. Publiceer geen bedrijfsdata zonder toestemming.

**Bewijs:** een data contract, point-in-time features, analyse van ontbrekende waarden en labelvertraging. Gebruik een afzonderlijke, volledig uitgerijpte out-of-time testset. Behandel terugkerende klanten en tijdsafhankelijkheid expliciet.

## 2. Vergelijk de zakelijke beslissing

Vergelijk modelgestuurde opvolging met de bestaande regel, bijvoorbeeld hoogste openstaande bedrag of historische laatratio. Meet precision@k en recall@k bij de werkelijke capaciteit van een team. Kies kostenverhoudingen op basis van de praktijk, niet de huidige fictieve 5:1-verhouding.

**Bewijs:** een reproduceerbare validatievergelijking, foutenanalyse en een helder besluit welk model of welke regel het beste werkt. Als logistieke regressie wint, gebruik die kandidaat. Een sterk project mag een eenvoudiger eindmodel hebben.

## 3. Betere kansschattingen en onzekerheid

Onderzoek kalibratie op aparte data en toets daarna op een nieuwe finale set. Rapporteer betrouwbaarheid per segment, bij kleine steekproeven en bij nieuwe klanten. De spreiding tussen bomen is geen betrouwbaarheidsinterval voor een individuele klant.

**Bewijs:** reliability diagrams vóór/na, Brier score, segmentanalyse en verklaarde beperkingen.

## 4. Een kleine, meetbare pilot

Laat een finance-medewerker het prototype gebruiken met menselijke beslissingen en feedback. Meet tijdbesparing, onnodige opvolging, bruikbaarheid en werkelijk betaalgedrag tegenover een passende controlemethode. Een voorspellingsmodel bewijst op zichzelf geen interventie-effect of snellere betaling.

**Bewijs:** vooraf bepaalde succescriteria, observaties van echte gebruikers en een eerlijke pilotrapportage.

## 5. Beheer dat je kunt demonstreren

Voeg modelversies, modelpromotie, rollback, een expliciete datakwaliteitscheck en metingen van invoerverandering toe aan de Python-service. Maak een scenario waarin een ongeldige export of verslechterde kandidaat de release blokkeert. Pas authenticatie en auditlogging toe als er werkelijk gedeelde of gevoelige gegevens komen.

**Bewijs:** een reproduceerbare release, een gecontroleerde rollback en een incidentvoorbeeld. Kubernetes is pas zinvol wanneer schaal en beheer het vereisen.

## 6. Jouw eigen engineeringverhaal

Schrijf een kort beslislogboek: probleem, alternatieven, gekozen aanpak, tests, wat niet werkte en wat je daarna aanpaste. Maak zelf één inhoudelijke wijziging en licht die toe zonder de code te laten voorlezen. Een demo van 90 seconden kan het product introduceren; een technisch gesprek moet de keuzes dragen.

**Bewijs:** een kleine wijziging die jij begrijpt, een overzichtelijke pull request en een concrete les uit je experiment.

## Reeds gerealiseerd in versie 1.1

- Publieke GitHub Pages-versie met echte modelberekeningen in de browser.
- Export van alle 220 getrainde bomen, geen vervangende scoreformule.
- Gelijkheidscontrole met Python op 824 voorbeelden, inclusief splitgrenzen.
- Interactieve inspectie van werkelijke beslissingspaden, in Nederlands en Engels.
- Een verzorgd ontwerp, gegenereerde illustratie en animaties met ondersteuning voor minder beweging.
- CSV-scoring zonder upload op de publieke site.

## Gerealiseerd in versie 1.2

- Dagelijkse replay van 15 dagen met herhaalde klanten, tien-dossierlimiet en afkoeling.
- Expliciete verwerking van onbekende status, deelbetalingen, credits, disputes, valuta en nieuwe klanten.
- Dated-ledgercontrole van historische kenmerken voor lokale externe evaluatie.
- Klantniveau-toewijzing en beschrijvende cash/tijd-rapportage voor een toekomstige pilot.
- Vaste model-, dataset-, rapport- en browserrelease met checksumcontrole; publicatie traint niet opnieuw.

Open blijven: passende toegelaten bedrijfsdata, echte integratie en gebruikersobservaties, een correct uitgevoerde pilot en bewijs van effect. Zie [operationeel contract](OPERATIONS.md).

## Gerealiseerd in versie 1.3

- Sollicitatievideo van circa 70 seconden met echte app-opnames en Nederlandse ondertitels.
- Afzonderlijke, reproduceerbare benchmark op officieel gelicentieerde openbare SECOP-betaalrecords, inclusief eenvoudige termijnenregel en duidelijke beperkingen.
- Downloadbaar finance-pilotpakket, contactroutes en niet-verzonden conceptaanvraag.
- Lokale cohortregistratie en controle op volledige deelnemers, lege uitkomsten en afgeronde meetvensters.

Een daadwerkelijke finance-review, bedrijfsvalidatie en interventiepilot blijven nog uit te voeren. Een publieke benchmark of lege sjablonen vervangen die stappen niet.
