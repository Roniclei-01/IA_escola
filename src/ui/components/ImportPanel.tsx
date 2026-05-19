import { FormEvent, type ReactNode } from "react";

interface ImportPanelProps {
  filePath: string;
  isOcrEnabled: boolean;
  ocrLanguage: "por" | "eng" | "spa";
  isImporting: boolean;
  labels: {
    filePathLabel: string;
    filePathPlaceholder: string;
    ocrLabel: string;
    ocrLanguageLabel: string;
    ocrPortuguese: string;
    ocrEnglish: string;
    ocrSpanish: string;
    chooseFile: string;
    import: string;
    importing: string;
  };
  onFilePathChange: (filePath: string) => void;
  onOcrEnabledChange: (isEnabled: boolean) => void;
  onOcrLanguageChange: (language: "por" | "eng" | "spa") => void;
  onChooseFile: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
}

export function ImportPanel({
  filePath,
  isOcrEnabled,
  ocrLanguage,
  isImporting,
  labels,
  onFilePathChange,
  onOcrEnabledChange,
  onOcrLanguageChange,
  onChooseFile,
  onSubmit,
  children
}: ImportPanelProps) {
  return (
    <form className="import-panel" onSubmit={onSubmit}>
      {children}
      <label htmlFor="file-path">{labels.filePathLabel}</label>
      <div className="import-row">
        <input
          id="file-path"
          type="text"
          value={filePath}
          onChange={(event) => onFilePathChange(event.target.value)}
          placeholder={labels.filePathPlaceholder}
        />
        <button type="button" className="secondary-button" onClick={onChooseFile}>
          {labels.chooseFile}
        </button>
        <button type="submit" disabled={isImporting}>
          {isImporting ? labels.importing : labels.import}
        </button>
      </div>
      <label className="ocr-option">
        <input
          type="checkbox"
          checked={isOcrEnabled}
          onChange={(event) => onOcrEnabledChange(event.target.checked)}
        />
        {labels.ocrLabel}
      </label>
      <div className="ocr-language-row">
        <label htmlFor="ocr-language">{labels.ocrLanguageLabel}</label>
        <select
          id="ocr-language"
          value={ocrLanguage}
          disabled={!isOcrEnabled}
          onChange={(event) => onOcrLanguageChange(event.target.value as "por" | "eng" | "spa")}
        >
          <option value="por">{labels.ocrPortuguese}</option>
          <option value="eng">{labels.ocrEnglish}</option>
          <option value="spa">{labels.ocrSpanish}</option>
        </select>
      </div>
    </form>
  );
}
