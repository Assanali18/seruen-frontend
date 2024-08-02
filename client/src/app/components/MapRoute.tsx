'use client'
import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '400px'
};

const origin = {
    lat: 37.437041393899676,
    lng: -4.191635586788259
};

const destination = {
    lat: 37.440575591901045,
    lng: -4.231433159434073
};

const GoogleMapRouteComponent = () => {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelTime, setTravelTime] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.google) {
            setIsLoaded(true);
        }
    }, []);

    const directionsCallback = (
        response: google.maps.DirectionsResult | null,
        status: google.maps.DirectionsStatus
    ) => {
        if (status === 'OK' && response) {
            setDirections(response);
            const route = response.routes[0].legs[0];
            setTravelTime(route.duration?.text || '');
        } else {
            console.error('Directions request failed due to ' + status);
        }
    };

    return (
        <div>
            {isLoaded ? (
                <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={origin}
                        zoom={10}
                    >
                        <Marker position={origin} />
                        <Marker position={destination} />
                        <DirectionsService
                            options={{
                                destination: destination,
                                origin: origin,
                                travelMode: google.maps.TravelMode.DRIVING
                            }}
                            callback={directionsCallback}
                        />
                        {directions && (
                            <DirectionsRenderer
                                options={{
                                    directions: directions
                                }}
                            />
                        )}
                    </GoogleMap>
                    {travelTime && <p>Estimated travel time: {travelTime}</p>}
                </LoadScript>
            ) : (
                <div>Loading map...</div> // Показать что-то, пока google.maps не загрузится
            )}
        </div>
    );
};

export default GoogleMapRouteComponent;
