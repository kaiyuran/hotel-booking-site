import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { account } from './appwrite';
import './bookings.css';

function Bookings() {
    const [user, setUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [listings, setListings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadBookings = async () => {
            try {
                const currentUser = await account.get();
                setUser(currentUser);
                const jwtResponse = await account.createJWT();

                const jwt = jwtResponse.jwt;
                const res = await fetch(`/api/bookings`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch bookings');
                }

                const data = await res.json();
                setBookings(data);

                // Fetch the listing for each booking
                const listingResults = await Promise.all(
                    data.map(async (booking) => {
                        const listingRes = await fetch(`/api/listings/${booking.listingId}`);

                        if (!listingRes.ok) {
                            return null;
                        }

                        return listingRes.json();
                    })
                );

                const listingMap = {};

                data.forEach((booking, index) => {
                    const listing = listingResults[index];

                    if (listing) {
                        listingMap[booking.listingId] = listing;
                    }
                });

                setListings(listingMap);

            } catch (error) {
                console.error('Error loading bookings:', error);
                setError('Could not load your bookings.');
            } finally {
                setLoading(false);
            }
        };

        loadBookings();
    }, []);

    if (loading) {
        return (
            <div className="bookings-page">
                <h1>My Bookings</h1>
                <Link to="/" className="back-link">
                    Back to Home
                </Link>
                <p>Loading your bookings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bookings-page">
                <h1>My Bookings</h1>
                <Link to="/" className="back-link">
                    Back to Home
                </Link>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="bookings-page">
            <h1>My Bookings</h1>
            <Link to="/" className="back-link">
                Back to Home
            </Link>

            {user && (
                <p>
                    Bookings for <strong>{user.name}</strong>
                </p>
            )}

            {bookings.length === 0 ? (
                <div className="empty-bookings">
                    <h2>No bookings yet</h2>
                    <p>
                        When you book a place, your reservations will
                        appear here.
                    </p>
                </div>
            ) : (
                <div className="bookings-list">
                    {bookings.map((booking) => {
                        const listing = listings[booking.listingId];

                        return (
                            <div
                                className="booking-card"
                                key={booking._id}
                            >
                                {listing?.images?.picture_url && (
                                    <img
                                        src={listing.images.picture_url}
                                        alt={listing.name}
                                        className="booking-image"
                                    />
                                )}

                                <div className="booking-info">
                                    <h2>
                                        {listing?.name ||
                                            'Listing unavailable'}
                                    </h2>

                                    {listing && (
                                        <>
                                            <p className="location">
                                                {listing.address?.market}
                                                {listing.address?.country
                                                    ? `, ${listing.address.country}`
                                                    : ''}
                                            </p>

                                            <p>
                                                {listing.bedrooms || 0}{' '}
                                                bedrooms ·{' '}
                                                {listing.beds || 0} beds ·{' '}
                                                Up to{' '}
                                                {listing.accommodates || 0}{' '}
                                                guests
                                            </p>

                                            <p className="price">
                                                $
                                                {listing.price?.$numberDecimal ||
                                                    listing.price}
                                                {' / night'}
                                            </p>
                                        </>
                                    )}

                                    <div className="booking-dates">
                                        <div>
                                            <span>CHECK-IN</span>
                                            <strong>
                                                {new Date(
                                                    booking.startDate
                                                ).toLocaleDateString()}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>CHECK-OUT</span>
                                            <strong>
                                                {new Date(
                                                    booking.endDate
                                                ).toLocaleDateString()}
                                            </strong>
                                        </div>
                                    </div>

                                    <p className="booking-status">
                                        Status:{' '}
                                        <strong>
                                            {booking.status}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Bookings;