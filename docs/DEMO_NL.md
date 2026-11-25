# Sollicitatiedemo — FinRisk AI

[Video op de site](https://phlppgdfry.github.io/finrisk-ai/#case-study) · [MP4](https://phlppgdfry.github.io/finrisk-ai/media/finrisk-demo-nl.mp4)

Een echte browseropname van circa 70 seconden: één synthetische factuur, hetzelfde profiel door een werkelijke beslisboom, het gemiddelde van 220 bomen, de dagelijkse werklijst en een eerlijke vergelijking met eenvoudige regels. De tekststrook is achteraf onder de opname toegevoegd en bedekt geen applicatie-inhoud. Geen persoonlijke stem, muziek, acteurs, testimonials of echte klantgegevens. Zonder audio is de video ook op een sollicitatiepagina te bekijken; vertel er zelf bij als je hem live toont.

## Transcript van de ondertitels

- 00:00 — Eén factuur. Eén boom. Een dagelijkse werklijst.
- 00:05 — INV-26034 · € 1.205,08 · circa 74,7% modelscore. Geen zekerheid over betaling.
- 00:14 — Elke splitsing stelt één vraag. Links of rechts volgt uit de ingevulde waarde.
- 00:30 — Elke boom gebruikt andere steekproeven en splitsingen. Het bos middelt hun kansen.
- 00:39 — Maximaal tien dossiers. Eén per klant. Zeven dagen rust na een beoordeling.
- 00:50 — Andere strategie, eigen opvolghistoriek. Nieuwe klanten krijgen handmatige beoordeling.
- 00:56 — Synthetische evaluatie: een eenvoudige regel kan winnen. Nog geen bewezen incassowinst.
- 01:03 — Met AI-ondersteuning gebouwd. Echte modelberekeningen, volledig synthetische demo.

## Spreektekst voor een live demonstratie

“Dit is FinRisk AI, mijn portfolio dat ik met AI-ondersteuning ontwikkelde. De interactieve facturen zijn synthetisch.

Hier bekijk ik één factuur. Het model schat ongeveer 75 procent kans op laattijdige betaling. Dat is een modelschatting, geen zekerheid of verliesraming.

Hetzelfde profiel gaat hier door een beslisboom. Elke vraag vergelijkt een kenmerk met een geleerde grens. De gekozen tak leidt uiteindelijk naar een blad. Het bos middelt de kansen uit 220 bomen die met verschillende steekproeven en kenmerken zijn getraind.

De dagelijkse werklijst toont hoe capaciteit en menselijke beoordeling een rol spelen: maximaal tien dossiers, één per klant en een afkoelperiode. Nieuwe klanten krijgen geen verzonnen kans.

Ik vergelijk het model ook met eenvoudige regels. Soms zijn die even goed of beter. Daarom zou ik bedrijfsgebruik pas voorstellen na datacontrole, review met een finance-medewerker en een meetbare pilot. Een voorspelling bewijst niet dat een herinnering helpt.”

Deze tekst is een hulpmiddel; claim alleen onderdelen die je zelf begrijpt. Het aanvullende SECOP-onderzoek staat los van de synthetische modellen die in deze video worden getoond.

## Opnieuw opnemen en monteren

Vereist de bestaande Node-dependencies, Playwright Chromium en FFmpeg. De opname gebruikt de echte openbare applicatie. Inter met OFL-licentie staat in scripts/assets. Een lokale site kan via FINRISK_DEMO_URL worden gekozen.

```sh
FINRISK_DEMO_DIR=/private/tmp/finrisk-demo node scripts/record_demo.mjs
python -m scripts.render_demo /private/tmp/finrisk-demo
```

De recorder vult dezelfde zeven kenmerken van INV-26034 in de boomverkenner in. Scrollbewegingen en knopacties zijn geautomatiseerd; de modeluitkomsten en applicatie worden niet nagemaakt. De montage verwijdert de eerste laadmomenten, behoudt de werkelijke volgorde en voegt alleen een afzonderlijke tekststrook toe. Geen versnelling of vervangende voorspelling. De opgenomen bron is modelrelease v1.2.0; de webpagina kan later nieuwe onderdelen bevatten.

## Bestanden en rechten

- frontend/public/media/finrisk-demo-nl.mp4 — H.264, 1440 × 810, 25 fps, circa 70 seconden, stil, ondertitels ingebrand.
- frontend/public/media/finrisk-demo-nl.vtt — los ondertitelbestand.
- frontend/public/media/finrisk-demo-poster.jpg — werkelijk videoframe als voorvertoning.
- docs/demo-capture.json — hoofdstukken, duur en vastgelegde bron.
- scripts/assets/Inter-LICENSE.txt — SIL OFL voor het meegeleverde lettertype; geen Apple-stemmen of stockmedia gebruikt.

De beelden zijn afkomstig uit deze portfolio-app, inclusief de eerder gegenereerde boomillustratie. De video en tekst vallen onder de MIT-projectlicentie. De afzonderlijke SECOP-dataset en afgeleide benchmark vallen onder CC BY-SA 4.0 en zijn niet in de video gebruikt.

QA: metadata gecontroleerd; montagecontactsheet bekeken; boomscène opnieuw opgenomen om het pad zichtbaar te houden; dezelfde factuur levert 74,7% in dashboard en bos. Geen audiokanaal, dus loudnessmeting niet van toepassing. Ongebruikte zwarte vakken op een contactblad zijn opvulling van het contactblad, geen zwarte videoframes.
