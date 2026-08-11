import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { account } from './appwrite'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Bookings from './bookings';

//Authentication login logout
const handleGoogleLogin = () => {
  account.createOAuth2Session(
    'google',
    window.location.origin,
    `${window.location.origin}/`
  )
}
const handleLogout = async () => {
  try {
    await account.deleteSession({
      sessionId: 'current'
    });

    setUser(null);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

function Home() {

  const [user, setUser] = useState(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const currentUser = await account.get()
        setUser(currentUser)
      } catch (error) {
        setUser(null)
      }
    }

    getCurrentUser()
  }, [])


  // Search state
  const [numBeds, setNumBeds] = useState('')
  const [listings, setListings] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Booking state
  const [selectedListing, setSelectedListing] = useState(null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(null)
  const [bookingError, setBookingError] = useState('')

  // Helper to parse mongoose decimal price safely
  const getPrice = (price) => {
    if (!price) return '120';
    if (typeof price === 'object') {
      return price.$numberDecimal || price.toString();
    }
    return price.toString();
  }

  // Load listings on mount and search
  const handleSearchListings = useCallback(async (e) => {
    if (e) e.preventDefault();
    setSearching(true);
    setSearchError('');
    setBookingSuccess(null);
    setBookingError('');

    try {
      const url = numBeds ? `/api/listings?numBeds=${numBeds}` : '/api/listings';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch listings. Make sure the server is running.');
      }
      const data = await res.json();
      setListings(data);
    } catch (err) {
      setSearchError(err.message || 'Something went wrong while fetching listings.');
    } finally {
      setSearching(false);
    }
  }, [numBeds])

  useEffect(() => {
    handleSearchListings();
  }, [handleSearchListings]);

  const handleBookListing = async (e) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setBookingError('Please pick both Check-in and Check-out dates.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await fetch(`/api/listings/${selectedListing._id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.$id,
          startDate: checkIn,
          endDate: checkOut
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        setBookingSuccess({
          listingName: selectedListing.name,
          checkIn,
          checkOut,
          message: data.message || 'Booking completed successfully!'
        });
      } else {
        setBookingError(data.error || 'This listing is already booked for these dates.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError('Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  }

  const handleCloseBooking = () => {
    setSelectedListing(null);
    setBookingSuccess(null);
    setBookingError('');
    setCheckIn('');
    setCheckOut('');
    handleSearchListings();
  }

  return (
    <div className="app">
      <header className="header">
        <h1>HotelBooker</h1>

        {user ? (
          <p>Hi, {user.name}!</p>
        ) : (
          <p>Find & book AirBnB accommodations instantly</p>
        )}
        {user && (
          <Link to="/bookings">
            My Bookings
          </Link>
        )}

        {user ? (
          <button
            onClick={handleLogout}
            className="google-login-btn"
          >
            Log Out
          </button>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="google-login-btn"
          >
            Continue with Google
          </button>
        )}
      </header>

      <main className="container">
        {/* Search section */}
        <section className="search-section">
          <div className="search-box">
            <form onSubmit={handleSearchListings} className="search-form-row">
              <div className="search-input-group">
                <span className="search-icon">🛏️</span>
                <input
                  type="number"
                  placeholder="How many beds do you need?"
                  value={numBeds}
                  onChange={(e) => setNumBeds(e.target.value)}
                  min="1"
                  className="search-input"
                />
              </div>
              <button type="submit" className="search-action-btn" disabled={searching}>
                {searching ? 'Searching...' : 'Search Rooms'}
              </button>
            </form>
          </div>
        </section>

        {/* Error message */}
        {searchError && (
          <div className="error-banner">
            <span>⚠️</span> {searchError}
          </div>
        )}

        {/* Listings section */}
        <section className="listings-section">
          <h2>Available Accommodations</h2>
          {searching ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Fetching beautiful stays for you...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏨</span>
              <h3>No listings found</h3>
              <p>Try searching for a different number of beds or clear the filter.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map((listing) => {
                const imgUrl = listing.images?.picture_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                return (
                  <div key={listing._id} className="hotel-card">
                    <div className="hotel-card-image-wrapper">
                      <img
                        src={imgUrl}
                        alt={listing.name || 'Boutique Room'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                        }}
                        className="hotel-card-image"
                      />
                      <span className="hotel-card-badge">{listing.room_type || 'Entire place'}</span>
                    </div>
                    <div className="hotel-card-info">
                      <h3 className="hotel-card-title">{listing.name || 'Boutique Apartment'}</h3>
                      <p className="hotel-card-summary">
                        {listing.summary || listing.description || 'No description available for this property.'}
                      </p>
                      <div className="hotel-card-meta">
                        <span className="meta-item">🛏️ {listing.beds || 1} {listing.beds === 1 ? 'bed' : 'beds'}</span>
                        <span className="meta-item">👥 Accommodates {listing.accommodates || 2}</span>
                      </div>
                      <div className="hotel-card-footer">
                        <div className="price-tag">
                          <span className="price-val">${getPrice(listing.price)}</span>
                          <span className="price-unit">/ night</span>
                        </div>
                        <button
                          onClick={() => {
                            if (!user) {
                              handleGoogleLogin(); //only let it through if logged in
                              return;
                            }

                            setSelectedListing(listing);
                          }}
                          className="book-trigger-btn"
                        >
                          {user ? 'Book Stay' : 'Sign in to Book'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Booking Modal */}
      {selectedListing && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <button className="modal-close-btn" onClick={handleCloseBooking}>&times;</button>

            {!bookingSuccess ? (
              <>
                <div className="modal-header">
                  <h2>Book Your Stay</h2>
                  <p className="modal-subtitle">{selectedListing.name}</p>
                </div>

                {bookingError && (
                  <div className="booking-error-box">
                    <span>⚠️</span>
                    <p>{bookingError}</p>
                  </div>
                )}

                <form onSubmit={handleBookListing} className="booking-form">
                  <div className="booking-fields-row">
                    <div className="form-field">
                      <label htmlFor="modal-checkin">Check-in Date</label>
                      <input
                        id="modal-checkin"
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="booking-input"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="modal-checkout">Check-out Date</label>
                      <input
                        id="modal-checkout"
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="booking-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="booking-summary-box">
                    <div className="summary-row">
                      <span>Rate per night</span>
                      <strong>${getPrice(selectedListing.price)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Beds available</span>
                      <span>{selectedListing.beds || 1} beds</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="booking-submit-btn"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? (
                      <>
                        <span className="btn-spinner"></span>
                        Processing Booking...
                      </>
                    ) : (
                      'Confirm & Pay'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="booking-success-view">
                <div className="success-icon-wrapper">
                  <span className="success-checkmark">✓</span>
                </div>
                <h2>Booking Confirmed!</h2>
                <p className="success-message">
                  Thank you for booking with HotelBooker. Your reservation has been saved in our system.
                </p>

                <div className="success-details-card">
                  <h4>{bookingSuccess.listingName}</h4>
                  <div className="details-grid">
                    <div>
                      <span className="label">Check-in</span>
                      <span className="val">{bookingSuccess.checkIn}</span>
                    </div>
                    <div>
                      <span className="label">Check-out</span>
                      <span className="val">{bookingSuccess.checkOut}</span>
                    </div>
                  </div>
                </div>

                <button className="success-done-btn" onClick={handleCloseBooking}>
                  Find More Stays
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bookings" element={<Bookings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
