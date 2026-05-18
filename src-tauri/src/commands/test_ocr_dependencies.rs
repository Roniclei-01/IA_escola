#[cfg(feature = "tauri-app")]
use std::process::Command;

use serde::Serialize;

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct TestOcrDependenciesResponse {
    pub pdftoppm_available: bool,
    pub tesseract_available: bool,
}

impl TestOcrDependenciesResponse {
    pub fn is_ready(&self) -> bool {
        self.pdftoppm_available && self.tesseract_available
    }
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn test_ocr_dependencies() -> Result<TestOcrDependenciesResponse, String> {
    Ok(test_ocr_dependencies_with_checker(command_is_available))
}

pub fn test_ocr_dependencies_with_checker(
    checker: impl Fn(&str, &[&str]) -> bool,
) -> TestOcrDependenciesResponse {
    TestOcrDependenciesResponse {
        pdftoppm_available: checker("pdftoppm", &["-v"]),
        tesseract_available: checker("tesseract", &["--version"]),
    }
}

#[cfg(feature = "tauri-app")]
fn command_is_available(command: &str, args: &[&str]) -> bool {
    Command::new(command)
        .args(args)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::test_ocr_dependencies_with_checker;

    #[test]
    fn reports_ready_when_dependencies_are_available() {
        let response = test_ocr_dependencies_with_checker(|_command, _args| true);

        assert!(response.is_ready());
        assert!(response.pdftoppm_available);
        assert!(response.tesseract_available);
    }

    #[test]
    fn reports_missing_tesseract() {
        let response = test_ocr_dependencies_with_checker(|command, _args| command == "pdftoppm");

        assert!(!response.is_ready());
        assert!(response.pdftoppm_available);
        assert!(!response.tesseract_available);
    }
}
