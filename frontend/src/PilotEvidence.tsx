import { useEffect, useState } from "react";
import { Panel } from "./components";
import { asset, REPOSITORY } from "./runtime";
type Evidence = {
  source: { source_url: string; publisher: string };
  data_quality: { downloaded: number; accepted: number };
  splits: Record<string, { rows: number }>;
  models: Record<string, { test: { roc_auc: number } }>;
  rule_auc: Record<string, number>;
  capacity: Record<string, { late_found: number; k: number }>;
};
export function PilotEvidence() {
  const [report, setReport] = useState<Evidence | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(asset("reading/secop-report.json"), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Report unavailable");
        return r.json();
      })
      .then(setReport)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <Panel className="pilot-evidence">
      <span className="eyebrow">Aparte praktijktoets · CC BY-SA 4.0</span>
      <h2>Echte openbare betaalgegevens. Duidelijke grenzen.</h2>
      <p>
        Naast de synthetische demo is een afzonderlijke benchmark uitgevoerd op
        SECOP II, het Colombiaanse portaal voor overheidsopdrachten. Dit is een
        ander model met zes datum- en historiekkenmerken. Het vervangt of
        valideert het bestaande EUR-demomodel niet.
      </p>
      {error && (
        <p role="alert">
          Het rapport kon niet worden geladen. De bron en volledige analyse
          staan in de repository.
        </p>
      )}
      {report && (
        <>
          <div className="stats">
            <div className="stat">
              <span>Openbare records opgehaald</span>
              <strong>
                {report.data_quality.downloaded.toLocaleString("nl-BE")}
              </strong>
            </div>
            <div className="stat">
              <span>Bruikbaar binnen protocol</span>
              <strong>
                {report.data_quality.accepted.toLocaleString("nl-BE")}
              </strong>
            </div>
            <div className="stat">
              <span>Finale test · nov–dec 2023</span>
              <strong>{report.splits.test.rows}</strong>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label="Aparte publieke benchmark">
              <thead>
                <tr>
                  <th>Model of regel</th>
                  <th>Test ROC-AUC</th>
                  <th>Laat betaald in top 10</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.capacity).map(([name, row]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      {(
                        report.models[name]?.test.roc_auc ??
                        report.rule_auc[name]
                      ).toFixed(3)}
                    </td>
                    <td>
                      {row.late_found}/{row.k}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>Een eenvoudige regel komt dichtbij.</strong> Rangschikken op
            kortere betaaltermijn haalt ROC-AUC{" "}
            {report.rule_auc["Shorter payment-term rule"].toFixed(3)} tegenover{" "}
            {report.models[
              "Random Forest (public-data candidate)"
            ].test.roc_auc.toFixed(3)}{" "}
            voor het bos. Zonder passende onzekerheidsanalyse is geen
            betekenisvol voordeel aangetoond.
          </p>
          <p className="subtle">
            Top 10 uit één historische testpool; geen dagelijkse pilot.
            Rangschikking bij gelijke scores volgt de vaste rijvolgorde. De
            prior-only baseline geeft alle dossiers dezelfde score.
          </p>
          <p>
            <a href={report.source.source_url} target="_blank" rel="noreferrer">
              Bron: {report.source.publisher}
            </a>{" "}
            · Databewerking en rapport:{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            .
          </p>
        </>
      )}
      <div className="insight">
        <strong>Wat deze toets nog niet bewijst</strong>
        <p>
          Alleen reeds betaalde dossiers, een begrensde steekproef en
          administratieve vervaldata. Registratietijdstippen zijn niet
          beschikbaar; historische berekeningen gebruiken betaaldata als
          benadering. Een finance-medewerker heeft de veldbetekenis nog niet
          bevestigd. Er is geen aangetoonde incassowinst of causaal effect.
        </p>
      </div>
      <div className="demo-links">
        <a
          className="secondary"
          href={REPOSITORY + "/blob/main/benchmarks/secop/README.md"}
          target="_blank"
          rel="noreferrer"
        >
          Bekijk protocol, bron en beperkingen
        </a>
        <a
          className="secondary"
          href={asset("reading/finrisk-pilot-kit.zip")}
          download
        >
          Download finance-pilotpakket
        </a>
      </div>
      <p>
        <strong>Finance-pilot: nog niet uitgevoerd.</strong> Intake, toewijzing,
        lege registraties en contactroutes zijn voorbereid. Er is nog geen
        deelnemende organisatie of finance-reviewer bevestigd.
      </p>
    </Panel>
  );
}
