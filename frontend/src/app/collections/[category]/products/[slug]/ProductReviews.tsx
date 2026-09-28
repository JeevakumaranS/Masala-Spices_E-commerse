"use client";

import { FormEvent, useEffect, useState } from "react";
import { StarIcon } from "@/components/ui/icons";
import { apiClient, getApiErrorMessage } from "@/lib/http";
import type { Product } from "@/lib/types";

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function ProductReviews({ product }: { product: Product }) {
  const pageSize = 3;
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const loadReviews = async () => {
      try {
        const response = await apiClient.get<{
          items?: Review[];
          total_count?: number;
          average_rating?: number;
        }>(
          `/api/products/${product.id}/reviews`,
          { params: { limit: pageSize, offset: 0 } },
        );
        if (!cancelled) {
          setReviews(response.data.items ?? []);
          setTotalReviews(response.data.total_count ?? 0);
          setAverageRating(response.data.average_rating ?? 0);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(error, "Reviews could not be loaded."));
        }
      }
    };
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [pageSize, product.id]);

  const showMoreReviews = async () => {
    setLoadingMore(true);
    setLoadError("");
    try {
      const response = await apiClient.get<{ items?: Review[] }>(
        `/api/products/${product.id}/reviews`,
        { params: { limit: pageSize, offset: reviews.length } },
      );
      setReviews((current) => [...current, ...(response.data.items ?? [])]);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "More reviews could not be loaded."));
    } finally {
      setLoadingMore(false);
    }
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setNotice("");
    try {
      await apiClient.post(`/api/products/${product.id}/reviews`, {
      reviewer_name: reviewerName.trim(),
      rating,
      comment: comment.trim(),
      });
      setNotice("Thank you — your review has been submitted for moderation.");
      setReviewerName("");
      setComment("");
      setRating(0);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Review could not be submitted."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-y border-paper-200 bg-white py-14 md:py-20">
      <div className="shell grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <div>
          <p className="eyebrow">Reviews &amp; ratings</p>
          <h2 className="section-title mt-3">What the kitchen says</h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="font-display text-5xl font-semibold text-ink-950">
              {averageRating ? averageRating.toFixed(1) : "—"}
            </span>
            <div>
              <div className="flex gap-0.5 text-saffron-500" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} className={star <= Math.round(averageRating) ? "size-5 fill-current" : "size-5"} />
                ))}
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {totalReviews ? `${totalReviews} verified reviews` : "Be the first to review this blend"}
              </p>
            </div>
          </div>
          {loadError ? <p role="alert" className="mt-3 text-sm text-chili-700">{loadError}</p> : null}
          {reviews.length ? (
            <ul className="mt-7 space-y-4">
              {reviews.map((review) => (
                <li key={review.id} className="border-t border-paper-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink-800">{review.reviewer_name}</p>
                    <span className="text-sm font-medium text-saffron-600">{review.rating} / 5</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{review.comment}</p>
                  <p className="mt-1 text-xs text-ink-400">{new Date(review.created_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {reviews.length < totalReviews ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-5"
              onClick={() => void showMoreReviews()}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading reviews…" : "Show more"}
            </button>
          ) : null}
        </div>

        <form className="panel p-5 sm:p-6" onSubmit={submitReview}>
          <p className="font-display text-xl font-semibold text-ink-950">Share your experience</p>
          <p className="mt-1 text-sm text-ink-500">Reviews appear here after admin moderation.</p>
          <label htmlFor="reviewer-name" className="field-label mt-5 block">Your name</label>
          <input
            id="reviewer-name"
            className="input mt-1"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={reviewerName}
            onChange={(event) => setReviewerName(event.target.value)}
          />
          <fieldset className="mt-4">
            <legend className="field-label">Your rating</legend>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                  aria-pressed={rating === star}
                >
                  <StarIcon className={star <= rating ? "size-6 fill-saffron-400 text-saffron-400" : "size-6 text-ink-300"} />
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="review-comment" className="field-label mt-4 block">Your review</label>
          <textarea
            id="review-comment"
            className="input mt-1 min-h-28"
            minLength={2}
            maxLength={3000}
            required
            placeholder="What did you cook?"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          {submitError ? <p role="alert" className="mt-3 text-sm text-chili-700">{submitError}</p> : null}
          {notice ? <p role="status" className="mt-3 text-sm font-medium text-cardamom-700">{notice}</p> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">Your review is checked before publication.</p>
            <button type="submit" className="btn btn-primary" disabled={!rating || submitting}>
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
