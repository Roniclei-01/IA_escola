use std::{fs, path::Path};

use serde::Serialize;

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct ExportTextFileResponse {
    pub file_path: String,
}

pub fn export_text_file_to_path(
    file_path: &str,
    content: &str,
) -> Result<ExportTextFileResponse, String> {
    let trimmed_file_path = file_path.trim();

    if trimmed_file_path.is_empty() {
        return Err("Informe o caminho para exportar o arquivo.".to_owned());
    }

    fs::write(Path::new(trimmed_file_path), content)
        .map_err(|_| "Nao foi possivel exportar o arquivo.".to_owned())?;

    Ok(ExportTextFileResponse {
        file_path: trimmed_file_path.to_owned(),
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn export_text_file(
    file_path: String,
    content: String,
) -> Result<ExportTextFileResponse, String> {
    export_text_file_to_path(&file_path, &content)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::export_text_file_to_path;

    #[test]
    fn writes_text_file_to_requested_path() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("anki-deck.tsv");

        let response =
            export_text_file_to_path(file_path.to_str().unwrap(), "frente\tverso\n").unwrap();

        assert_eq!(response.file_path, file_path.to_str().unwrap());
        assert_eq!(fs::read_to_string(file_path).unwrap(), "frente\tverso\n");
    }

    #[test]
    fn rejects_empty_file_path() {
        let error = export_text_file_to_path("   ", "conteudo").unwrap_err();

        assert_eq!(error, "Informe o caminho para exportar o arquivo.");
    }
}
