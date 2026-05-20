use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, ExitStatus, Output},
    thread,
    time::{Duration, Instant},
};

use lopdf::Document as PdfDocument;
use thiserror::Error;

use crate::domain::{Document, DocumentError, DocumentSourceType, Language};

#[derive(Debug, Error, Eq, PartialEq)]
pub enum TextBookParserError {
    #[error("only .txt and .pdf files are supported")]
    UnsupportedExtension,
    #[error("study file does not exist")]
    FileNotFound,
    #[error("failed to read study file")]
    ReadFailed,
    #[error("failed to extract text from pdf")]
    PdfReadFailed,
    #[error("pdf appears to need ocr")]
    PdfNeedsOcr,
    #[error("ocr engine is not available")]
    OcrUnavailable,
    #[error(transparent)]
    InvalidDocument(#[from] DocumentError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TextBookParserOptions {
    pub ocr_enabled: bool,
    pub ocr_fallback_enabled: bool,
    pub pdf_text_extractor_path: PathBuf,
    pub ocr_engine: OcrEngineOptions,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OcrEngineOptions {
    pub pdftoppm_path: PathBuf,
    pub tesseract_path: PathBuf,
    pub language: String,
    pub resolution_dpi: u16,
    pub max_pages: Option<u32>,
    pub command_timeout_seconds: u64,
}

impl Default for TextBookParserOptions {
    fn default() -> Self {
        Self {
            ocr_enabled: false,
            ocr_fallback_enabled: false,
            pdf_text_extractor_path: PathBuf::from("pdftotext"),
            ocr_engine: OcrEngineOptions::default(),
        }
    }
}

impl Default for OcrEngineOptions {
    fn default() -> Self {
        Self {
            pdftoppm_path: PathBuf::from("pdftoppm"),
            tesseract_path: PathBuf::from("tesseract"),
            language: "por".to_owned(),
            resolution_dpi: 180,
            max_pages: Some(8),
            command_timeout_seconds: 90,
        }
    }
}

pub fn parse_text_book(
    book_id: uuid::Uuid,
    file_path: impl AsRef<Path>,
    language: Language,
) -> Result<Document, TextBookParserError> {
    parse_text_book_with_options(
        book_id,
        file_path,
        language,
        TextBookParserOptions::default(),
    )
}

pub fn parse_text_book_with_options(
    book_id: uuid::Uuid,
    file_path: impl AsRef<Path>,
    language: Language,
    options: TextBookParserOptions,
) -> Result<Document, TextBookParserError> {
    let path = file_path.as_ref();

    if !path.exists() {
        return Err(TextBookParserError::FileNotFound);
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);

    let (content, source_type) = match extension.as_deref() {
        Some("txt") => (
            fs::read_to_string(path).map_err(|_| TextBookParserError::ReadFailed)?,
            DocumentSourceType::Txt,
        ),
        Some("pdf") => (extract_pdf_text(path, &options)?, DocumentSourceType::Pdf),
        _ => return Err(TextBookParserError::UnsupportedExtension),
    };

    Document::new(
        book_id,
        content,
        language,
        source_type,
        path.to_string_lossy(),
    )
    .map_err(TextBookParserError::InvalidDocument)
}

fn extract_pdf_text(
    path: &Path,
    options: &TextBookParserOptions,
) -> Result<String, TextBookParserError> {
    if let Some(extracted_text) = extract_pdf_text_with_pdftotext(path, options) {
        return Ok(extracted_text);
    }

    let document = match PdfDocument::load(path) {
        Ok(document) => document,
        Err(_) if should_attempt_ocr(options) => {
            return extract_pdf_text_with_ocr(path, &options.ocr_engine);
        }
        Err(_) => return Err(TextBookParserError::PdfNeedsOcr),
    };
    let page_numbers = document.get_pages().keys().copied().collect::<Vec<_>>();

    let extracted_text = match document.extract_text(&page_numbers) {
        Ok(text) => text,
        Err(_) if should_attempt_ocr(options) => {
            return extract_pdf_text_with_ocr(path, &options.ocr_engine);
        }
        Err(_) => return Err(TextBookParserError::PdfNeedsOcr),
    };

    if extracted_text.trim().is_empty() {
        if should_attempt_ocr(options) {
            return extract_pdf_text_with_ocr(path, &options.ocr_engine);
        }

        return Err(TextBookParserError::PdfNeedsOcr);
    }

    Ok(extracted_text)
}

fn extract_pdf_text_with_pdftotext(path: &Path, options: &TextBookParserOptions) -> Option<String> {
    let output_path = std::env::temp_dir().join(format!(
        "estudo-ia-local-pdftotext-{}.txt",
        uuid::Uuid::new_v4()
    ));
    let mut command = Command::new(&options.pdf_text_extractor_path);
    command
        .arg("-layout")
        .arg(path)
        .arg(&output_path)
        .stderr(std::process::Stdio::null());

    let status = run_command_status_with_timeout(
        &mut command,
        Duration::from_secs(options.ocr_engine.command_timeout_seconds),
    )
    .ok()?;

    if !status.success() {
        let _ = fs::remove_file(&output_path);
        return None;
    }

    let raw_text = match fs::read_to_string(&output_path) {
        Ok(text) => text,
        Err(_) => {
            let _ = fs::remove_file(&output_path);
            return None;
        }
    };
    let text = raw_text.replace('\u{000c}', "\n").trim().to_owned();
    let _ = fs::remove_file(&output_path);

    if text.is_empty() {
        return None;
    }

    Some(text)
}

fn should_attempt_ocr(options: &TextBookParserOptions) -> bool {
    options.ocr_enabled || options.ocr_fallback_enabled
}

fn extract_pdf_text_with_ocr(
    path: &Path,
    engine: &OcrEngineOptions,
) -> Result<String, TextBookParserError> {
    let output_dir =
        std::env::temp_dir().join(format!("estudo-ia-local-ocr-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&output_dir).map_err(|_| TextBookParserError::OcrUnavailable)?;

    let output_prefix = output_dir.join("page");
    let mut raster_command = Command::new(&engine.pdftoppm_path);
    raster_command
        .arg("-png")
        .arg("-r")
        .arg(engine.resolution_dpi.to_string());

    if let Some(max_pages) = engine.max_pages {
        raster_command
            .arg("-f")
            .arg("1")
            .arg("-l")
            .arg(max_pages.to_string());
    }

    raster_command.arg(path).arg(&output_prefix);

    let command_timeout = Duration::from_secs(engine.command_timeout_seconds);
    let raster_status = run_command_status_with_timeout(&mut raster_command, command_timeout)?;

    if !raster_status.success() {
        let _ = fs::remove_dir_all(&output_dir);
        return Err(TextBookParserError::OcrUnavailable);
    }

    let mut page_images = fs::read_dir(&output_dir)
        .map_err(|_| TextBookParserError::OcrUnavailable)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|page_path| {
            page_path
                .extension()
                .and_then(|extension| extension.to_str())
                == Some("png")
        })
        .collect::<Vec<_>>();
    page_images.sort();

    if page_images.is_empty() {
        let _ = fs::remove_dir_all(&output_dir);
        return Err(TextBookParserError::OcrUnavailable);
    }

    let mut pages_text = Vec::new();

    for page_image in page_images {
        let output = run_command_output_with_timeout(
            Command::new(&engine.tesseract_path)
                .arg(&page_image)
                .arg("stdout")
                .arg("-l")
                .arg(&engine.language),
            command_timeout,
        )?;

        if !output.status.success() {
            let _ = fs::remove_dir_all(&output_dir);
            return Err(TextBookParserError::OcrUnavailable);
        }

        pages_text.push(String::from_utf8_lossy(&output.stdout).trim().to_owned());
    }

    let _ = fs::remove_dir_all(&output_dir);

    let text = pages_text.join("\n\n");

    if text.trim().is_empty() {
        return Err(TextBookParserError::InvalidDocument(
            DocumentError::EmptyContent,
        ));
    }

    Ok(text)
}

fn run_command_status_with_timeout(
    command: &mut Command,
    timeout: Duration,
) -> Result<ExitStatus, TextBookParserError> {
    let mut child = command
        .spawn()
        .map_err(|_| TextBookParserError::OcrUnavailable)?;
    let start = Instant::now();

    loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|_| TextBookParserError::OcrUnavailable)?
        {
            return Ok(status);
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(TextBookParserError::OcrUnavailable);
        }

        thread::sleep(Duration::from_millis(100));
    }
}

fn run_command_output_with_timeout(
    command: &mut Command,
    timeout: Duration,
) -> Result<Output, TextBookParserError> {
    let mut child = command
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|_| TextBookParserError::OcrUnavailable)?;
    let start = Instant::now();

    loop {
        if child
            .try_wait()
            .map_err(|_| TextBookParserError::OcrUnavailable)?
            .is_some()
        {
            return child
                .wait_with_output()
                .map_err(|_| TextBookParserError::OcrUnavailable);
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(TextBookParserError::OcrUnavailable);
        }

        thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    use lopdf::{
        content::{Content, Operation},
        dictionary, Document as PdfDocument, Object, Stream,
    };
    use tempfile::TempDir;
    use uuid::Uuid;

    use super::{
        parse_text_book, parse_text_book_with_options, TextBookParserError, TextBookParserOptions,
    };
    use crate::domain::{DocumentSourceType, Language};

    fn write_temp_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn parses_txt_file_into_document() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.txt", "Conteudo importado para estudo.");
        let book_id = Uuid::new_v4();

        let document = parse_text_book(book_id, &path, Language::Pt).unwrap();

        assert_eq!(document.book_id, book_id);
        assert_eq!(document.content, "Conteudo importado para estudo.");
        assert_eq!(document.language, Language::Pt);
        assert_eq!(document.source_type, DocumentSourceType::Txt);
        assert_eq!(document.source_path, path.to_string_lossy());
    }

    #[test]
    fn parses_pdf_file_into_document() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("book.pdf");
        write_pdf_file(&path, "Conteudo PDF importado.");
        let book_id = Uuid::new_v4();

        let document = parse_text_book(book_id, &path, Language::Pt).unwrap();

        assert_eq!(document.book_id, book_id);
        assert!(document.content.contains("Conteudo PDF importado."));
        assert_eq!(document.language, Language::Pt);
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
        assert_eq!(document.source_path, path.to_string_lossy());
    }

    #[cfg(unix)]
    #[test]
    fn prefers_pdftotext_for_pdf_text_extraction() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("book.pdf");
        let pdftotext_path = dir.path().join("pdftotext");
        write_pdf_file(&path, "Texto parcial via lopdf.");
        write_executable(
            &pdftotext_path,
            "#!/bin/sh\nprintf 'Texto completo via pdftotext.\\nPagina final.' > \"$3\"\n",
        );

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            path,
            Language::Pt,
            TextBookParserOptions {
                pdf_text_extractor_path: pdftotext_path,
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(
            document.content,
            "Texto completo via pdftotext.\nPagina final."
        );
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
    }

    #[cfg(unix)]
    #[test]
    fn extracts_large_pdf_text_without_stdout_pipe_truncation() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("large-book.pdf");
        let pdftotext_path = dir.path().join("pdftotext");
        write_pdf_file(&path, "Texto parcial via fallback.");
        write_executable(
            &pdftotext_path,
            "#!/bin/sh\ni=1\nwhile [ \"$i\" -le 12000 ]; do printf 'pagina-completa-%s ' \"$i\"; i=$((i + 1)); done > \"$3\"\n",
        );

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            path,
            Language::Pt,
            TextBookParserOptions {
                pdf_text_extractor_path: pdftotext_path,
                ..Default::default()
            },
        )
        .unwrap();

        assert!(document.content.contains("pagina-completa-12000"));
        assert!(!document.content.contains("Texto parcial via fallback."));
    }

    #[test]
    fn rejects_non_txt_file() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.md", "conteudo");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(
            result.unwrap_err(),
            TextBookParserError::UnsupportedExtension
        );
    }

    #[test]
    fn rejects_empty_txt_file() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "empty.txt", "   ");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert!(matches!(
            result.unwrap_err(),
            TextBookParserError::InvalidDocument(_)
        ));
    }

    #[test]
    fn asks_for_ocr_when_pdf_text_extraction_fails_without_ocr() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "empty.pdf", "%PDF-1.4");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(result.unwrap_err(), TextBookParserError::PdfNeedsOcr);
    }

    #[test]
    fn asks_for_ocr_when_pdf_has_no_extractable_text() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("scanned.pdf");
        write_pdf_file(&path, "");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(result.unwrap_err(), TextBookParserError::PdfNeedsOcr);
    }

    #[test]
    fn reports_unavailable_ocr_when_enabled_for_scanned_pdf() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("scanned.pdf");
        write_pdf_file(&path, "");

        let result = parse_text_book_with_options(
            Uuid::new_v4(),
            path,
            Language::Pt,
            TextBookParserOptions {
                ocr_enabled: true,
                ocr_fallback_enabled: false,
                ocr_engine: super::OcrEngineOptions {
                    pdftoppm_path: dir.path().join("missing-pdftoppm"),
                    tesseract_path: dir.path().join("missing-tesseract"),
                    language: "por".to_owned(),
                    ..Default::default()
                },
                ..Default::default()
            },
        );

        assert_eq!(result.unwrap_err(), TextBookParserError::OcrUnavailable);
    }

    #[cfg(unix)]
    #[test]
    fn extracts_pdf_text_with_configured_ocr_engine() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("scanned.pdf");
        let pdftoppm_path = dir.path().join("pdftoppm");
        let tesseract_path = dir.path().join("tesseract");
        write_pdf_file(&path, "");
        write_executable(
            &pdftoppm_path,
            "#!/bin/sh\nprefix=\"$9\"\ntouch \"${prefix}-1.png\"\n",
        );
        write_executable(
            &tesseract_path,
            "#!/bin/sh\nprintf 'Texto reconhecido por OCR.'\n",
        );

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            &path,
            Language::Pt,
            TextBookParserOptions {
                ocr_enabled: true,
                ocr_fallback_enabled: false,
                ocr_engine: super::OcrEngineOptions {
                    pdftoppm_path,
                    tesseract_path,
                    language: "por".to_owned(),
                    ..Default::default()
                },
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(document.content, "Texto reconhecido por OCR.");
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
    }

    #[cfg(unix)]
    #[test]
    fn falls_back_to_ocr_when_pdf_text_extraction_fails() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "broken-but-rasterizable.pdf", "%PDF-1.4");
        let pdftoppm_path = dir.path().join("pdftoppm");
        let tesseract_path = dir.path().join("tesseract");
        write_executable(
            &pdftoppm_path,
            "#!/bin/sh\nprefix=\"$9\"\ntouch \"${prefix}-1.png\"\n",
        );
        write_executable(
            &tesseract_path,
            "#!/bin/sh\nprintf 'Texto recuperado pelo OCR.'\n",
        );

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            &path,
            Language::Pt,
            TextBookParserOptions {
                ocr_enabled: true,
                ocr_fallback_enabled: false,
                ocr_engine: super::OcrEngineOptions {
                    pdftoppm_path,
                    tesseract_path,
                    language: "por".to_owned(),
                    ..Default::default()
                },
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(document.content, "Texto recuperado pelo OCR.");
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
    }

    #[cfg(unix)]
    #[test]
    fn uses_ocr_fallback_when_pdf_text_extraction_fails_without_forced_ocr() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "broken-but-rasterizable.pdf", "%PDF-1.4");
        let pdftoppm_path = dir.path().join("pdftoppm");
        let tesseract_path = dir.path().join("tesseract");
        write_executable(
            &pdftoppm_path,
            "#!/bin/sh\nprefix=\"$9\"\ntouch \"${prefix}-1.png\"\n",
        );
        write_executable(
            &tesseract_path,
            "#!/bin/sh\nprintf 'Texto importado pelo fallback OCR.'\n",
        );

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            &path,
            Language::Pt,
            TextBookParserOptions {
                ocr_enabled: false,
                ocr_fallback_enabled: true,
                ocr_engine: super::OcrEngineOptions {
                    pdftoppm_path,
                    tesseract_path,
                    language: "por".to_owned(),
                    ..Default::default()
                },
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(document.content, "Texto importado pelo fallback OCR.");
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
    }

    #[cfg(unix)]
    #[test]
    fn limits_ocr_rasterization_to_configured_initial_pages() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("scanned.pdf");
        let pdftoppm_path = dir.path().join("pdftoppm");
        let tesseract_path = dir.path().join("tesseract");
        write_pdf_file(&path, "");
        write_executable(
            &pdftoppm_path,
            "#!/bin/sh\n[ \"$3\" = \"150\" ] || exit 1\n[ \"$5\" = \"1\" ] || exit 1\n[ \"$7\" = \"2\" ] || exit 1\nprefix=\"$9\"\ntouch \"${prefix}-1.png\"\ntouch \"${prefix}-2.png\"\n",
        );
        write_executable(&tesseract_path, "#!/bin/sh\nprintf 'Pagina OCR\\n'\n");

        let document = parse_text_book_with_options(
            Uuid::new_v4(),
            &path,
            Language::Pt,
            TextBookParserOptions {
                ocr_enabled: true,
                ocr_fallback_enabled: false,
                ocr_engine: super::OcrEngineOptions {
                    pdftoppm_path,
                    tesseract_path,
                    language: "por".to_owned(),
                    resolution_dpi: 150,
                    max_pages: Some(2),
                    command_timeout_seconds: 5,
                },
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(document.content, "Pagina OCR\n\nPagina OCR");
        assert_eq!(document.source_type, DocumentSourceType::Pdf);
    }

    #[test]
    fn rejects_missing_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("missing.txt");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(result.unwrap_err(), TextBookParserError::FileNotFound);
    }

    fn write_pdf_file(path: &PathBuf, text: &str) {
        let mut document = PdfDocument::with_version("1.5");
        let pages_id = document.new_object_id();
        let font_id = document.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "Type1",
            "BaseFont" => "Helvetica"
        });
        let content = Content {
            operations: vec![
                Operation::new("BT", vec![]),
                Operation::new(
                    "Tf",
                    vec![Object::Name(b"F1".to_vec()), Object::Integer(12)],
                ),
                Operation::new("Td", vec![Object::Integer(72), Object::Integer(720)]),
                Operation::new("Tj", vec![Object::string_literal(text)]),
                Operation::new("ET", vec![]),
            ],
        };
        let content_id =
            document.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
        let page_id = document.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Contents" => content_id,
            "Resources" => dictionary! {
                "Font" => dictionary! {
                    "F1" => font_id
                }
            }
        });
        document.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![page_id.into()],
                "Count" => 1
            }),
        );
        let catalog_id = document.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id
        });
        document.trailer.set("Root", catalog_id);
        document.save(path).unwrap();
    }

    #[cfg(unix)]
    fn write_executable(path: &PathBuf, content: &str) {
        fs::write(path, content).unwrap();
        let mut permissions = fs::metadata(path).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(path, permissions).unwrap();
    }
}
