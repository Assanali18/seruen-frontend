'use client';

import React, { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import axios from 'axios';
import WebApp from "@twa-dev/sdk";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

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
    const mapRef = React.useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [markerPositions, setMarkerPositions] = useState<google.maps.LatLngLiteral[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { user } = WebApp.initDataUnsafe;
                const username = user?.username || user?.first_name;

                if (!username) {
                    console.error('No user data available');
                    return;
                }

                // Получаем данные пользователя из базы данных (замените на реальный запрос)
                const response = await axios.get(`/api/users/${username}/recommendations`);
                console.log('response', response.data)
                const userData = response.data;

                if (!userData) {
                    console.error('User not found in the database');
                    return;
                }

                const recommendations = userData.recommendations || [];

                // Определяем местоположение пользователя
                const userPosition = await getCoordinatesFromAddress(userData.location);
                setUserLocation(userPosition);

                // Получаем координаты для каждого места из рекомендаций
                const positions = await Promise.all(
                    recommendations.map(async (recommendation: any) => {
                        if (recommendation.venue) {
                            return getCoordinatesFromAddress(recommendation.venue);
                        }
                        return null;
                    })
                );

                // Фильтруем null значения
                setMarkerPositions(positions.filter(position => position !== null));
            } catch (error) {
                console.error('Error fetching user data or recommendations:', error);
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

            const { Map } = await loader.importLibrary('maps');

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
                new google.maps.Marker({
                    map,
                    position: userLocation,
                    icon: {
                        url: 'URL вашей иконки для пользователя',
                        scaledSize: new google.maps.Size(40, 40),
                    },
                });
            }

            markerPositions.forEach((position) => {
                new google.maps.Marker({
                    map,
                    position,
                });
            });
        };

        initializeMap();
    }, [userLocation, markerPositions]);

    return (
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
    );
}
