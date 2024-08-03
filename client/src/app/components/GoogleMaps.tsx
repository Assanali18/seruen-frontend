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
        return '/markers/green.png'; // Зеленый маркер
    } else if (daysUntilEvent > 2 && daysUntilEvent <= 10) {
        return '/markers/yellow.png'; // Желтый маркер
    } else {
        return '/markers/red.png'; // Красный маркер
    }
};

export default function GoogleMaps() {
    const mapRef = useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerPositions, setMarkerPositions] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [noRecommendations, setNoRecommendations] = useState(false);

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
        if (!loading && !noRecommendations && userLocation) {
            const initializeMap = async () => {
                const loader = new Loader({
                    apiKey: googleMapsApiKey,
                    version: 'quarterly',
                });

                try {
                    const google = await loader.load();
                    const { Map, Marker } = google.maps;

                    const options: google.maps.MapOptions = {
                        center: userLocation,
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
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#d59563' }],
                            },
                            {
                                featureType: 'poi.park',
                                elementType: 'geometry',
                                stylers: [{ color: '#263c3f' }],
                            },
                            {
                                featureType: 'poi.park',
                                elementType: 'labels.text.fill',
                                stylers: [{ color: '#6b9a76' }],
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
                            marker.setAnimation(google.maps.Animation.BOUNCE);
                            setTimeout(() => marker.setAnimation(null), 750);
                        });
                    });
                } catch (error) {
                    console.error('Error initializing map:', error);
                }
            };

            initializeMap();
        }
    }, [userLocation, markerPositions, loading, noRecommendations]);

    return (
        <div>
            {loading ? (
                <div className="flex items-center justify-center h-[calc(100vh-56px)] w-full">
                    <div role="status">
                        <svg
                            aria-hidden="true"
                            className="inline w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                            viewBox="0 0 100 101"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor"
                            />
                            <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                fill="currentFill"
                            />
                        </svg>
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            ) : noRecommendations ? (
                <div className="flex items-center justify-center h-[calc(100vh-56px)] w-full">
                    <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                        Дождитесь, пока ваши рекомендации загрузятся, мы вас уведомим...
                    </p>
                </div>
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
                    backgroundColor: '#2b2b2b',
                    color: '#fff',
                    padding: '15px 20px',
                    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.3)',
                    borderRadius: '10px 10px 0 0',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <button
                        onClick={() => setSelectedEvent(null)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '20px',
                            cursor: 'pointer',
                        }}
                    >
                        &times;
                    </button>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{selectedEvent.title}</h3>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#ccc' }}>{selectedEvent.venue}</p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#aaa' }}>{selectedEvent.date}</p>
                    <button
                        onClick={() => window.open(selectedEvent.ticketLink, '_blank')}
                        style={{
                            marginTop: '10px',
                            padding: '10px 20px',
                            backgroundColor: '#ff6347',
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
