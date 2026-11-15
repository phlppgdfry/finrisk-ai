# Een demo van vijf minuten

## 0:00 — De zakelijke vraag

“Ik bouwde met AI-ondersteuning een werkend prototype om nieuw uitgegeven facturen te rangschikken op risico op laattijdige betaling. Het doel is menselijke opvolging prioriteren. De data is volledig synthetisch; ik claim geen bewezen opbrengst of productie-ervaring met klantdata.”

## 0:40 — Toon het product

Open Overview. Toon de 64 facturen en licht “flagged exposure” toe: volledige factuurbedragen van gemarkeerde dossiers, geen verliesraming. Zoek een klant, filter op High en inspecteer een factuur. Open de factuur in Scenario lab, voer een voorspelling uit, verander een input en voer opnieuw uit.

Vertel dat de echte API het opgeslagen model gebruikt. De gevoeligheidsuitleg is geen causale onderbouwing voor een zakelijke interventie.

## 1:50 — Toon de evaluatie

Open Model report. Licht precision en recall toe. Verschuif de exploratieve drempel. Vertel dat de actieve drempel vooraf op validatie werd gekozen, met een fictieve kostenverhouding. Wijs op de vele foutieve waarschuwingen.

Toon dat logistieke regressie in deze run beter presteert. “Ik zou complexiteit niet verdedigen als een eenvoudiger model beter onderbouwd is. Het bos demonstreert hier de engineering; voor productie zou ik de beste kandidaat verder valideren.”

## 3:00 — Toon de engineering

Open `/docs`, toon het validatieschema en `POST /api/predict`. Leg uit: zeven kenmerken die bij uitgifte beschikbaar zijn; geen latere betaalstatus; disjuncte chronologische splits; reproduceerbare generator; artifactcontrole; API-tests; TypeScript; meegeleverde CI-definitie en containerrecept. Claim alleen checks die in VERIFICATION staan.

## 4:00 — Benoem wat je nog zou doen

“Ik wil eerst begrijpen hoe jullie factuurdata, klantidentiteiten en de beschikbaarheid van betaaluitkomsten werken. Dan maak ik een echte temporele backtest, vergelijk ik het model met de bestaande werkwijze en meet ik prestaties bij de werkelijke capaciteit van het opvolgteam.”

## Vragen die je moet kunnen beantwoorden

**Waarom geen accuracy als hoofdcijfer?** Een dominante klasse kan een model belonen dat alle late facturen mist.

**Waarom geen random split?** Bij echte financiële tijdreeksen wil je de toekomst nabootsen en voorkomen dat toekomstige informatie het verleden bereikt. Onze synthetische datums tonen alleen de structuur van dat protocol.

**Waarom geen gekalibreerde kansen?** Dat is expliciet een beperking van deze versie; de reliability curve en Brier score maken ze zichtbaar. Kalibratie moet met aparte, passende data en finale toetsing gebeuren.

**Waarom een threshold van 19%, maar High vanaf 60%?** De eerste is het gevalideerde demonstratiebeleid voor opvolging; de tweede is een vaste visuele band. Ook een “Low”-factuur kan bij een lage beleidsdrempel opvolging krijgen.

**Hoe weet je dat er geen datalek is?** Het featureschema is expliciet en sluit outcomes uit, tests bewaken de splits en de API weigert extra velden. Dat bewijst nog niet dat een echte bron alle historische features correct point-in-time berekent; daarvoor heb je een bronaudit nodig.

**Wat is MLOps hier?** Een eerste reproduceerbare train/evalueer/serveerketen met versies, fingerprints, checks en CI-definitie. Geen volledige cloud-MLOps-omgeving, online monitoringsysteem of automatische retraining.

**Wat heb jij zelf gedaan?** Wees concreet en eerlijk over AI-hulp, onderdelen die je begrijpt en wijzigingen die je zelf maakte. Zeg niet dat je ieder onderdeel zelfstandig ontworpen hebt als dat niet klopt.

## CV-tekst, nadat je het project zelf kunt demonstreren

“FinRisk AI — met AI-ondersteuning ontwikkeld ML-portfolio met Random Forest, Python/FastAPI en React. Reproduceerbare synthetische datapipeline, vergelijking met baselines, validatie van beslisdrempels, API-contracttests en interactieve foutenanalyse.”
