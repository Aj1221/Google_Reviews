import React, { useState, useEffect, useCallback } from 'react';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import './GoogleReviews.css';
import StarRating from '../StarRating/StarRating';

// Define types for the component props and API response
interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: number; // Unix timestamp
}

interface GoogleReviewsProps {
  apiKey: string;
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({ apiKey }) => {
  const [placeId, setPlaceId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [visibleReviews, setVisibleReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true); // Always show "Load More"
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [showAll, setShowAll] = useState<boolean>(false); // Flag to show all reviews
  const [noReviews, setNoReviews] = useState<boolean>(false); // Flag for no reviews
  const [sortBy, setSortBy] = useState<'rating' | 'date' | 'none'>('none'); // State for sorting criteria
  const [visibleCount, setVisibleCount] = useState<number>(3); // Number of reviews to display

  // Caching mechanism
  const cacheKey = `reviews-${placeId}`;
  const cacheDuration = 1000 * 60 * 5; // 5 minutes

  const fetchReviews = useCallback(
    async () => {
      if (!placeId) return; // Do not fetch if placeId is not set
      setLoading(true);
      setError(null); // Reset error state
      setNoReviews(false); // Reset noReviews flag

      try {
        // Check cache first (only for initial load)
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}-time`);
        if (
          cachedData &&
          cacheTime &&
          Date.now() - parseInt(cacheTime) < cacheDuration
        ) {
          const cachedReviews = JSON.parse(cachedData);
          if (cachedReviews.length === 0) {
            setNoReviews(true);
          }
          const sortedReviews = sortReviews(cachedReviews);
          setReviews(sortedReviews);
          setVisibleReviews(sortedReviews.slice(0, visibleCount)); // Show only the initial set of reviews
          setLoading(false);
          return;
        }

        // Fetch reviews from Google Places API
        const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${apiKey}&fields=reviews`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        const fetchedReviews = data.result.reviews || [];

        if (fetchedReviews.length === 0) {
          setNoReviews(true);
        }

        // Append new reviews to the existing state
        const sortedReviews = sortReviews(fetchedReviews);
        setReviews(sortedReviews);
        setVisibleReviews(sortedReviews.slice(0, visibleCount)); // Show only the initial set of reviews

        // Cache the reviews if it's the initial load
        if (isInitialLoad) {
          localStorage.setItem(cacheKey, JSON.stringify(fetchedReviews));
          localStorage.setItem(`${cacheKey}-time`, Date.now().toString());
          setIsInitialLoad(false);
        }
      } catch (error: any) {
        console.error('Fetch error:', error);
        setError('Failed to fetch reviews');
      } finally {
        setLoading(false);
      }
    },
    [apiKey, placeId, cacheKey, cacheDuration, isInitialLoad, sortBy, visibleCount]
  );

  const sortReviews = (reviews: Review[]): Review[] => {
    if (sortBy === 'rating') {
      return reviews.slice().sort((a, b) => b.rating - a.rating); // Sort by rating descending
    } else if (sortBy === 'date') {
      return reviews.slice().sort((a, b) => b.time - a.time); // Sort by date descending
    } else {
      return reviews; // No sorting
    }
  };

  useEffect(() => {
    if (placeId) {
      fetchReviews();
    }
  }, [fetchReviews, placeId]);

  useEffect(() => {
    // Ensure that 'Load More' button visibility is updated correctly when reviews or sort criteria change
    setHasMore(reviews.length > visibleReviews.length);
  }, [reviews, visibleReviews]);

  const handleLoadMore = () => {
    const nextVisibleCount = visibleCount + 3;
    setVisibleCount(nextVisibleCount);
    setVisibleReviews(reviews.slice(0, nextVisibleCount));
    setShowAll(nextVisibleCount >= reviews.length);
  };

  const handlePlaceSelect = (selectedPlace: any) => {
    if (selectedPlace && selectedPlace.value.place_id) {
      setPlaceId(selectedPlace.value.place_id);
      setReviews([]); // Clear previous reviews
      setVisibleReviews([]); // Clear visible reviews
      setShowAll(false); // Reset showAll flag
      setNoReviews(false); // Reset noReviews flag
      setHasMore(true); // Reset hasMore when selecting a new place
      setVisibleCount(3); // Reset visible count for new place
      setIsInitialLoad(true); // Mark as initial load to enable caching
    }
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as 'rating' | 'date' | 'none');
  };

  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <div className="google-reviews">
        <div>
          <label>Enter Your address to get the Rating: </label>
          <GooglePlacesAutocomplete
            apiKey={apiKey}
            selectProps={{
              onChange: handlePlaceSelect,
              placeholder: 'Search for a place',
            }}
          />
        </div>
        {reviews.length > 0 &&
        <div className='sort-container'>
          <label>Sort reviews by: </label>
          <select value={sortBy} onChange={handleSortChange}>
            <option value="none">Select</option>
            <option value="date">Date</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        }
        {noReviews ? (
          <p>No reviews available.</p>
        ) : (
          <>
            {visibleReviews.map((review, index) => (
              <div className="review" key={index}>
                <h4>{review.author_name}</h4>
                <StarRating rating={review.rating} />
                <p>{review.text}</p>
                <p><strong>Date -</strong> {new Date(review.time * 1000).toLocaleDateString()}</p>
              </div>
            ))}
            {loading && reviews.length === 0 && <p>Loading reviews...</p>}
            {hasMore && !loading && !showAll && reviews.length > 0 && (
              <button className="load-more" onClick={handleLoadMore}>Load More</button>
            )}
            {loading && reviews.length > 0 && <p>Loading more reviews...</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleReviews;
