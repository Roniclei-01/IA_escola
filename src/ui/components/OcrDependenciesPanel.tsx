import type { OcrDependencies } from "../../infrastructure/tauri/ocr-dependencies";

interface OcrDependenciesPanelProps {
  dependencies: OcrDependencies | null;
  isLoading: boolean;
  labels: {
    title: string;
    loading: string;
    ready: string;
    missing: string;
    install: string;
    pdftoppmAvailable: string;
    pdftoppmMissing: string;
    tesseractAvailable: string;
    tesseractMissing: string;
  };
}

export function OcrDependenciesPanel({
  dependencies,
  isLoading,
  labels
}: OcrDependenciesPanelProps) {
  const isReady =
    Boolean(dependencies?.pdftoppm_available) && Boolean(dependencies?.tesseract_available);

  return (
    <section className="ocr-dependencies" aria-labelledby="ocr-dependencies-title">
      <h2 id="ocr-dependencies-title">{labels.title}</h2>
      {isLoading ? <p>{labels.loading}</p> : null}
      {!isLoading && dependencies ? (
        <>
          <p className={isReady ? "message success" : "message warning"}>
            {isReady ? labels.ready : labels.missing}
          </p>
          <ul>
            <li>
              {dependencies.pdftoppm_available
                ? labels.pdftoppmAvailable
                : labels.pdftoppmMissing}
            </li>
            <li>
              {dependencies.tesseract_available
                ? labels.tesseractAvailable
                : labels.tesseractMissing}
            </li>
          </ul>
          {!isReady ? <p className="ocr-install-command">{labels.install}</p> : null}
        </>
      ) : null}
    </section>
  );
}
