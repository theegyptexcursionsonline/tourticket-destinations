// components/reviews/ReviewList.tsx
'use client';

import React, { useState } from 'react';
import { Star, UserCircle, Edit2, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Review } from '@/types';
import toast from 'react-hot-toast';

interface ReviewListProps {
  reviews: Review[];
  onReviewUpdated?: (updatedReview: Review) => void;
  onReviewDeleted?: (reviewId: string) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, onReviewUpdated, onReviewDeleted }) => {
  const { user, token } = useAuth();
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const startEdit = (review: Review) => {
    setEditingReview(review._id);
    setEditComment(review.comment || '');
    setEditRating(review.rating || 0);
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditComment('');
    setEditRating(0);
  };

  const handleUpdate = async (reviewId: string) => {
    if (!token || !editComment.trim() || editRating === 0) {
      toast.error('Please provide both rating and comment');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update review');
      }

      const { data: updatedReview } = await response.json();

      if (onReviewUpdated) {
        onReviewUpdated(updatedReview);
      }

      toast.success('Review updated successfully!');
      cancelEdit();
    } catch (error: any) {
      console.error('Update review error:', error);
      toast.error(error.message || 'Failed to update review');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!token) return;

    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete review');
      }

      if (onReviewDeleted) {
        onReviewDeleted(reviewId);
      }

      toast.success('Review deleted successfully!');
    } catch (error: any) {
      console.error('Delete review error:', error);
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setIsDeleting(null);
    }
  };

  const isReviewOwner = (review: Review) => {
    const reviewUser = review.user as any;
    return (
      user &&
      reviewUser &&
      (reviewUser._id === (user.id || (user as any)._id) || reviewUser.id === (user.id || (user as any)._id))
    );
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 px-4 text-gray-500">
        <p>No reviews yet for this tour. Be the first to leave a review!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">What our travelers are saying</h3>

      <div className="grid gap-4">
        {reviews.map((review) => (
          <article
            key={review._id}
            className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-5"
            aria-labelledby={`review-title-${review._id}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {(review.user as any)?.picture ? (
                  <img
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                    src={(review.user as any).picture}
                    alt={(review.user as any).name || 'Reviewer avatar'}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center ring-1 ring-gray-200">
                    <UserCircle className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p id={`review-title-${review._id}`} className="text-base font-semibold text-gray-900">
                      {(review.user as any)?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(review.createdAt as string)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Star Rating */}
                    {editingReview === review._id ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`Set rating ${star}`}
                            onClick={() => setEditRating(star)}
                            className={`p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 ${
                              star <= editRating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                            }`}
                          >
                            <Star className={`h-5 w-5 ${star <= editRating ? 'fill-current' : ''}`} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                            aria-hidden
                          />
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isReviewOwner(review) && (
                      <div className="flex items-center gap-2">
                        {editingReview === review._id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(review._id)}
                              disabled={isUpdating || editRating === 0 || !editComment.trim()}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-green-50 transition disabled:opacity-50"
                              title="Save changes"
                              aria-label="Save review"
                            >
                              <Save className="h-4 w-4 text-green-600" />
                            </button>

                            <button
                              onClick={cancelEdit}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-50 transition"
                              title="Cancel editing"
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(review)}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-blue-50 transition"
                              title="Edit review"
                              aria-label="Edit review"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </button>

                            <button
                              onClick={() => handleDelete(review._id)}
                              disabled={isDeleting === review._id}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                              title="Delete review"
                              aria-label="Delete review"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment / Edit area */}
                {editingReview === review._id ? (
                  <div className="mt-4">
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-6"
                      rows={4}
                      placeholder="Share your experience..."
                      maxLength={1000}
                      aria-label="Edit review comment"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500">{editComment.length}/1000 characters</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEdit}
                          disabled={isUpdating}
                          className="px-3 py-1 rounded-md text-sm bg-white border border-gray-200 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdate(review._id)}
                          disabled={isUpdating || editRating === 0 || !editComment.trim()}
                          className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {review.comment ? (
                      <p className="mt-3 text-gray-700 leading-relaxed text-sm">{review.comment}</p>
                    ) : (
                      <p className="mt-3 text-gray-500 italic text-sm">⭐ Rated this experience</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;
