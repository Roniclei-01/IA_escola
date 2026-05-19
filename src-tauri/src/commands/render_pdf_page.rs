use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, ExitStatus, Output},
    thread,
    time::{Duration, Instant},
};

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct RenderPdfPageRequest {
    pub file_path: String,
    pub page: u32,
    pub dpi: Option<u16>,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct RenderPdfPageResponse {
    pub page: u32,
    pub page_count: u32,
    pub image_data_url: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenderPdfPageOptions {
    pub pdfinfo_path: PathBuf,
    pub pdftoppm_path: PathBuf,
    pub command_timeout_seconds: u64,
}

impl Default for RenderPdfPageOptions {
    fn default() -> Self {
        Self {
            pdfinfo_path: PathBuf::from("pdfinfo"),
            pdftoppm_path: PathBuf::from("pdftoppm"),
            command_timeout_seconds: 45,
        }
    }
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum RenderPdfPageError {
    #[error("study file does not exist")]
    FileNotFound,
    #[error("only .pdf files can be rendered")]
    UnsupportedExtension,
    #[error("pdf page must be greater than zero")]
    InvalidPage,
    #[error("could not inspect pdf pages")]
    PdfInfoUnavailable,
    #[error("requested page is outside the pdf range")]
    PageOutOfRange,
    #[error("could not render pdf page")]
    PdfRenderUnavailable,
}

pub fn render_pdf_page_from_request(
    request: RenderPdfPageRequest,
) -> Result<RenderPdfPageResponse, String> {
    render_pdf_page_with_options(request, RenderPdfPageOptions::default()).map_err(format_error)
}

pub fn render_pdf_page_with_options(
    request: RenderPdfPageRequest,
    options: RenderPdfPageOptions,
) -> Result<RenderPdfPageResponse, RenderPdfPageError> {
    let path = PathBuf::from(request.file_path.trim());

    if !path.exists() {
        return Err(RenderPdfPageError::FileNotFound);
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    if extension.as_deref() != Some("pdf") {
        return Err(RenderPdfPageError::UnsupportedExtension);
    }

    if request.page == 0 {
        return Err(RenderPdfPageError::InvalidPage);
    }

    let timeout = Duration::from_secs(options.command_timeout_seconds);
    let page_count = read_pdf_page_count(&path, &options, timeout)?;
    if request.page > page_count {
        return Err(RenderPdfPageError::PageOutOfRange);
    }

    let dpi = request.dpi.unwrap_or(144).clamp(72, 220);
    let image_bytes = render_pdf_page_image(&path, request.page, dpi, &options, timeout)?;

    Ok(RenderPdfPageResponse {
        page: request.page,
        page_count,
        image_data_url: format!(
            "data:image/png;base64,{}",
            general_purpose::STANDARD.encode(image_bytes)
        ),
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub async fn render_pdf_page(
    request: RenderPdfPageRequest,
) -> Result<RenderPdfPageResponse, String> {
    tauri::async_runtime::spawn_blocking(move || render_pdf_page_from_request(request))
        .await
        .map_err(|_| "Nao foi possivel renderizar a pagina do PDF.".to_owned())?
}

fn read_pdf_page_count(
    path: &Path,
    options: &RenderPdfPageOptions,
    timeout: Duration,
) -> Result<u32, RenderPdfPageError> {
    let output = run_command_output_with_timeout(
        Command::new(&options.pdfinfo_path).arg(path),
        timeout,
        RenderPdfPageError::PdfInfoUnavailable,
    )?;

    if !output.status.success() {
        return Err(RenderPdfPageError::PdfInfoUnavailable);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find_map(|line| {
            line.trim()
                .strip_prefix("Pages:")
                .and_then(|value| value.trim().parse::<u32>().ok())
        })
        .filter(|page_count| *page_count > 0)
        .ok_or(RenderPdfPageError::PdfInfoUnavailable)
}

fn render_pdf_page_image(
    path: &Path,
    page: u32,
    dpi: u16,
    options: &RenderPdfPageOptions,
    timeout: Duration,
) -> Result<Vec<u8>, RenderPdfPageError> {
    let output_prefix =
        std::env::temp_dir().join(format!("estudo-ia-local-pdf-page-{}", uuid::Uuid::new_v4()));
    let output_path = output_prefix.with_extension("png");

    let status = run_command_status_with_timeout(
        Command::new(&options.pdftoppm_path)
            .arg("-png")
            .arg("-singlefile")
            .arg("-f")
            .arg(page.to_string())
            .arg("-l")
            .arg(page.to_string())
            .arg("-r")
            .arg(dpi.to_string())
            .arg(path)
            .arg(&output_prefix),
        timeout,
        RenderPdfPageError::PdfRenderUnavailable,
    )?;

    if !status.success() {
        let _ = fs::remove_file(&output_path);
        return Err(RenderPdfPageError::PdfRenderUnavailable);
    }

    let image_bytes =
        fs::read(&output_path).map_err(|_| RenderPdfPageError::PdfRenderUnavailable)?;
    let _ = fs::remove_file(&output_path);

    if image_bytes.is_empty() {
        return Err(RenderPdfPageError::PdfRenderUnavailable);
    }

    Ok(image_bytes)
}

fn run_command_output_with_timeout(
    command: &mut Command,
    timeout: Duration,
    error: RenderPdfPageError,
) -> Result<Output, RenderPdfPageError> {
    let mut child = command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|_| error.clone())?;
    let start = Instant::now();

    loop {
        if child.try_wait().map_err(|_| error.clone())?.is_some() {
            return child.wait_with_output().map_err(|_| error);
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }

        thread::sleep(Duration::from_millis(100));
    }
}

fn run_command_status_with_timeout(
    command: &mut Command,
    timeout: Duration,
    error: RenderPdfPageError,
) -> Result<ExitStatus, RenderPdfPageError> {
    let mut child = command
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|_| error.clone())?;
    let start = Instant::now();

    loop {
        if let Some(status) = child.try_wait().map_err(|_| error.clone())? {
            return Ok(status);
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }

        thread::sleep(Duration::from_millis(100));
    }
}

fn format_error(error: RenderPdfPageError) -> String {
    match error {
        RenderPdfPageError::FileNotFound => "Arquivo PDF nao encontrado.".to_owned(),
        RenderPdfPageError::UnsupportedExtension => {
            "Apenas arquivos PDF podem ser exibidos no leitor visual.".to_owned()
        }
        RenderPdfPageError::InvalidPage => "A pagina do PDF deve ser maior que zero.".to_owned(),
        RenderPdfPageError::PdfInfoUnavailable => {
            "Nao foi possivel identificar as paginas do PDF.".to_owned()
        }
        RenderPdfPageError::PageOutOfRange => "A pagina solicitada nao existe no PDF.".to_owned(),
        RenderPdfPageError::PdfRenderUnavailable => {
            "Nao foi possivel renderizar a pagina do PDF.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    use tempfile::TempDir;

    use super::{
        render_pdf_page_with_options, RenderPdfPageError, RenderPdfPageOptions,
        RenderPdfPageRequest,
    };

    #[cfg(unix)]
    #[test]
    fn renders_pdf_page_as_data_url() {
        let dir = TempDir::new().unwrap();
        let pdf_path = write_temp_file(&dir, "book.pdf", "%PDF-1.6");
        let pdfinfo_path = dir.path().join("pdfinfo");
        let pdftoppm_path = dir.path().join("pdftoppm");
        write_executable(&pdfinfo_path, "#!/bin/sh\nprintf 'Pages: 12\\n'\n");
        write_executable(
            &pdftoppm_path,
            "#!/bin/sh\nprefix=\"${10}\"\nprintf 'PNGDATA' > \"${prefix}.png\"\n",
        );

        let response = render_pdf_page_with_options(
            RenderPdfPageRequest {
                file_path: pdf_path.to_string_lossy().to_string(),
                page: 3,
                dpi: Some(180),
            },
            RenderPdfPageOptions {
                pdfinfo_path,
                pdftoppm_path,
                command_timeout_seconds: 5,
            },
        )
        .unwrap();

        assert_eq!(response.page, 3);
        assert_eq!(response.page_count, 12);
        assert_eq!(
            response.image_data_url,
            "data:image/png;base64,UE5HREFUQQ=="
        );
    }

    #[test]
    fn rejects_non_pdf_files() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.txt", "texto");

        let result = render_pdf_page_with_options(
            RenderPdfPageRequest {
                file_path: path.to_string_lossy().to_string(),
                page: 1,
                dpi: None,
            },
            RenderPdfPageOptions::default(),
        );

        assert_eq!(
            result.unwrap_err(),
            RenderPdfPageError::UnsupportedExtension
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_page_out_of_range() {
        let dir = TempDir::new().unwrap();
        let pdf_path = write_temp_file(&dir, "book.pdf", "%PDF-1.6");
        let pdfinfo_path = dir.path().join("pdfinfo");
        let pdftoppm_path = dir.path().join("pdftoppm");
        write_executable(&pdfinfo_path, "#!/bin/sh\nprintf 'Pages: 2\\n'\n");
        write_executable(&pdftoppm_path, "#!/bin/sh\nexit 1\n");

        let result = render_pdf_page_with_options(
            RenderPdfPageRequest {
                file_path: pdf_path.to_string_lossy().to_string(),
                page: 3,
                dpi: None,
            },
            RenderPdfPageOptions {
                pdfinfo_path,
                pdftoppm_path,
                command_timeout_seconds: 5,
            },
        );

        assert_eq!(result.unwrap_err(), RenderPdfPageError::PageOutOfRange);
    }

    fn write_temp_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[cfg(unix)]
    fn write_executable(path: &PathBuf, content: &str) {
        fs::write(path, content).unwrap();
        let mut permissions = fs::metadata(path).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(path, permissions).unwrap();
    }
}
