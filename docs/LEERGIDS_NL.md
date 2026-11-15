# FinRisk AI zelf begrijpen

Dit project is met AI-hulp gebouwd. Je portfolio wordt sterker wanneer je de code kunt uitvoeren, bekritiseren en aanpassen. Je hoeft niet alles uit het hoofd te kennen; je moet de kernkeuzes kunnen verdedigen.

## 1. Draai het volledige systeem

Volg de README. Open daarna het dashboard, inspecteer een factuur en open die in Scenario lab. Noteer de zeven inputs en de score. Klik op Run prediction en controleer dat dezelfde inputs dezelfde score geven.

Het dashboard toont de volledige factuurbedragen van gemarkeerde facturen als “flagged exposure”. Dit is geen voorspeld verlies. Laat betaald is bovendien iets anders dan nooit betaald.

## 2. Volg één rij door de code

Open `invoice_risk/data.py`. `generate()` maakt fictieve facturen. De generator gebruikt een formule en toeval om het label `late` te simuleren. Open vervolgens `train.py`: de Random Forest leert een patroon uit de trainingsrijen. In `api.py` gebruikt `score()` het opgeslagen model met `predict_proba`. De API roept de generatorformule niet aan om een score te verzinnen.

Zoek de lijst `FEATURES`. Het label, de identifier en toekomstige betaalinformatie staan daar bewust niet in. Een model met de uiteindelijke betaaldatum zou tijdens testen fantastisch lijken en bij nieuwe facturen onbruikbaar zijn. Dat heet datalek of target leakage.

De datums zorgen voor een chronologische demonstratiesplit. Omdat de voorbeelden onafhankelijk synthetisch zijn, bewijst dat nog geen degelijke backtest op echte klanten. Daar moet je ook terugkerende klanten en de beschikbaarheid van labels respecteren.

## 3. Leg een Random Forest in eigen woorden uit

Een beslissingsboom stelt een reeks vragen over inputs. Een bos traint veel verschillende bomen op varianten van de data en combineert hun voorspellingen. Dit model gebruikt 220 bomen. `max_depth=12` en `min_samples_leaf=12` beperken hoeveel detail het kan memoriseren.

Een score van 35% is een modelschatting, geen bewezen kans voor echte klanten. Het model is niet gekalibreerd en heeft uitsluitend fictieve data gezien.

## 4. Begrijp de fouten

- True positive: de factuur was laat en kreeg een waarschuwing.
- False positive: de factuur kwam op tijd, maar kreeg toch een waarschuwing.
- False negative: de factuur was laat en werd gemist.
- True negative: de factuur kwam op tijd en kreeg geen waarschuwing.

Precision vraagt: hoeveel gemarkeerde facturen zijn werkelijk laat? Recall vraagt: hoeveel laattijdige facturen herkennen we? Een lage drempel verhoogt meestal recall en de werkdruk. Accuracy kan hoog lijken terwijl alle late facturen worden gemist.

Open Model report en verschuif de drempel. Noteer de aantallen fouten op 10%, 30% en 70%. Dit is een verkenning van testresultaten; het verandert het actieve modelbeleid niet. Het actieve beleid is apart op validatiedata geselecteerd met een fictieve kostverhouding van vijf tegen één.

ROC-AUC meet rangschikking over drempels. PR-AUC (hier average precision) is nuttig bij minderheidslabels. Brier meet de kwaliteit van kansschattingen. Geen van die cijfers bewijst zakelijke opbrengst.

## 5. Waarom verslaat logistieke regressie het bos?

Kijk naar de vergelijking. De synthetische generator bevat een grotendeels logistieke relatie. Een eenvoudiger model kan die structuur efficiënt leren en beter generaliseren. Dit is geen mislukking: modellen vergelijken en een eenvoudiger alternatief serieus nemen is juist een professionele keuze.

De showcase serveert nog het bos om de gevraagde engineering te demonstreren. Voor een echte implementatie zou je de beste onderbouwde kandidaat kiezen, kalibratie onderzoeken en kosten en teamcapaciteit valideren.

## 6. Begrijp de uitleg bij een score

De globale grafiek gebruikt permutation importance: verwissel één kolom en meet hoeveel het onderscheidend vermogen daalt. Gecorreleerde inputs kunnen elkaars belang verbergen.

De factuurdetails vervangen één input door zijn trainingsgemiddelde en tonen het scoreverschil. Dit is modelsensitiviteit, geen SHAP en geen oorzakelijk effect. Gemiddelde vervangingen kunnen onrealistische combinaties maken. Je mag niet zeggen: “deze actie verlaagt het echte risico met 12%”. Je kunt wel zeggen: “bij deze gewijzigde invoer geeft het model een lagere score”.

## 7. Maak drie eigen wijzigingen

1. Verander `min_samples_leaf` van 12 naar 24, train opnieuw en vergelijk validatiegedrag. Pas niet steeds aan op basis van het testcijfer; reserveer bij echte iteratie een nieuwe finale testset.
2. Voeg een test toe die een nieuw ongeldig invoergeval afwijst. Leg uit welke fout die test voorkomt.
3. Bedenk een alternatief beleid: bijvoorbeeld de 10 hoogste scores omdat het team dagelijks 10 dossiers kan opvolgen. Bereken precision@10 op een passende validatieset. Pas de UI pas aan nadat je de betekenis hebt uitgewerkt.

Noteer je wijzigingen en bevindingen in een eigen logboek. Een verandering die je zelf kunt uitleggen is waardevoller dan extra functies die je niet begrijpt.

## 8. Wat ontbreekt nog voor productie?

Echte gelabelde data; juridisch en operationeel afgestemde datatoegang; tijdsafhankelijke backtesting met mature labels; klantsegmenten; kalibratie; echte follow-upkosten; privacy; toegangsbeheer; meetbare monitoring; rollback; verantwoordelijke eigenaar. Docker, tests en een mooie interface vervangen dat werk niet.
