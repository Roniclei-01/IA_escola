import { FormEvent } from "react";

interface OllamaSettingsPanelProps {
  baseUrl: string;
  model: string;
  isTesting: boolean;
  status: string | null;
  labels: {
    title: string;
    baseUrlLabel: string;
    modelLabel: string;
    test: string;
    testing: string;
  };
  onBaseUrlChange: (baseUrl: string) => void;
  onModelChange: (model: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OllamaSettingsPanel({
  baseUrl,
  model,
  isTesting,
  status,
  labels,
  onBaseUrlChange,
  onModelChange,
  onSubmit
}: OllamaSettingsPanelProps) {
  return (
    <section className="settings-panel" aria-labelledby="ollama-settings-title">
      <h2 id="ollama-settings-title">{labels.title}</h2>
      <form className="settings-form" onSubmit={onSubmit}>
        <label htmlFor="ollama-base-url">{labels.baseUrlLabel}</label>
        <input
          id="ollama-base-url"
          type="text"
          value={baseUrl}
          onChange={(event) => onBaseUrlChange(event.target.value)}
        />

        <label htmlFor="ollama-model">{labels.modelLabel}</label>
        <div className="settings-row">
          <input
            id="ollama-model"
            type="text"
            list="ollama-model-options"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
          />
          <datalist id="ollama-model-options">
            <option value="llama3.2:1b" />
          </datalist>
          <button type="submit" disabled={isTesting}>
            {isTesting ? labels.testing : labels.test}
          </button>
        </div>
      </form>
      {status ? <p className="message success">{status}</p> : null}
    </section>
  );
}
