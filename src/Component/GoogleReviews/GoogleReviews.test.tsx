import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoogleReviews from './GoogleReviews';
import '@testing-library/jest-dom/extend-expect';

// Mock the Google Places API Autocomplete component
jest.mock('react-google-places-autocomplete', () => ({
  __esModule: true,
  default: ({ selectProps }: any) => (
    <input
      data-testid="autocomplete"
      onChange={() => selectProps.onChange({ value: { place_id: 'test-place-id' } })}
      placeholder={selectProps.placeholder}
    />
  ),
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      result: {
        reviews: [
          { author_name: 'John Doe', rating: 5, text: 'Great place!', time: Math.floor(Date.now() / 1000) - 1000 },
          { author_name: 'Jane Smith', rating: 4, text: 'Good experience.', time: Math.floor(Date.now() / 1000) - 2000 },
        ],
      },
    }),
  })
) as jest.Mock;

describe('GoogleReviews Component', () => {
  const apiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component and the initial UI', () => {
    render(<GoogleReviews apiKey={apiKey} />);

    expect(screen.getByText('Enter Your address to get the Rating:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for a place')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('handles place selection and fetches reviews', async () => {
    render(<GoogleReviews apiKey={apiKey} />);

    // Simulate selecting a place
    fireEvent.change(screen.getByTestId('autocomplete'), { target: { value: 'Test Place' } });

    // Wait for the fetch to complete and check if reviews are displayed
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/place/details/json?placeid=test-place-id&key=test-api-key&fields=reviews'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('sorts reviews by date and rating', async () => {
    render(<GoogleReviews apiKey={apiKey} />);

    // Simulate selecting a place
    fireEvent.change(screen.getByTestId('autocomplete'), { target: { value: 'Test Place' } });

    // Wait for reviews to be fetched and rendered
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Change sort to 'rating'
    fireEvent.change(screen.getByLabelText('Sort reviews by:'), { target: { value: 'rating' } });

    // Check sorting by rating
    await waitFor(() => {
      const reviews = screen.getAllByText(/Doe|Smith/).map((node) => node.textContent);
      expect(reviews).toEqual(['John Doe', 'Jane Smith']);
    });

    // Change sort to 'date'
    fireEvent.change(screen.getByLabelText('Sort reviews by:'), { target: { value: 'date' } });

    // Check sorting by date
    await waitFor(() => {
      const reviews = screen.getAllByText(/Doe|Smith/).map((node) => node.textContent);
      expect(reviews).toEqual(['John Doe', 'Jane Smith']);
    });
  });

  it('shows and hides "Load More" button correctly', async () => {
    render(<GoogleReviews apiKey={apiKey} />);

    // Simulate selecting a place
    fireEvent.change(screen.getByTestId('autocomplete'), { target: { value: 'Test Place' } });

    // Wait for reviews to be fetched
    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    // Click "Load More" button
    fireEvent.click(screen.getByText('Load More'));

    // Wait for more reviews to load
    await waitFor(() => {
      // Check if the reviews are updated (depending on your setup, adjust checks)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Load More')).toBeNull(); // Adjust according to your button logic
    });
  });

  it('displays error message on fetch failure', async () => {
    // Mock a fetch failure
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
      })
    );

    render(<GoogleReviews apiKey={apiKey} />);

    // Simulate selecting a place
    fireEvent.change(screen.getByTestId('autocomplete'), { target: { value: 'Test Place' } });

    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch reviews')).toBeInTheDocument();
    });
  });

  it('shows no reviews message when there are no reviews', async () => {
    // Mock a response with no reviews
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          result: {
            reviews: [],
          },
        }),
      })
    );

    render(<GoogleReviews apiKey={apiKey} />);

    // Simulate selecting a place
    fireEvent.change(screen.getByTestId('autocomplete'), { target: { value: 'Test Place' } });

    // Wait for the no reviews message to be displayed
    await waitFor(() => {
      expect(screen.getByText('No reviews available.')).toBeInTheDocument();
    });
  });
});
