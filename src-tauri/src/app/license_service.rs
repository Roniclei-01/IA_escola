use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::domain::{License, LicenseEntitlement, LicenseError, LicensePlan};

pub const TEST_LICENSE_PUBLIC_KEY: &str = "estudo-ia-local-test-public-key-v1";

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatusReason {
    Free,
    Valid,
    Expired,
    InvalidPayload,
    InvalidSignature,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct LicenseStatus {
    pub active: bool,
    pub plan: LicensePlan,
    pub reason: LicenseStatusReason,
    pub license_id: Option<String>,
    pub expires_at: Option<String>,
    pub entitlements: Vec<LicenseEntitlement>,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum LicenseServiceError {
    #[error("license payload is invalid")]
    InvalidPayload,
    #[error("license is expired")]
    Expired,
    #[error("license signature is invalid")]
    InvalidSignature,
}

pub trait LicenseSignatureVerifier {
    fn verify(&self, license: &License) -> bool;
}

pub struct LicenseService<V> {
    verifier: V,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TestLicenseSignatureVerifier {
    public_key: String,
}

impl<V> LicenseService<V>
where
    V: LicenseSignatureVerifier,
{
    pub fn new(verifier: V) -> Self {
        Self { verifier }
    }

    pub fn free_status(&self) -> LicenseStatus {
        free_status()
    }

    pub fn status_from_raw_license(
        &self,
        raw_license: Option<&str>,
        now: DateTime<Utc>,
    ) -> LicenseStatus {
        let Some(raw_license) = raw_license else {
            return self.free_status();
        };

        match self.validate_raw_license(raw_license, now) {
            Ok(license) => LicenseStatus {
                active: true,
                plan: license.plan,
                reason: LicenseStatusReason::Valid,
                license_id: Some(license.id),
                expires_at: license.expires_at,
                entitlements: license.entitlements,
            },
            Err(LicenseServiceError::Expired) => status_with_reason(LicenseStatusReason::Expired),
            Err(LicenseServiceError::InvalidSignature) => {
                status_with_reason(LicenseStatusReason::InvalidSignature)
            }
            Err(LicenseServiceError::InvalidPayload) => {
                status_with_reason(LicenseStatusReason::InvalidPayload)
            }
        }
    }

    pub fn validate_raw_license(
        &self,
        raw_license: &str,
        now: DateTime<Utc>,
    ) -> Result<License, LicenseServiceError> {
        let license: License =
            serde_json::from_str(raw_license).map_err(|_| LicenseServiceError::InvalidPayload)?;

        match license.ensure_active_at(now) {
            Ok(()) => {}
            Err(LicenseError::Expired) => return Err(LicenseServiceError::Expired),
            Err(_) => return Err(LicenseServiceError::InvalidPayload),
        }

        if !self.verifier.verify(&license) {
            return Err(LicenseServiceError::InvalidSignature);
        }

        Ok(license)
    }
}

impl TestLicenseSignatureVerifier {
    pub fn new(public_key: impl Into<String>) -> Self {
        Self {
            public_key: public_key.into(),
        }
    }

    fn signature_for_license(&self, license: &License) -> String {
        test_signature_for_payload(&license.canonical_payload(), &self.public_key)
    }
}

impl Default for TestLicenseSignatureVerifier {
    fn default() -> Self {
        Self::new(TEST_LICENSE_PUBLIC_KEY)
    }
}

impl LicenseSignatureVerifier for TestLicenseSignatureVerifier {
    fn verify(&self, license: &License) -> bool {
        license.signature == self.signature_for_license(license)
    }
}

pub fn default_license_service() -> LicenseService<TestLicenseSignatureVerifier> {
    LicenseService::new(TestLicenseSignatureVerifier::default())
}

fn free_status() -> LicenseStatus {
    LicenseStatus {
        active: false,
        plan: LicensePlan::Free,
        reason: LicenseStatusReason::Free,
        license_id: None,
        expires_at: None,
        entitlements: Vec::new(),
    }
}

fn status_with_reason(reason: LicenseStatusReason) -> LicenseStatus {
    LicenseStatus {
        reason,
        ..free_status()
    }
}

fn test_signature_for_payload(payload: &str, public_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(public_key.as_bytes());
    hasher.update(b":");
    hasher.update(payload.as_bytes());
    let digest = hasher.finalize();
    format!("test-sha256:{digest:x}")
}

#[cfg(test)]
pub fn sign_license_for_tests(license: &License) -> String {
    TestLicenseSignatureVerifier::default().signature_for_license(license)
}

#[cfg(test)]
mod tests {
    use super::{
        sign_license_for_tests, LicenseService, LicenseServiceError, LicenseStatusReason,
        TestLicenseSignatureVerifier,
    };
    use crate::domain::{License, LicenseEntitlement, LicensePlan};
    use chrono::{TimeZone, Utc};

    fn unsigned_license() -> License {
        License {
            id: "license-1".to_owned(),
            plan: LicensePlan::Pro,
            customer_email_hash: "email-hash".to_owned(),
            issued_at: "2026-05-20T00:00:00Z".to_owned(),
            expires_at: Some("2026-06-20T00:00:00Z".to_owned()),
            entitlements: vec![LicenseEntitlement {
                key: "cards.generate.multiple_choice".to_owned(),
                limit: Some(200),
                expires_at: None,
            }],
            signature: String::new(),
        }
    }

    fn signed_license_json() -> String {
        let mut license = unsigned_license();
        license.signature = sign_license_for_tests(&license);
        serde_json::to_string(&license).unwrap()
    }

    #[test]
    fn returns_free_status_without_license() {
        let service = LicenseService::new(TestLicenseSignatureVerifier::default());
        let now = Utc.with_ymd_and_hms(2026, 5, 21, 0, 0, 0).unwrap();

        let status = service.status_from_raw_license(None, now);

        assert_eq!(status.plan, LicensePlan::Free);
        assert_eq!(status.reason, LicenseStatusReason::Free);
        assert!(!status.active);
    }

    #[test]
    fn validates_signed_pro_license() {
        let service = LicenseService::new(TestLicenseSignatureVerifier::default());
        let now = Utc.with_ymd_and_hms(2026, 5, 21, 0, 0, 0).unwrap();

        let status = service.status_from_raw_license(Some(&signed_license_json()), now);

        assert_eq!(status.plan, LicensePlan::Pro);
        assert_eq!(status.reason, LicenseStatusReason::Valid);
        assert!(status.active);
        assert_eq!(status.entitlements[0].key, "cards.generate.multiple_choice");
    }

    #[test]
    fn rejects_invalid_signature() {
        let service = LicenseService::new(TestLicenseSignatureVerifier::default());
        let now = Utc.with_ymd_and_hms(2026, 5, 21, 0, 0, 0).unwrap();
        let mut license = unsigned_license();
        license.signature = "invalid".to_owned();
        let raw_license = serde_json::to_string(&license).unwrap();

        assert_eq!(
            service.validate_raw_license(&raw_license, now),
            Err(LicenseServiceError::InvalidSignature)
        );
    }

    #[test]
    fn marks_expired_license_as_inactive() {
        let service = LicenseService::new(TestLicenseSignatureVerifier::default());
        let now = Utc.with_ymd_and_hms(2026, 7, 1, 0, 0, 0).unwrap();

        let status = service.status_from_raw_license(Some(&signed_license_json()), now);

        assert_eq!(status.plan, LicensePlan::Free);
        assert_eq!(status.reason, LicenseStatusReason::Expired);
        assert!(!status.active);
    }
}
