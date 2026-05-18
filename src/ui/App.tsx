import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <p className="eyebrow">{t("app.stage")}</p>
        <h1 id="app-title">{t("app.title")}</h1>
        <p className="summary">{t("app.summary")}</p>
      </section>
    </main>
  );
}
