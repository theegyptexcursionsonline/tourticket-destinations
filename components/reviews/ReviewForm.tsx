// components/reviews/ReviewForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Loader2, User, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import LoginModal from '@/components/auth/LoginModal';
import SignupModal from '@/components/auth/SignupModal';

interface ReviewFormProps {
  tourId: string;
  onReviewSubmitted: (newReview: any) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ tourId, onReviewSubmitted }) => {
  const { user, isAuthenticated, token, isLoading } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState<any>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setSignupModalOpen] = useState(false);

  // Check if user has already reviewed this tour
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!isAuthenticated || !user || !token) {
        setIsCheckingExisting(false);
        return;
      }

      try {
        const response = await fetch(`/api/tours/${tourId}/reviews/check`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasReview) {
            setHasExistingReview(data.review);
          }
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    checkExistingReview();
  }, [isAuthenticated, user, token, tourId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    // Comment is optional, but if provided, must be at least 10 characters
    if (comment.trim() && comment.trim().length < 10) {
      toast.error('Review comment must be at least 10 characters if provided.');
      return;
    }

    if (!token) {
      toast.error('Authentication error. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tours/${tourId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          rating, 
          comment: comment.trim(),
          title: title.trim() || 'Great experience!'
        }),
      });

      let data;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (!response.ok) {
        if (response.status === 409) {
          // User already has a review - this shouldn't happen with our check, but just in case
          setIsCheckingExisting(true);
          // Re-check for existing review
          const checkResponse = await fetch(`/api/tours/${tourId}/reviews/check`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.hasReview) {
              setHasExistingReview(checkData.review);
            }
          }
          setIsCheckingExisting(false);
          throw new Error('You have already reviewed this tour. Please edit your existing review above.');
        } else if (response.status === 401) {
          throw new Error('Please log in to submit a review.');
        } else if (response.status === 404) {
          throw new Error('Tour not found.');
        } else {
          throw new Error(data?.error || `Server error (${response.status})`);
        }
      }

      if (data.success) {
        toast.success(data.message || 'Thank you for your review!');
        
        if (data.data) {
          onReviewSubmitted(data.data);
        }
        
        // Reset form
        setRating(0);
        setHoverRating(0);
        setComment('');
        setTitle('');
      } else {
        throw new Error(data.error || 'Failed to submit review');
      }

    } catch (error: any) {
      console.error('Review submission error:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // While checking for existing review or auth state
  if (isLoading || isCheckingExisting) {
    return (
      <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-8 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // If user already has a review, show a message pointing to the existing review
  if (hasExistingReview) {
    return (
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit2 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">You've Already Reviewed This Tour</h3>
          <p className="text-gray-600 mb-4">
            You submitted a review on {new Date(hasExistingReview.createdAt).toLocaleDateString()}.
          </p>
          <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
            <div className="flex items-center gap-1 justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= hasExistingReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 font-semibold text-gray-700">{hasExistingReview.rating}/5</span>
            </div>
            {hasExistingReview.title && (
              <h4 className="font-semibold text-gray-800 mb-1">{hasExistingReview.title}</h4>
            )}
            <p className="text-sm text-gray-700 italic">"{hasExistingReview.comment}"</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Edit2 size={16} />
            <p className="text-sm font-medium">
              To edit or delete your review, use the edit button next to your review above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <>
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Share Your Experience</h3>
            <p className="text-gray-600 mb-4">
              Please log in to leave a review and help other travelers.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setLoginModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => setSignupModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Login and Signup Modals */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onSwitchToSignup={() => {
            setLoginModalOpen(false);
            setSignupModalOpen(true);
          }}
          onSuccess={() => {
            // Auth state will update automatically
            toast.success('You can now leave a review!');
          }}
        />
        <SignupModal
          isOpen={isSignupModalOpen}
          onClose={() => setSignupModalOpen(false)}
          onSwitchToLogin={() => {
            setSignupModalOpen(false);
            setLoginModalOpen(true);
          }}
          onSuccess={() => {
            // Auth state will update automatically
            toast.success('Account created! You can now leave a review!');
          }}
        />
      </>
    );
  }

  // Show the review form for new reviews
  return (
    <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Share Your Experience</h3>
          <p className="text-sm text-gray-500">
            Writing as {user?.name || `${user?.firstName} ${user?.lastName}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Your Rating *
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`p-1 transition-all duration-200 ${
                  (hoverRating || rating) >= star 
                    ? 'text-yellow-400 scale-110' 
                    : 'text-gray-300 hover:text-yellow-300'
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                disabled={isSubmitting}
              >
                <Star
                  className={`h-8 w-8 transition-all ${
                    (hoverRating || rating) >= star ? 'fill-current' : ''
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm font-medium text-gray-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </span>
            )}
          </div>
        </div>

        {/* Title Section */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
            Review Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Summarize your experience..."
            maxLength={100}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            {title.length}/100 characters
          </p>
        </div>

        {/* Comment Section */}
        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
            Your Review (Optional)
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            placeholder="Tell us about your experience with this tour. What did you enjoy most? Any tips for future travelers? (Optional - you can submit just a star rating)"
            maxLength={1000}
            disabled={isSubmitting}
          />
          <div className="mt-1 flex justify-between items-center">
            <p className="text-xs text-gray-500">Optional - minimum 10 characters if provided</p>
            <p className="text-xs text-gray-500">{comment.length}/1000 characters</p>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || (comment.trim().length > 0 && comment.trim().length < 10)}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting Review...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>

        {/* Terms Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By submitting a review, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;