use chrono::Utc;
use serde::Deserialize;

use crate::{
    app::entitlement_guard::{EntitlementDecision, EntitlementGuard},
    infrastructure::storage::SQLiteStorage,
};

#[derive(Debug, Deserialize)]
pub struct CheckEntitlementRequest {
    pub key: String,
}

pub fn check_entitlement_with_storage(
    request: CheckEntitlementRequest,
    storage: &SQLiteStorage,
) -> Result<EntitlementDecision, String> {
    let key = request.key.trim();

    if key.is_empty() {
        return Err("Informe o recurso que deve ser validado.".to_owned());
    }

    let status = crate::commands::license::load_license_status_from_storage(storage)?;
    let guard = EntitlementGuard::new();

    Ok(guard.check(&status, key, Utc::now()))
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn check_entitlement(
    app_handle: tauri::AppHandle,
    request: CheckEntitlementRequest,
) -> Result<EntitlementDecision, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    check_entitlement_with_storage(request, &storage)
}

#[cfg(test)]
mod tests {
    use super::{check_entitlement_with_storage, CheckEntitlementRequest};
    use crate::{
        app::{
            entitlement_guard::{
                EntitlementDecisionReason, ENTITLEMENT_EXPORT_ANKI_APKG,
                ENTITLEMENT_EXPORT_ANKI_TSV,
            },
            license_service::sign_license_for_tests,
        },
        commands::license::{activate_license_with_storage, ActivateLicenseRequest},
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
                key: ENTITLEMENT_EXPORT_ANKI_APKG.to_owned(),
                limit: Some(20),
                expires_at: None,
            }],
            signature: String::new(),
        };
        license.signature = sign_license_for_tests(&license);

        serde_json::to_string(&license).unwrap()
    }

    #[test]
    fn allows_free_entitlement_without_license() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let decision = check_entitlement_with_storage(
            CheckEntitlementRequest {
                key: ENTITLEMENT_EXPORT_ANKI_TSV.to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert!(decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::FreeFeature);
    }

    #[test]
    fn blocks_pro_entitlement_without_license() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let decision = check_entitlement_with_storage(
            CheckEntitlementRequest {
                key: ENTITLEMENT_EXPORT_ANKI_APKG.to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert!(!decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::LicenseRequired);
    }

    #[test]
    fn allows_pro_entitlement_with_valid_license() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        activate_license_with_storage(
            ActivateLicenseRequest {
                license: signed_license_json(),
            },
            &storage,
        )
        .unwrap();

        let decision = check_entitlement_with_storage(
            CheckEntitlementRequest {
                key: ENTITLEMENT_EXPORT_ANKI_APKG.to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert!(decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::Entitled);
        assert_eq!(decision.limit, Some(20));
    }

    #[test]
    fn rejects_empty_entitlement_key() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = check_entitlement_with_storage(
            CheckEntitlementRequest {
                key: " ".to_owned(),
            },
            &storage,
        );

        assert_eq!(
            result.unwrap_err(),
            "Informe o recurso que deve ser validado."
        );
    }
}
