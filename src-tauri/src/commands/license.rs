use chrono::Utc;
use serde::Deserialize;

use crate::{
    app::license_service::{default_license_service, LicenseServiceError, LicenseStatus},
    infrastructure::storage::{SQLiteStorage, StorageError},
};

const LOCAL_LICENSE_KEY: &str = "license.local.v1";

#[derive(Debug, Deserialize)]
pub struct ActivateLicenseRequest {
    pub license: String,
}

pub fn load_license_status_from_storage(storage: &SQLiteStorage) -> Result<LicenseStatus, String> {
    let raw_license = storage
        .load_setting(LOCAL_LICENSE_KEY)
        .map_err(format_load_error)?;
    let service = default_license_service();

    Ok(service.status_from_raw_license(raw_license.as_deref(), Utc::now()))
}

pub fn activate_license_with_storage(
    request: ActivateLicenseRequest,
    storage: &SQLiteStorage,
) -> Result<LicenseStatus, String> {
    let raw_license = request.license.trim().to_owned();

    if raw_license.is_empty() {
        return Err("Informe a licenca.".to_owned());
    }

    let service = default_license_service();
    let status = service
        .validate_raw_license(&raw_license, Utc::now())
        .map(|license| LicenseStatus {
            active: true,
            plan: license.plan,
            reason: crate::app::license_service::LicenseStatusReason::Valid,
            license_id: Some(license.id),
            expires_at: license.expires_at,
            entitlements: license.entitlements,
        })
        .map_err(format_license_error)?;

    storage
        .save_setting(LOCAL_LICENSE_KEY, &raw_license)
        .map_err(format_save_error)?;

    Ok(status)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_license_status(app_handle: tauri::AppHandle) -> Result<LicenseStatus, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_license_status_from_storage(&storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn activate_license(
    app_handle: tauri::AppHandle,
    request: ActivateLicenseRequest,
) -> Result<LicenseStatus, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    activate_license_with_storage(request, &storage)
}

fn format_license_error(error: LicenseServiceError) -> String {
    match error {
        LicenseServiceError::Expired => "A licenca informada esta expirada.".to_owned(),
        LicenseServiceError::InvalidPayload => "A licenca informada nao e valida.".to_owned(),
        LicenseServiceError::InvalidSignature => {
            "A assinatura da licenca informada nao e valida.".to_owned()
        }
    }
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a licenca local.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a licenca local.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        activate_license_with_storage, load_license_status_from_storage, ActivateLicenseRequest,
    };
    use crate::{
        app::license_service::sign_license_for_tests,
        domain::{License, LicenseEntitlement, LicensePlan},
        infrastructure::storage::SQLiteStorage,
    };

    fn signed_license_json() -> String {
        let mut license = License {
            id: "license-1".to_owned(),
            plan: LicensePlan::Pro,
            customer_email_hash: "email-hash".to_owned(),
            issued_at: "2026-05-20T00:00:00Z".to_owned(),
            expires_at: Some("2099-01-01T00:00:00Z".to_owned()),
            entitlements: vec![LicenseEntitlement {
                key: "cards.generate.multiple_choice".to_owned(),
                limit: Some(200),
                expires_at: None,
            }],
            signature: String::new(),
        };
        license.signature = sign_license_for_tests(&license);

        serde_json::to_string(&license).unwrap()
    }

    #[test]
    fn loads_free_status_when_license_is_missing() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let status = load_license_status_from_storage(&storage).unwrap();

        assert_eq!(status.plan, LicensePlan::Free);
        assert!(!status.active);
    }

    #[test]
    fn activates_and_persists_valid_license() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let activated = activate_license_with_storage(
            ActivateLicenseRequest {
                license: signed_license_json(),
            },
            &storage,
        )
        .unwrap();
        let loaded = load_license_status_from_storage(&storage).unwrap();

        assert_eq!(activated.plan, LicensePlan::Pro);
        assert!(loaded.active);
        assert_eq!(loaded.plan, LicensePlan::Pro);
    }

    #[test]
    fn rejects_invalid_license_signature() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = activate_license_with_storage(
            ActivateLicenseRequest {
                license: r#"{"id":"license-1","plan":"pro","customer_email_hash":"hash","issued_at":"2026-05-20T00:00:00Z","expires_at":"2099-01-01T00:00:00Z","entitlements":[],"signature":"invalid"}"#.to_owned(),
            },
            &storage,
        );

        assert_eq!(
            result.unwrap_err(),
            "A assinatura da licenca informada nao e valida."
        );
    }
}
