import type { StudyReview, StudyReviewRating } from "../../infrastructure/tauri/study-reviews";

interface StudyReviewHistoryProps {
  reviews: StudyReview[];
  labels: {
    title: string;
    summary: string;
    empty: string;
    ratingLabel: (rating: StudyReviewRating) => string;
    reviewItem: (review: StudyReview) => string;
  };
}

export function StudyReviewHistory({ reviews, labels }: StudyReviewHistoryProps) {
  const latestReviews = reviews.slice(-5).reverse();

  return (
    <section className="review-history" aria-labelledby="review-history-title">
      <h3 id="review-history-title">{labels.title}</h3>
      {reviews.length === 0 ? <p>{labels.empty}</p> : <p>{labels.summary}</p>}
      {latestReviews.length > 0 ? (
        <ul>
          {latestReviews.map((review) => (
            <li key={review.id}>
              <span>{labels.ratingLabel(review.rating)}</span>
              <strong>{labels.reviewItem(review)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
