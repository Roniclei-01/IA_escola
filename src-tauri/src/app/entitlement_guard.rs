use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{
    app::license_service::LicenseStatus,
    domain::{LicenseEntitlement, LicensePlan},
};

pub const ENTITLEMENT_EXPORT_ANKI_APKG: &str = "export.anki.apkg";
pub const ENTITLEMENT_EXPORT_ANKI_TSV: &str = "export.anki.tsv";
pub const ENTITLEMENT_EXPORT_REPORT_MARKDOWN: &str = "export.report.markdown";
pub const ENTITLEMENT_EXPORT_REPORT_PDF: &str = "export.report.pdf";

const FREE_ENTITLEMENTS: &[&str] = &[
    "books.import.txt_pdf",
    "library.local",
    "reader.local",
    ENTITLEMENT_EXPORT_ANKI_TSV,
    ENTITLEMENT_EXPORT_REPORT_MARKDOWN,
];

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EntitlementDecisionReason {
    FreeFeature,
    Entitled,
    LicenseRequired,
    EntitlementMissing,
    EntitlementExpired,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct EntitlementDecision {
    pub key: String,
    pub allowed: bool,
    pub plan: LicensePlan,
    pub reason: EntitlementDecisionReason,
    pub limit: Option<u32>,
}

#[derive(Default)]
pub struct EntitlementGuard;

impl EntitlementGuard {
    pub fn new() -> Self {
        Self
    }

    pub fn check(
        &self,
        status: &LicenseStatus,
        entitlement_key: &str,
        now: DateTime<Utc>,
    ) -> EntitlementDecision {
        let key = entitlement_key.trim().to_owned();

        if FREE_ENTITLEMENTS.contains(&key.as_str()) {
            return allowed_decision(
                key,
                status.plan.clone(),
                EntitlementDecisionReason::FreeFeature,
                None,
            );
        }

        if !status.active {
            return denied_decision(
                key,
                status.plan.clone(),
                EntitlementDecisionReason::LicenseRequired,
            );
        }

        let Some(entitlement) = status
            .entitlements
            .iter()
            .find(|entitlement| entitlement.key.trim() == key)
        else {
            return denied_decision(
                key,
                status.plan.clone(),
                EntitlementDecisionReason::EntitlementMissing,
            );
        };

        if entitlement_is_expired(entitlement, now) {
            return denied_decision(
                key,
                status.plan.clone(),
                EntitlementDecisionReason::EntitlementExpired,
            );
        }

        allowed_decision(
            key,
            status.plan.clone(),
            EntitlementDecisionReason::Entitled,
            entitlement.limit,
        )
    }
}

fn entitlement_is_expired(entitlement: &LicenseEntitlement, now: DateTime<Utc>) -> bool {
    entitlement
        .expires_at
        .as_deref()
        .and_then(|expires_at| DateTime::parse_from_rfc3339(expires_at).ok())
        .map(|expires_at| expires_at.with_timezone(&Utc) <= now)
        .unwrap_or(false)
}

fn allowed_decision(
    key: String,
    plan: LicensePlan,
    reason: EntitlementDecisionReason,
    limit: Option<u32>,
) -> EntitlementDecision {
    EntitlementDecision {
        key,
        allowed: true,
        plan,
        reason,
        limit,
    }
}

fn denied_decision(
    key: String,
    plan: LicensePlan,
    reason: EntitlementDecisionReason,
) -> EntitlementDecision {
    EntitlementDecision {
        key,
        allowed: false,
        plan,
        reason,
        limit: None,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        EntitlementDecisionReason, EntitlementGuard, ENTITLEMENT_EXPORT_ANKI_APKG,
        ENTITLEMENT_EXPORT_ANKI_TSV,
    };
    use crate::{
        app::license_service::{LicenseStatus, LicenseStatusReason},
        domain::{LicenseEntitlement, LicensePlan},
    };
    use chrono::{TimeZone, Utc};

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

    fn pro_status(entitlements: Vec<LicenseEntitlement>) -> LicenseStatus {
        LicenseStatus {
            active: true,
            plan: LicensePlan::Pro,
            reason: LicenseStatusReason::Valid,
            license_id: Some("license-1".to_owned()),
            expires_at: Some("2099-01-01T00:00:00Z".to_owned()),
            entitlements,
        }
    }

    #[test]
    fn allows_free_entitlements_without_license() {
        let guard = EntitlementGuard::new();
        let now = Utc.with_ymd_and_hms(2026, 5, 20, 0, 0, 0).unwrap();

        let decision = guard.check(&free_status(), ENTITLEMENT_EXPORT_ANKI_TSV, now);

        assert!(decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::FreeFeature);
    }

    #[test]
    fn blocks_paid_entitlement_without_license() {
        let guard = EntitlementGuard::new();
        let now = Utc.with_ymd_and_hms(2026, 5, 20, 0, 0, 0).unwrap();

        let decision = guard.check(&free_status(), ENTITLEMENT_EXPORT_ANKI_APKG, now);

        assert!(!decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::LicenseRequired);
    }

    #[test]
    fn allows_paid_entitlement_for_active_license() {
        let guard = EntitlementGuard::new();
        let now = Utc.with_ymd_and_hms(2026, 5, 20, 0, 0, 0).unwrap();

        let decision = guard.check(
            &pro_status(vec![LicenseEntitlement {
                key: ENTITLEMENT_EXPORT_ANKI_APKG.to_owned(),
                limit: Some(20),
                expires_at: None,
            }]),
            ENTITLEMENT_EXPORT_ANKI_APKG,
            now,
        );

        assert!(decision.allowed);
        assert_eq!(decision.reason, EntitlementDecisionReason::Entitled);
        assert_eq!(decision.limit, Some(20));
    }

    #[test]
    fn blocks_expired_paid_entitlement() {
        let guard = EntitlementGuard::new();
        let now = Utc.with_ymd_and_hms(2026, 5, 20, 0, 0, 0).unwrap();

        let decision = guard.check(
            &pro_status(vec![LicenseEntitlement {
                key: ENTITLEMENT_EXPORT_ANKI_APKG.to_owned(),
                limit: None,
                expires_at: Some("2026-05-01T00:00:00Z".to_owned()),
            }]),
            ENTITLEMENT_EXPORT_ANKI_APKG,
            now,
        );

        assert!(!decision.allowed);
        assert_eq!(
            decision.reason,
            EntitlementDecisionReason::EntitlementExpired
        );
    }
}
