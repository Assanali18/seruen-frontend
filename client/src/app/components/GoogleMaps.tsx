'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import axios from 'axios';
import WebApp from "@twa-dev/sdk";
import { axiosInstance } from "@/axios/axiosInstance";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
const serverApiUrl = 'https://seruen-backend-production.up.railway.app/';

const getCoordinatesFromAddress = async (address: string | undefined) => {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address,
                key: googleMapsApiKey,
            },
        });

        if (response.data.status !== 'OK') {
            throw new Error('Geocoding API error: ' + response.data.status);
        }

        return response.data.results[0].geometry.location;
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
};

const getMarkerIconUrl = (eventDate: string) => {
    const today = new Date();
    const eventDay = new Date(eventDate);
    const daysUntilEvent = (eventDay.getTime() - today.getTime()) / (1000 * 3600 * 24);

    if (daysUntilEvent <= 2) {
        return 'https://example.com/green-marker.png'; // Зеленый маркер
    } else if (daysUntilEvent > 2 && daysUntilEvent <= 10) {
        return 'https://example.com/yellow-marker.png'; // Желтый маркер
    } else {
        return 'https://example.com/red-marker.png'; // Красный маркер
    }
};

export default function GoogleMaps() {
    const mapRef = useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerPositions, setMarkerPositions] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { user } = WebApp.initDataUnsafe;
                const username = user?.username;

                let response;
                try {
                    if (username) {
                        const url = `${serverApiUrl}api/users/${username}/recommendations`;
                        console.log('request to', url);
                        response = await axiosInstance.get(url);
                    } else {
                        throw new Error('No username provided');
                    }
                } catch (err) {
                    if (axios.isAxiosError(err) && err.response?.status === 404) {
                        const firstName = user?.first_name;
                        if (firstName) {
                            const url = `${serverApiUrl}api/users/${firstName}/recommendations`;
                            console.log('request to', url);
                            response = await axiosInstance.get(url);
                        } else {
                            throw new Error('No first name provided');
                        }
                    } else {
                        throw err;
                    }
                }

                console.log('response', response.data);
                const recommendations = response.data || [];

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const userPosition = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setUserLocation(userPosition);

                        const positions = await Promise.all(
                            recommendations.map(async (recommendation: any) => {
                                if (recommendation.venue) {
                                    const coordinates = await getCoordinatesFromAddress(recommendation.venue);
                                    return { ...coordinates, recommendation };
                                }
                                return null;
                            })
                        );

                        setMarkerPositions(positions.filter(position => position !== null));
                    }, (error) => {
                        console.error('Error fetching user location:', error);
                    });
                }
            } catch (error) {
                console.error('Error fetching user data or recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        const initializeMap = async () => {
            const loader = new Loader({
                apiKey: googleMapsApiKey,
                version: 'quarterly',
            });

            const google = await loader.load();
            const { Map, Marker } = google.maps;

            const options: google.maps.MapOptions = {
                center: userLocation || { lat: 39.60128890889341, lng: -9.069839810859907 },
                zoom: 12,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
                styles: [ /* Ваши стили для карты */ ],
            };

            const map = new Map(mapRef.current as HTMLDivElement, options);

            if (userLocation) {
                new Marker({
                    map,
                    position: userLocation,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/7976/7976479.png',
                        scaledSize: new google.maps.Size(50, 50),
                    },
                });
            }

            markerPositions.forEach(({ lat, lng, recommendation }) => {
                const iconUrl = getMarkerIconUrl(recommendation.date);
                const marker = new Marker({
                    map,
                    position: { lat, lng },
                    icon: {
                        url: iconUrl,
                        scaledSize: new google.maps.Size(30, 30),
                    },
                });

                marker.addListener('click', () => {
                    setSelectedEvent(recommendation);
                });
            });
        };

        if (!loading) {
            initializeMap();
        }
    }, [userLocation, markerPositions, loading]);

    return (
        <div>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div
                    ref={mapRef}
                    className="h-[calc(100vh-56px)] w-full"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                    }}
                />
            )}

            {selectedEvent && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    backgroundColor: '#fff',
                    padding: '10px 20px',
                    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
                    borderRadius: '10px 10px 0 0',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{selectedEvent.title}</h3>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>{selectedEvent.venue}</p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#777' }}>{selectedEvent.date}</p>
                    <button
                        onClick={() => window.open(selectedEvent.ticketLink, '_blank')}
                        style={{
                            marginTop: '10px',
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Подробнее
                    </button>
                </div>
            )}
        </div>
    );
}
