import { ArrowRight, GitBranch } from "lucide-react";
import { asset } from "./runtime";
export function OverviewHero({
  onExplore,
  onLearn,
}: {
  onExplore: () => void;
  onLearn: () => void;
}) {
  return (
    <section className="overview-hero">
      <div className="hero-copy">
        <h1>
          See the risk.
          <br />
          Understand the why.
        </h1>
        <p>An invoice-risk workbench powered by 220 real decision trees.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onExplore}>
            Explore an invoice <ArrowRight size={17} />
          </button>
          <button className="secondary" onClick={onLearn}>
            <GitBranch size={16} />
            How the forest works
          </button>
        </div>
      </div>
      <figure className="hero-art">
        <img
          src={asset("images/forest-glass.png")}
          width="1536"
          height="1024"
          alt="An AI-generated glass decision-tree sculpture with green branches and lime endpoints"
          fetchPriority="high"
        />
        <figcaption>Many paths. One clearer perspective.</figcaption>
      </figure>
    </section>
  );
}
