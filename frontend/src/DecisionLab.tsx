import { useState } from "react";
import { Panel } from "./components";
import { type Report, pct, money } from "./types";
import { REPOSITORY } from "./runtime";
type Result = {
  k: number;
  late_found: number;
  false_alarms: number;
  precision: number;
  recall: number;
  lift: number;
  precision_interval: number[];
  late_amount_selected: number;
};
type Pool = {
  rows: number;
  prevalence: number;
  capacities: {
    k: number;
    random_expected_late: number;
    strategies: Record<string, Result>;
  }[];
};
export function DecisionLab({ report }: { report: Report }) {
  const [split, setSplit] = useState<"validation" | "test">("validation");
  const [k, setK] = useState(10);
  const data = (
    report as Report & { capacity_evaluation?: Record<string, Pool> }
  ).capacity_evaluation;
  if (!data) return null;
  const pool = data[split];
  const capacity = pool.capacities.find((c) => c.k === k)!;
  return (
    <Panel className="decision-lab">
      <div className="section-title">
        <div>
          <h2>Welke tien facturen eerst?</h2>
          <p>
            Vergelijk opvolgstrategieën bij dezelfde capaciteit — op
            synthetische facturen met bekende uitkomsten.
          </p>
        </div>
      </div>
      <div className="decision-controls">
        <label>
          Evaluatieset
          <select
            aria-label="Evaluatieset"
            value={split}
            onChange={(e) => setSplit(e.target.value as "validation" | "test")}
          >
            <option value="validation">Validatie — beleid onderzoeken</option>
            <option value="test">Test — eindresultaat bekijken</option>
          </select>
        </label>
        <label>
          Capaciteit
          <select
            aria-label="Opvolgcapaciteit"
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
          >
            {pool.capacities.map((c) => (
              <option key={c.k} value={c.k}>
                {c.k} facturen
              </option>
            ))}
          </select>
        </label>
        <p>
          {pool.rows.toLocaleString()} facturen in deze evaluatiepool ·{" "}
          {pct(pool.prevalence, 1)} werkelijk te laat
        </p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Strategie</th>
              <th>Te laat gevonden</th>
              <th>Onnodige waarschuwingen</th>
              <th>Precision@{k}</th>
              <th>Recall@{k}</th>
              <th>Lift versus toeval</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(capacity.strategies).map(([name, r]) => (
              <tr key={name}>
                <td>
                  <strong>{name}</strong>
                </td>
                <td>
                  {r.late_found} / {k}
                </td>
                <td>{r.false_alarms}</td>
                <td>
                  <div className="capacity-bar">
                    <span style={{ width: pct(r.precision) }} />
                  </div>
                  {pct(r.precision)}{" "}
                  <small>
                    ({r.precision_interval.map((n) => pct(n)).join("–")})
                  </small>
                </td>
                <td>{pct(r.recall, 1)}</td>
                <td>{r.lift.toFixed(2)}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="insight">
        <strong>
          Willekeurig kiezen: gemiddeld{" "}
          {capacity.random_expected_late.toFixed(1)} late facturen bij {k}{" "}
          controles.
        </strong>
        <p>
          De regels “hoogste bedrag” en “historisch vaak te laat” gebruiken
          alleen informatie van vóór betaling. Modellen rangschikken op hun
          kansscore; de evaluatie bekijkt daarna de echte synthetische
          uitkomsten. De beste rij wordt niet automatisch het actieve beleid.
        </p>
      </div>
      <p>
        Precision betekent: hoeveel van jouw {k} controles blijken terecht?
        Recall betekent: welk deel van alle late facturen vind je? De
        intervallen zijn indicatieve 95% Wilson-intervallen; bij tien controles
        is de onzekerheid groot.
      </p>
      <details>
        <summary>Bedragen en interpretatie</summary>
        {Object.entries(capacity.strategies).map(([name, r]) => (
          <p key={name}>
            {name}: {money(r.late_amount_selected)} aan factuurbedragen van
            gevonden late betalingen.
          </p>
        ))}
        <p>
          Dit is geen verlies, geïnde omzet of bewezen opbrengst. Een hoge kans
          op te laat betalen bewijst niet dat een herinnering de betaling
          versnelt. De pool stelt geen echte werkdag voor. Capaciteiten zijn
          vooraf vastgelegd; verder kiezen op testresultaten vraagt een nieuwe
          finale testset.
        </p>
      </details>
      <div className="real-data-status">
        <h3>Echte data: nog niet gevalideerd</h3>
        <p>
          Er is nog geen geautoriseerde dataset met passende factuurkenmerken en
          controleerbare betaaluitkomsten aangesloten. De lokale validatieroute
          controleert schema, datums, rij-identiteiten en volwassen labels, en
          evalueert het bevroren model tegenover eenvoudige regels. Ontbrekende
          toestemming of features worden niet verzonnen.
        </p>
        <a
          className="text-button"
          href={REPOSITORY + "/blob/main/docs/REAL_DATA.md"}
          target="_blank"
          rel="noreferrer"
        >
          Bekijk bronnenonderzoek en het aansluitcontract →
        </a>
      </div>
    </Panel>
  );
}
