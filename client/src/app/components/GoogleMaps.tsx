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

export default function GoogleMaps() {
    const mapRef = useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerPositions, setMarkerPositions] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null); // Состояние для выбранного события
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
                    // Если запрос по username возвращает 404, пробуем использовать first_name
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

                // Определяем местоположение пользователя (если доступно)
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const userPosition = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setUserLocation(userPosition);

                        // Получаем координаты для каждого места из рекомендаций
                        const positions = await Promise.all(
                            recommendations.map(async (recommendation: any) => {
                                if (recommendation.venue) {
                                    const coordinates = await getCoordinatesFromAddress(recommendation.venue);
                                    return { ...coordinates, recommendation };
                                }
                                return null;
                            })
                        );

                        // Фильтруем null значения
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
            const { Map, Marker, InfoWindow } = google.maps;

            const options: google.maps.MapOptions = {
                center: userLocation,
                zoom: 12,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
                styles: [ /* Ваши стили для карты */ ],
            };

            const map = new Map(mapRef.current as HTMLDivElement, options);

            // Добавление маркера для местоположения пользователя
            if (userLocation) {
                new Marker({
                    map,
                    position: userLocation,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/7976/7976479.png', // Укажите корректный URL иконки для пользователя
                        scaledSize: new google.maps.Size(50, 50),
                    },
                });
            }

            // Отображение маркеров для рекомендаций
            markerPositions.forEach((position) => {
                const marker = new Marker({
                    map,
                    position: { lat: position.lat, lng: position.lng },
                });

                marker.addListener('click', () => {
                    setSelectedEvent(position.recommendation);
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
                <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'white', padding: '10px', boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)' }}>
                    <h3>{selectedEvent.title}</h3>
                    <p>{selectedEvent.venue}</p>
                    <p>{selectedEvent.date}</p>
                    <button onClick={() => window.open(selectedEvent.ticketLink, '_blank')}>Подробнее</button>
                </div>
            )}
        </div>
    );
}
