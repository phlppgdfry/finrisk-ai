export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";
export const REPOSITORY = "https://github.com/phlppgdfry/finrisk-ai";
export const asset = (path: string) =>
  import.meta.env.BASE_URL + path.replace(/^\//, "");
export function resource(
  name: "export" | "sample" | "model-card" | "source" | "docs",
) {
  if (!STATIC_DEMO) return name === "docs" ? "/docs" : "/api/" + name;
  return name === "export"
    ? asset("data/portfolio.csv")
    : name === "sample"
      ? asset("data/sample.csv")
      : name === "model-card"
        ? asset("reading/MODEL_CARD.md")
        : name === "source"
          ? REPOSITORY + "/archive/refs/heads/main.zip"
          : REPOSITORY + "#api";
}
