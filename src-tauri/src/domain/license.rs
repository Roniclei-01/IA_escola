use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LicensePlan {
    Free,
    Pro,
    Lifetime,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct LicenseEntitlement {
    pub key: String,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(default)]
    pub expires_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct License {
    pub id: String,
    pub plan: LicensePlan,
    pub customer_email_hash: String,
    pub issued_at: String,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub entitlements: Vec<LicenseEntitlement>,
    pub signature: String,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum LicenseError {
    #[error("license id is required")]
    EmptyId,
    #[error("customer email hash is required")]
    EmptyCustomerEmailHash,
    #[error("issued_at is invalid")]
    InvalidIssuedAt,
    #[error("expires_at is invalid")]
    InvalidExpiresAt,
    #[error("license is expired")]
    Expired,
    #[error("license signature is missing")]
    EmptySignature,
}

impl License {
    pub fn validate_shape(&self) -> Result<(), LicenseError> {
        if self.id.trim().is_empty() {
            return Err(LicenseError::EmptyId);
        }

        if self.customer_email_hash.trim().is_empty() {
            return Err(LicenseError::EmptyCustomerEmailHash);
        }

        if self.signature.trim().is_empty() {
            return Err(LicenseError::EmptySignature);
        }

        parse_license_date(&self.issued_at).map_err(|_| LicenseError::InvalidIssuedAt)?;

        if let Some(expires_at) = &self.expires_at {
            parse_license_date(expires_at).map_err(|_| LicenseError::InvalidExpiresAt)?;
        }

        Ok(())
    }

    pub fn ensure_active_at(&self, now: DateTime<Utc>) -> Result<(), LicenseError> {
        self.validate_shape()?;

        if let Some(expires_at) = &self.expires_at {
            let expires_at =
                parse_license_date(expires_at).map_err(|_| LicenseError::InvalidExpiresAt)?;

            if expires_at <= now {
                return Err(LicenseError::Expired);
            }
        }

        Ok(())
    }

    pub fn canonical_payload(&self) -> String {
        let mut entitlements = self.entitlements.clone();
        entitlements.sort_by(|left, right| {
            (
                left.key.as_str(),
                left.limit,
                left.expires_at.as_deref().unwrap_or_default(),
            )
                .cmp(&(
                    right.key.as_str(),
                    right.limit,
                    right.expires_at.as_deref().unwrap_or_default(),
                ))
        });

        let entitlements = entitlements
            .iter()
            .map(|entitlement| {
                format!(
                    "{}:{}:{}",
                    entitlement.key.trim(),
                    entitlement
                        .limit
                        .map(|limit| limit.to_string())
                        .unwrap_or_default(),
                    entitlement.expires_at.as_deref().unwrap_or_default()
                )
            })
            .collect::<Vec<_>>()
            .join(",");

        format!(
            "{}|{}|{}|{}|{}|{}",
            self.id.trim(),
            self.plan.as_str(),
            self.customer_email_hash.trim(),
            self.issued_at.trim(),
            self.expires_at.as_deref().unwrap_or_default().trim(),
            entitlements
        )
    }
}

impl LicensePlan {
    pub fn as_str(&self) -> &'static str {
        match self {
            LicensePlan::Free => "free",
            LicensePlan::Pro => "pro",
            LicensePlan::Lifetime => "lifetime",
        }
    }
}

fn parse_license_date(value: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    DateTime::parse_from_rfc3339(value).map(|date| date.with_timezone(&Utc))
}

#[cfg(test)]
mod tests {
    use super::{License, LicenseEntitlement, LicenseError, LicensePlan};
    use chrono::{TimeZone, Utc};

    fn base_license() -> License {
        License {
            id: "license-1".to_owned(),
            plan: LicensePlan::Pro,
            customer_email_hash: "hash-1".to_owned(),
            issued_at: "2026-05-20T00:00:00Z".to_owned(),
            expires_at: Some("2026-06-20T00:00:00Z".to_owned()),
            entitlements: vec![LicenseEntitlement {
                key: "cards.generate.multiple_choice".to_owned(),
                limit: Some(100),
                expires_at: None,
            }],
            signature: "signature".to_owned(),
        }
    }

    #[test]
    fn accepts_active_license() {
        let license = base_license();
        let now = Utc.with_ymd_and_hms(2026, 5, 21, 0, 0, 0).unwrap();

        assert_eq!(license.ensure_active_at(now), Ok(()));
    }

    #[test]
    fn rejects_expired_license() {
        let license = base_license();
        let now = Utc.with_ymd_and_hms(2026, 7, 1, 0, 0, 0).unwrap();

        assert_eq!(license.ensure_active_at(now), Err(LicenseError::Expired));
    }

    #[test]
    fn canonical_payload_ignores_entitlement_order() {
        let mut first = base_license();
        first.entitlements.push(LicenseEntitlement {
            key: "export.anki.apkg".to_owned(),
            limit: None,
            expires_at: None,
        });

        let mut second = first.clone();
        second.entitlements.reverse();

        assert_eq!(first.canonical_payload(), second.canonical_payload());
    }
}
