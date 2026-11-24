import { useEffect, useState } from "react";
import { Panel } from "./components";
import { asset, REPOSITORY } from "./runtime";
import { pct } from "./types";
type Row = {
  invoice_id: string;
  customer: string;
  currency: string;
  open_minor: number;
  days_overdue: number;
  score: number | null;
  lane: string;
};
type Day = {
  as_of: string;
  selected: Row[];
  eligible: number;
  excluded: { invoice_id: string; reason: string }[];
  reviewed_so_far: number;
};
type Replay = {
  synthetic: boolean;
  replay: Record<string, Day[]>;
  limits: string;
  fx_note: string;
};
export function OperationsLab() {
  const [data, setData] = useState<Replay | null>(null);
  const [error, setError] = useState("");
  const [policy, setPolicy] = useState("risk");
  const [day, setDay] = useState(0);
  const [release, setRelease] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(asset("data/operations.json"), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Replay unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    fetch(asset("data/release.json"), { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r) setRelease(r.release);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <Panel>
        <h1>Dagelijkse opvolging</h1>
        <p role="alert">{error}</p>
      </Panel>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Werklijst laden…
      </div>
    );
  const current = data.replay[policy][day];
  const reasons = Object.entries(
    current.excluded.reduce(
      (a, r) => ({ ...a, [r.reason]: (a[r.reason] || 0) + 1 }),
      {} as Record<string, number>,
    ),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Een werkdag, tien dossiers.</h1>
          <p>
            Een reproduceerbare replay van vijftien dagen. Volledig synthetisch;
            er worden geen herinneringen verstuurd.
          </p>
        </div>
        <span className="badge">Release {release || "local candidate"}</span>
      </div>
      <Panel>
        <div className="decision-controls">
          <label>
            Werkdag
            <select
              aria-label="Werkdag"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              {data.replay[policy].map((d, i) => (
                <option key={i} value={i}>
                  {d.as_of}
                </option>
              ))}
            </select>
          </label>
          <label>
            Opvolgstrategie
            <select
              aria-label="Opvolgstrategie"
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
            >
              <option value="risk">Modelrisico</option>
              <option value="amount">Hoogste openstaand bedrag</option>
              <option value="history">Historische laatratio</option>
            </select>
          </label>
        </div>
        <div className="stats">
          <div className="stat">
            <span>Geselecteerde dossiers</span>
            <strong>{current.selected.length}/10</strong>
          </div>
          <div className="stat">
            <span>Beschikbaar na controles</span>
            <strong>{current.eligible}</strong>
          </div>
          <div className="stat">
            <span>Unieke facturen bekeken tot nu</span>
            <strong>{current.reviewed_so_far}</strong>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Factuur</th>
                <th>Klant</th>
                <th>Openstaand</th>
                <th>Dagen over tijd</th>
                <th>Uitgiftescore / route</th>
              </tr>
            </thead>
            <tbody>
              {current.selected.map((r) => (
                <tr key={r.invoice_id}>
                  <td>{r.invoice_id}</td>
                  <td>{r.customer}</td>
                  <td>
                    {new Intl.NumberFormat("nl-BE", {
                      style: "currency",
                      currency: r.currency,
                    }).format(r.open_minor / 100)}
                  </td>
                  <td>{r.days_overdue}</td>
                  <td>
                    {r.score === null
                      ? "Handmatige beoordeling"
                      : pct(r.score, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!current.selected.length && (
            <p className="empty">
              Vandaag zijn geen dossiers beschikbaar na de controles.
            </p>
          )}
        </div>
        <div className="insight">
          <strong>Hoe de werklijst kiest</strong>
          <p>
            Maximaal tien dossiers per dag, één per klant. Zeven dagen rust na
            een eerdere beoordeling van dezelfde klant. Maximaal twee plaatsen
            worden eerst voor nieuwe of niet-ondersteunde profielen
            gereserveerd. De rest wordt volgens de gekozen strategie gevuld. Een
            modelscore is een uitgifteschatting en wordt niet voorgesteld als
            actuele betalingskans.
          </p>
        </div>
      </Panel>
      <div className="two-col">
        <Panel>
          <h2>Waarom staat een dossier er niet in?</h2>
          <p>
            Elke strategie bouwt zijn eigen opvolghistoriek op. Andere keuzes
            vandaag veranderen daardoor de beschikbare dossiers op latere dagen.
          </p>
          <div className="sensitivity-list">
            {reasons.map(([reason, count]) => (
              <div key={reason}>
                <span>
                  {(
                    {
                      unknown_payment_status: "Betaalstatus onbekend",
                      disputed_manual_resolution: "Betwist — aparte oplossing",
                      settled_or_credited: "Voldaan of gecrediteerd",
                      not_overdue: "Nog niet over tijd",
                      missing_valid_fx: "Geen geldige wisselkoers",
                      cooldown: "Afkoelperiode klant",
                    } as Record<string, string>
                  )[reason] || reason}
                </span>
                <b>{count}</b>
              </div>
            ))}
          </div>
          <p>
            Deelbetalingen en creditnota’s verlagen het resterende bedrag in de
            oorspronkelijke valuta. Een ontbrekende betaaldatum is geen bewijs
            van wanbetaling.
          </p>
        </Panel>
        <Panel>
          <h2>Nieuwe klant? Geen verzonnen kans.</h2>
          <p>
            Het bos vereist afgeronde betaalhistoriek. Zonder die informatie
            komt een factuur in de handmatige route, gesorteerd op achterstand
            en resterend bedrag. Andere valuta en profielen buiten het
            modelbereik krijgen evenmin automatisch een kansscore.
          </p>
          <p>{data.fx_note}</p>
          <p>
            De wisselkoers moet vóór of op de werkdag bekend zijn. Hier zijn het
            expliciet fictieve koersen; ontbrekende USD-koersen blokkeren
            automatische selectie.
          </p>
        </Panel>
      </div>
      <Panel className="pilot-panel">
        <h2>Helpt opvolgen werkelijk?</h2>
        <p>
          Dat is hier nog niet bewezen. De betaalgebeurtenissen in deze replay
          liggen vooraf vast en veranderen niet door de werklijst. We schrijven
          dus geen geïnde euro’s toe aan het model.
        </p>
        <div className="learning-steps">
          <section>
            <span>1</span>
            <h2>Vooraf vastleggen</h2>
            <p>
              Kies klantniveau, meetvenster van 14 dagen, succescriterium en
              volledige deelnemerslijst vóór de start.
            </p>
          </section>
          <section>
            <span>2</span>
            <h2>Vergelijken</h2>
            <p>
              Wijs klanten reproduceerbaar toe aan opvolging of normale
              werkwijze. Houd alle facturen van een klant in dezelfde groep.
            </p>
          </section>
          <section>
            <span>3</span>
            <h2>Meten</h2>
            <p>
              Registreer ontvangen bedrag binnen hetzelfde venster en bestede
              minuten. Vergelijk beide groepen, ook als opvolging niet werd
              uitgevoerd.
            </p>
          </section>
        </div>
        <a
          className="secondary"
          href={REPOSITORY + "/blob/main/docs/OPERATIONS.md"}
          target="_blank"
          rel="noreferrer"
        >
          Bekijk datacontract en pilotinstructies
        </a>
        <p>
          De lokale pilotrapportage controleert toewijzing, meetvenster en
          bedragen. Dat controleert de aangeleverde records; het bewijst niet
          zelfstandig dat een experiment correct is uitgevoerd.
        </p>
      </Panel>
    </>
  );
}
