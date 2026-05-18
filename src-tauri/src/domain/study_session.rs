use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct StudySession {
    pub id: Uuid,
    pub document_id: Uuid,
    pub started_at: i64,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct StudySessionSummary {
    pub session_id: Uuid,
    pub document_id: Uuid,
    pub started_at: i64,
    pub again_count: u32,
    pub hard_count: u32,
    pub easy_count: u32,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum StudySessionError {
    #[error("study session document id cannot be nil")]
    EmptyDocumentId,
}

impl StudySession {
    pub fn new(document_id: Uuid) -> Result<Self, StudySessionError> {
        Self::new_at(document_id, chrono::Utc::now().timestamp())
    }

    pub fn new_at(document_id: Uuid, started_at: i64) -> Result<Self, StudySessionError> {
        if document_id.is_nil() {
            return Err(StudySessionError::EmptyDocumentId);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            document_id,
            started_at,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{StudySession, StudySessionError, StudySessionSummary};
    use uuid::Uuid;

    #[test]
    fn creates_valid_study_session() {
        let document_id = Uuid::new_v4();

        let session = StudySession::new_at(document_id, 1_700_000_000).unwrap();

        assert_eq!(session.document_id, document_id);
        assert_eq!(session.started_at, 1_700_000_000);
    }

    #[test]
    fn rejects_empty_document_id() {
        let result = StudySession::new(Uuid::nil());

        assert_eq!(result.unwrap_err(), StudySessionError::EmptyDocumentId);
    }

    #[test]
    fn creates_study_session_summary() {
        let session_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();

        let summary = StudySessionSummary {
            session_id,
            document_id,
            started_at: 1_700_000_000,
            again_count: 1,
            hard_count: 2,
            easy_count: 3,
        };

        assert_eq!(summary.session_id, session_id);
        assert_eq!(summary.again_count + summary.hard_count + summary.easy_count, 6);
    }
}
