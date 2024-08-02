'use client';

import React, { useEffect, useState } from 'react';
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
    // const mapRef = React.useRef<HTMLDivElement>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [recommendations, setRecommendations] = useState<any[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if(WebApp.initDataUnsafe.user){
                    setUserData(WebApp.initDataUnsafe.user);
                }
                const username = userData.username;

                if (!username) {
                    console.error('No user data available');
                    return;
                }

                console.log('request to', `${process.env.SERVER_API_URL}/api/users/${username}/recommendations`)
                const response = await axios.get(`/api/users/${username}/recommendations`);

                console.log('response', response.data);

                setRecommendations(response.data.recommendations || []);
            } catch (error) {
                console.error('Error fetching user data or recommendations:', error);
            }
        };

        fetchUserData();
    }, []);

    return (
        <div>
            <h1>User Data</h1>
            <pre>{JSON.stringify(userData, null, 2)}</pre>

            <h2>Recommendations</h2>
            <pre>{JSON.stringify(recommendations, null, 2)}</pre>
        </div>
    );
}
