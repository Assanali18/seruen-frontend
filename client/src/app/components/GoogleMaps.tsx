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
        return '/markers/green.png'; // Green marker
    } else if (daysUntilEvent > 2 && daysUntilEvent <= 10) {
        return '/markers/yellow.png'; // Yellow marker
    } else {
        return '/markers/red.png'; // Red marker
    }
};

export default function GoogleMaps() {
    const mapRef = useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerPositions, setMarkerPositions] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [noRecommendations, setNoRecommendations] = useState(false);
    const [geoPermissionDenied, setGeoPermissionDenied] = useState(false);

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

                if (recommendations.length === 0) {
                    setNoRecommendations(true);
                }

                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
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

                            const uniquePositions = positions.reduce((acc, pos) => {
                                if (pos) {
                                    const key = `${pos.lat},${pos.lng}`;
                                    if (!acc[key] || new Date(pos.recommendation.date) < new Date(acc[key].recommendation.date)) {
                                        acc[key] = pos;
                                    }
                                }
                                return acc;
                            }, {});

                            setMarkerPositions(Object.values(uniquePositions));
                        },
                        (error) => {
                            console.error('Error fetching user location:', error);
                            setGeoPermissionDenied(true);
                        }
                    );
                } else {
                    console.error("Geolocation is not available.");
                    setGeoPermissionDenied(true);
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
        if (!loading && !noRecommendations && !geoPermissionDenied && userLocation) {
            const initializeMap = async () => {
                const loader = new Loader({
                    apiKey: googleMapsApiKey,
                    version: 'quarterly',
                });

                try {
                    const google = await loader.load();
                    const { Map, Marker } = google.maps;

                    const options: google.maps.MapOptions = {
                        center: userLocation || { lat: 43.25667, lng: 76.92861 },
                        zoom: 12,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        streetViewControl: false,
                        styles: [
                            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                            {
                                featureType: 'administrative.locality',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#d59563' }],
                            },
                            {
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            },
                            {
                                featureType: 'road',
                                elementType: 'geometry',
                                stylers: [{ color: '#38414e' }],
                            },
                            {
                                featureType: 'road',
                                elementType: 'geometry.stroke',
                                stylers: [{ color: '#212a37' }],
                            },
                            {
                                featureType: 'road',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#9ca5b3' }],
                            },
                            {
                                featureType: 'road.highway',
                                elementType: 'geometry',
                                stylers: [{ color: '#746855' }],
                            },
                            {
                                featureType: 'road.highway',
                                elementType: 'geometry.stroke',
                                stylers: [{ color: '#1f2835' }],
                            },
                            {
                                featureType: 'road.highway',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#f3d19c' }],
                            },
                            {
                                featureType: 'transit',
                                elementType: 'geometry',
                                stylers: [{ color: '#2f3948' }],
                            },
                            {
                                featureType: 'transit.station',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#d59563' }],
                            },
                            {
                                featureType: 'water',
                                elementType: 'geometry',
                                stylers: [{ color: '#17263c' }],
                            },
                            {
                                featureType: 'water',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#515c6d' }],
                            },
                            {
                                featureType: 'water',
                                elementType: 'labels.text.stroke',
                                stylers: [{ color: '#17263c' }],
                            },
                        ],
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
                            // Убрана анимация
                        });
                    });
                } catch ( error) {
                    console.error('Error initializing map:', error);
                }
            };

            initializeMap();
        }
    }, [userLocation, markerPositions, loading, noRecommendations, geoPermissionDenied]);

    return (
        <div>
            {loading ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] w-full">
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
                            {/* Path for SVG */}
                        </svg>
                        <span className="sr-only">Loading...</span>
                    </div>
                    <p className="text-gray-500 text-center mt-2">
                        Загрузка данных... Пожалуйста, включите геоданные.
                    </p>
                </div>
            ) : noRecommendations ? (
                <div className="flex items-center justify-center h-[calc(100vh-56px)] w-full">
                    <p className="text-white text-lg font-bold">
                        У вас пока нет рекомендаций. Пожалуйста, подождите, пока они загрузятся.
                    </p>
                </div>
            ) : geoPermissionDenied ? (
                <div className="flex items-center justify-center h-[calc(100vh-56px)] w-full">
                    <p className="text-white text-lg font-bold">
                        Для отображения карты, пожалуйста, предоставьте доступ к геоданным и включите геопозицию.
                    </p>
                </div>
            ) : (
                <div ref={mapRef} className="absolute top-0 left-0 right-0 bottom-0 w-full h-[calc(100vh-56px)]" />
            )}

            {selectedEvent && (
                <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 w-auto bg-gray-800 text-white p-4 rounded-lg shadow-lg transition-opacity duration-300 ${selectedEvent ? 'opacity-100' : 'opacity-0 invisible'}`}>
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="absolute top-1 right-1 text-lg"
                        style={{ color: '#fff' }}
                    >
                        &times;
                    </button>
                    <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
                    <p className="text-sm">{selectedEvent.venue}</p>
                    <p className="text-sm">{selectedEvent.date}</p>
                    <button
                        onClick={() => window.open(selectedEvent.ticketLink, '_blank')}
                        className="mt-2 py-2 px-4 bg-red-500 rounded text-white cursor-pointer text-sm"
                    >
                        Подробнее
                    </button>
                </div>
            )}
        </div>
    );
}
