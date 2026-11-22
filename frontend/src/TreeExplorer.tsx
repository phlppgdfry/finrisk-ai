import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  GitBranch,
  RotateCcw,
  LoaderCircle,
  Globe,
} from "lucide-react";
import { loadForest } from "./forestLoader";
import { treePath, treeScores, type Forest } from "./forest-core.mjs";
import { Panel, fields } from "./components";
import { features, type Inputs, pct } from "./types";
import { defaultScenario } from "./ScenarioLab";
const words = {
  en: {
    title: "How the forest thinks.",
    sub: "Follow a real invoice through a real decision tree.",
    tree: "Tree",
    of: "of",
    step: "Step",
    profile: "Invoice profile",
    profileSub: "Change a value. The path and all 220 estimates update.",
    summary: "220 trees. One combined estimate.",
    average: "Forest average",
    single: "Selected tree",
    previous: "Previous split",
    next: "Next split",
    play: "Play path",
    pause: "Pause",
    yes: "Yes",
    no: "No",
    leaf: "Leaf estimate",
    other: "Other branch",
    samples: "training examples",
    input: "Your value",
    reached: "This invoice reaches a leaf.",
    explain:
      "At a leaf, a tree estimates the share of late invoices among its bootstrapped training observations. The forest averages the probabilities from all 220 leaves.",
    reset: "Reset profile",
    reading: "Read the learning guide",
    details: "What happens during training?",
    cards: [
      [
        "A tree asks questions",
        "The model learns which feature and cutoff separate late from on-time examples. It repeats this until a stopping rule is reached.",
      ],
      [
        "A forest adds diversity",
        "Each tree sees a bootstrap sample and considers a random subset of features at a split. This reduces correlation between trees and can reduce variance.",
      ],
      [
        "The average becomes a score",
        "Every tree returns a leaf probability. Their mean is the forest score. The follow-up threshold is a separate business decision.",
      ],
    ],
    technical:
      "Splits reduce Gini impurity on training data. This forest uses 220 trees, a maximum depth of 12 and a minimum of 12 observations per leaf. Some leaves contain repeated bootstrap observations; the displayed sample count is the number of distinct training rows, so it is not necessarily the denominator of the probability.",
    limits:
      "Displayed cutoffs are rounded; routing uses exact thresholds. This is the actual saved forest, not a hand-written illustrative tree. Scores use synthetic data and are uncalibrated; these paths explain model behaviour, not causality.",
    empty: "Loading the real forest…",
  },
  nl: {
    title: "Zo denkt het bos.",
    sub: "Volg een echte demo-factuur door een echte beslissingsboom.",
    tree: "Boom",
    of: "van",
    step: "Stap",
    profile: "Factuurprofiel",
    profileSub:
      "Verander een waarde. Het pad en alle 220 schattingen veranderen mee.",
    summary: "220 bomen. Eén gezamenlijke schatting.",
    average: "Gemiddelde van het bos",
    single: "Geselecteerde boom",
    previous: "Vorige splitsing",
    next: "Volgende splitsing",
    play: "Speel het pad",
    pause: "Pauzeer",
    yes: "Ja",
    no: "Nee",
    leaf: "Schatting eindblad",
    other: "Andere tak",
    samples: "trainingsvoorbeelden",
    input: "Jouw waarde",
    reached: "Deze factuur bereikt een eindblad.",
    explain:
      "In een eindblad schat de boom het aandeel laattijdige facturen op basis van zijn trainingssteekproef. Het bos neemt het gemiddelde van de kansen uit alle 220 eindbladen.",
    reset: "Herstel profiel",
    reading: "Lees de leergids",
    details: "Wat gebeurt er tijdens het trainen?",
    cards: [
      [
        "Een boom stelt vragen",
        "Het model leert welk kenmerk en welke grens de late van de tijdige betalingen scheiden. Dit herhaalt zich tot een stopregel bereikt is.",
      ],
      [
        "Een bos voegt variatie toe",
        "Elke boom krijgt een steekproef met teruglegging en bekijkt bij elke splitsing een willekeurige selectie kenmerken. Zo lijken bomen minder op elkaar en kan de variantie dalen.",
      ],
      [
        "Het gemiddelde wordt een score",
        "Elke boom geeft een kans uit zijn eindblad. Het gemiddelde vormt de bosschatting. De drempel voor opvolging is een aparte zakelijke keuze.",
      ],
    ],
    technical:
      "Een splitsing verlaagt de Gini-onzuiverheid op trainingsdata. Dit bos bevat 220 bomen, met maximaal 12 niveaus en minimaal 12 observaties per eindblad. Steekproeven kunnen dezelfde observatie meermaals bevatten. Het getoonde aantal is het aantal unieke trainingsrijen; het is niet altijd de noemer van de kansberekening.",
    limits:
      "Getoonde grenzen zijn afgerond; de berekening gebruikt de exacte waarden. Je bekijkt het werkelijk opgeslagen bos, geen handgeschreven voorbeeldboom. De data is synthetisch en de kansen zijn niet gekalibreerd. Een pad toont modelgedrag, geen oorzakelijk verband.",
    empty: "Het echte bos wordt geladen…",
  },
};
const nlNames: Record<string, string> = {
  amount: "Factuurbedrag (€)",
  payment_terms: "Betaaltermijn (dagen)",
  customer_tenure: "Klantrelatie (maanden)",
  prior_invoices: "Eerdere facturen",
  prior_late_rate: "Historisch aandeel te laat",
  avg_days_late: "Historische vertraging (dagen)",
  credit_utilisation: "Benutting kredietlimiet",
};
function formatFeature(f: string, n: number) {
  return ["prior_late_rate", "credit_utilisation"].includes(f)
    ? pct(n, 1)
    : f === "amount"
      ? n.toLocaleString("en-GB", { maximumFractionDigits: 2 })
      : n.toFixed(1);
}
export function ForestGlyph() {
  return (
    <svg className="forest-glyph" viewBox="0 0 380 140" aria-hidden="true">
      <g
        className="glyph-lines"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M190 16 100 55M190 16 280 55M100 55 55 92M100 55 145 92M280 55 235 92M280 55 325 92M55 92 32 124M55 92 78 124M145 92 122 124M145 92 168 124M235 92 212 124M235 92 258 124M325 92 302 124M325 92 348 124" />
      </g>
      {[
        [190, 16],
        [100, 55],
        [280, 55],
        [55, 92],
        [145, 92],
        [235, 92],
        [325, 92],
        [32, 124],
        [78, 124],
        [122, 124],
        [168, 124],
        [212, 124],
        [258, 124],
        [302, 124],
        [348, 124],
      ].map(([x, y], i) => (
        <circle
          className={`glyph-node glyph-node-${i % 4}`}
          key={i}
          cx={x}
          cy={y}
          r={i < 7 ? 6 : 4}
          fill={i < 7 ? "#174f3b" : "#d7ee9c"}
          stroke={i < 7 ? "#d9e6da" : "#d7ee9c"}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
export function TreeExplorer() {
  const [forest, setForest] = useState<Forest | null>(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"en" | "nl">("nl");
  const c = words[language];
  const [profile, setProfile] = useState<Inputs>(defaultScenario);
  const [treeIndex, setTreeIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ignore = false;
    loadForest()
      .then((f) => {
        if (!ignore) setForest(f);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, []);
  const values = features.map((f) => profile[f]);
  const tree = forest?.trees[treeIndex];
  const path = useMemo(
    () => (tree ? treePath(tree, values) : []),
    [tree, profile],
  );
  const scores = useMemo(
    () => (forest ? treeScores(forest, values) : []),
    [forest, profile],
  );
  const average = scores.reduce((s, p) => s + p, 0) / (scores.length || 1);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [treeIndex, profile]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () =>
        setStep((s) => {
          if (s >= path.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        }),
      1100,
    );
    return () => clearInterval(id);
  }, [playing, path.length]);
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    canvas.current?.scrollTo({
      top: Math.max(0, step * 120 - 90),
      left: window.innerWidth <= 680 ? 70 : 0,
      behavior: reduced ? "instant" : "smooth",
    });
  }, [step, forest]);
  if (error)
    return (
      <Panel>
        <h1>Could not load the model.</h1>
        <p role="alert">{error}</p>
        <button className="secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </Panel>
    );
  if (!forest || !tree)
    return (
      <div className="loading" role="status">
        <LoaderCircle className="spin" />
        {c.empty}
      </div>
    );
  const node = path[Math.min(step, path.length - 1)];
  const atLeaf = tree.left[node] === -1;
  const f = forest.features[tree.feature[node]];
  const takeLeft =
    !atLeaf && Math.fround(profile[f as keyof Inputs]) <= tree.threshold[node];
  return (
    <div className="learn-page" lang={language}>
      <div className="page-intro">
        <div>
          <h1>{c.title}</h1>
          <p>{c.sub}</p>
        </div>
        <div className="language-switch" aria-label="Explanation language">
          <Globe size={15} />
          {(["nl", "en"] as const).map((l) => (
            <button
              key={l}
              aria-pressed={language === l}
              onClick={() => setLanguage(l)}
            >
              {l === "nl" ? "Nederlands" : "English"}
            </button>
          ))}
        </div>
      </div>
      <Panel className="tree-primer">
        <h2>
          {language === "nl"
            ? "Waarom verschillen die 220 bomen?"
            : "Why are the 220 trees different?"}
        </h2>
        <p>
          {language === "nl"
            ? "Elke boom is een volledig model, geen specialist voor één kolom. Hij trekt 4.320 trainingsrijen mét teruglegging: sommige rijen komen meerdere keren voor, andere niet. Bij een splitsing bekijkt hij normaal twee willekeurig gekozen kandidaatkenmerken uit onze zeven en zoekt een grens die de groepen zuiverder maakt. Verschillende steekproeven en kandidaten leveren andere vragen en eindbladen op."
            : "Every tree is a complete model, not a specialist for one column. It draws 4,320 training rows with replacement, so some appear repeatedly and others are absent. At a split it normally considers two random candidate features from our seven and finds a cutoff that makes the child groups purer. Different samples and candidates produce different questions and leaves."}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{c.tree}</th>
                <th>{language === "nl" ? "Eerste vraag" : "First question"}</th>
                <th>
                  {language === "nl"
                    ? "Unieke trainingsrijen"
                    : "Distinct training rows"}
                </th>
                <th>{language === "nl" ? "Knopen" : "Nodes"}</th>
                <th>
                  {language === "nl"
                    ? "Kans voor dit profiel"
                    : "Estimate for this profile"}
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    {language === "nl"
                      ? nlNames[forest.features[forest.trees[i].feature[0]]]
                      : forest.labels[
                          forest.features[forest.trees[i].feature[0]]
                        ]}{" "}
                    ≤{" "}
                    {formatFeature(
                      forest.features[forest.trees[i].feature[0]],
                      forest.trees[i].threshold[0],
                    )}
                  </td>
                  <td>{forest.trees[i].samples[0]}</td>
                  <td>{forest.trees[i].left.length}</td>
                  <td>{pct(scores[i], 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {language === "nl"
            ? "220 is een ingestelde modelparameter, geen aantal soorten facturen en geen bewezen optimum. Elke boom kan hetzelfde kenmerk meermaals gebruiken. Voor dit profiel middelen we alle 220 kansen; de spreiding ertussen is geen betrouwbaarheidsinterval. Bij onvoldoende geldige splitsingen kan de software meer kandidaatkenmerken onderzoeken."
            : "220 is a configured model parameter, not a number of invoice types or a proven optimum. A tree can reuse the same feature. We average all 220 estimates; their spread is not a confidence interval. The split search can inspect more features when needed to find a valid partition."}
        </p>
      </Panel>
      <div className="learn-grid">
        <Panel className="tree-panel">
          <div className="tree-toolbar">
            <label>
              {c.tree}
              <select
                aria-label={c.tree}
                value={treeIndex}
                onChange={(e) => setTreeIndex(Number(e.target.value))}
              >
                {forest.trees.map((_, i) => (
                  <option key={i} value={i}>
                    {c.tree} {i + 1} {c.of} {forest.trees.length}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {c.step} {step + 1} / {path.length}
            </span>
          </div>
          <div className="tree-canvas" ref={canvas}>
            <svg
              viewBox={`0 0 700 ${path.length * 120 + 20}`}
              style={{ height: path.length * 120 + 20 }}
              role="img"
              aria-label={`${c.tree} ${treeIndex + 1}: ${path.length - 1} splits; ${c.leaf} ${pct(scores[treeIndex], 1)}`}
            >
              {path.map((n, i) => {
                const leaf = tree.left[n] === -1;
                const feat = forest.features[tree.feature[n]];
                const left =
                  !leaf &&
                  Math.fround(profile[feat as keyof Inputs]) <=
                    tree.threshold[n];
                const alternative = leaf
                  ? -1
                  : left
                    ? tree.right[n]
                    : tree.left[n];
                const label =
                  language === "nl" ? nlNames[feat] : forest.labels[feat];
                const y = 20 + i * 120;
                const active = i === step;
                const completed = i < step;
                return (
                  <g key={n} className={i > step ? "future-node" : ""}>
                    {!leaf && (
                      <>
                        <path
                          d={`M245 ${y + 66} V${y + 120}`}
                          fill="none"
                          stroke={completed ? "#174f3b" : "#cfdbd2"}
                          strokeWidth={completed ? 3 : 1.5}
                        />
                        <path
                          d={`M395 ${y + 34} H495 V${y + 74}`}
                          stroke="#ccd5ce"
                          fill="none"
                          strokeWidth="1.4"
                        />
                        <rect
                          x="475"
                          y={y + 75}
                          width="190"
                          height="40"
                          rx="6"
                          fill="#f6f8f5"
                          stroke="#dbe2da"
                        />
                        <text
                          x="570"
                          y={y + 91}
                          textAnchor="middle"
                          className="alternative-label"
                        >
                          {c.other} · {left ? c.no : c.yes}
                        </text>
                        <text
                          x="570"
                          y={y + 105}
                          textAnchor="middle"
                          className="alternative-count"
                        >
                          {tree.samples[alternative]}{" "}
                          {language === "nl" ? "rijen" : "rows"}
                        </text>
                        <rect
                          x="220"
                          y={y + 75}
                          width="50"
                          height="25"
                          rx="12"
                          fill={completed ? "#d7ee9c" : "#e8eee5"}
                        />
                        <text
                          x="245"
                          y={y + 92}
                          textAnchor="middle"
                          className="branch-label"
                        >
                          {left ? c.yes : c.no}
                        </text>
                      </>
                    )}
                    <rect
                      x="95"
                      y={y}
                      width="300"
                      height="66"
                      rx="9"
                      fill={leaf ? "#d7ee9c" : active ? "#f0f7e4" : "#fff"}
                      stroke={active ? "#174f3b" : "#cbd8cd"}
                      strokeWidth={active ? 2 : 1}
                    />
                    <text
                      x="245"
                      y={y + 26}
                      textAnchor="middle"
                      className="node-question"
                    >
                      {leaf ? `${c.leaf}: ${pct(scores[treeIndex], 1)}` : label}
                    </text>
                    <text
                      x="245"
                      y={y + 48}
                      textAnchor="middle"
                      className="node-detail"
                    >
                      {leaf
                        ? `${tree.samples[n]} ${c.samples}`
                        : `≤ ${formatFeature(feat, tree.threshold[n])}? · ${c.input}: ${formatFeature(feat, profile[feat as keyof Inputs])}`}
                    </text>
                    {active && (
                      <circle cx="78" cy={y + 33} r="5" fill="#174f3b" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="tree-narration" aria-live="polite">
            <strong>
              {atLeaf
                ? c.reached
                : `${language === "nl" ? nlNames[f] : forest.labels[f]}: ${formatFeature(f, profile[f as keyof Inputs])} ${takeLeft ? "≤" : ">"} ${formatFeature(f, tree.threshold[node])}`}
            </strong>
            <span>
              {atLeaf
                ? c.explain
                : `${language === "nl" ? "Daarom volgen we de" : "We follow the"} ${takeLeft ? c.yes : c.no}-${language === "nl" ? "tak" : "branch"}.`}
            </span>
          </div>
          <div className="tree-controls">
            <button
              className="secondary"
              disabled={step === 0}
              onClick={() => {
                setPlaying(false);
                setStep((s) => s - 1);
              }}
            >
              <ArrowLeft size={15} />
              {c.previous}
            </button>
            <button
              className="primary"
              disabled={step === path.length - 1}
              onClick={() => {
                setPlaying(false);
                setStep((s) => s + 1);
              }}
            >
              {c.next}
              <ArrowRight size={15} />
            </button>
            <button
              className="lime-button"
              onClick={() => {
                if (step === path.length - 1) setStep(0);
                setPlaying((v) => !v);
              }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
              {playing ? c.pause : c.play}
            </button>
          </div>
        </Panel>
        <div className="forest-side">
          <Panel>
            <div className="section-title">
              <div>
                <h2>{c.profile}</h2>
                <p>{c.profileSub}</p>
              </div>
              <button
                className="icon-button"
                aria-label={c.reset}
                onClick={() => setProfile(defaultScenario)}
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="tree-profile">
              {fields.map((field) => (
                <label key={field.key}>
                  <span>
                    {language === "nl" ? nlNames[field.key] : field.label}
                  </span>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    disabled={
                      field.key === "avg_days_late" &&
                      profile.prior_late_rate === 0
                    }
                    value={profile[field.key]}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      if (!Number.isFinite(n)) return;
                      const value = Math.max(field.min, Math.min(field.max, n));
                      setProfile((p) => ({
                        ...p,
                        [field.key]: value,
                        ...(field.key === "prior_late_rate" && value === 0
                          ? { avg_days_late: 0 }
                          : {}),
                      }));
                    }}
                  />
                </label>
              ))}
            </div>
          </Panel>
          <Panel className="forest-summary">
            <GitBranch size={22} />
            <h2>{c.summary}</h2>
            <div
              className="forest-bars"
              role="img"
              aria-label={`220 ${language === "nl" ? "boomschattingen" : "tree estimates"}; ${c.average} ${pct(average, 1)}`}
            >
              {scores.map((p, i) => (
                <button
                  title={`${c.tree} ${i + 1}: ${pct(p, 1)}`}
                  aria-label={`${c.tree} ${i + 1}: ${pct(p, 1)}`}
                  key={i}
                  className={i === treeIndex ? "chosen-tree" : ""}
                  style={{ height: `${Math.max(3, p * 100)}%` }}
                  onClick={() => setTreeIndex(i)}
                />
              ))}
            </div>
            <div className="forest-score">
              <span>{c.average}</span>
              <strong>{pct(average, 1)}</strong>
            </div>
            <div className="single-tree-score">
              <span>
                {c.single} #{treeIndex + 1}
              </span>
              <b>{pct(scores[treeIndex], 1)}</b>
            </div>
          </Panel>
        </div>
      </div>
      <div className="learning-steps">
        {c.cards.map(([title, text], i) => (
          <section key={title}>
            <span>{i + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <details className="learn-technical">
        <summary>{c.details}</summary>
        <p>{c.technical}</p>
        <p>{c.limits}</p>
        <p>
          <code>forest_probability = sum(tree_leaf_probabilities) / 220</code>
        </p>
      </details>
      <div className="learn-limit">{c.limits}</div>
    </div>
  );
}
