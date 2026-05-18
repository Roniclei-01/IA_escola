import { FormEvent } from "react";

interface ImportPanelProps {
  filePath: string;
  isImporting: boolean;
  labels: {
    filePathLabel: string;
    filePathPlaceholder: string;
    chooseFile: string;
    import: string;
    importing: string;
  };
  onFilePathChange: (filePath: string) => void;
  onChooseFile: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ImportPanel({
  filePath,
  isImporting,
  labels,
  onFilePathChange,
  onChooseFile,
  onSubmit
}: ImportPanelProps) {
  return (
    <form className="import-panel" onSubmit={onSubmit}>
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
    </form>
  );
}
