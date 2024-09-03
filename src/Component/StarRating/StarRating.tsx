import React from 'react';
import './StarRating.css';

interface StarRatingProps {
  rating: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  return (
    <div className="star-rating">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < rating ? 'filled' : ''}>
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
