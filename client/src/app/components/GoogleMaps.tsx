'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WebApp from "@twa-dev/sdk";
import {axiosInstance} from "@/axios/axiosInstance";


const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
const serverApiUrl = process.env.NEXT_PUBLIC_SERVER_API_URL as string;

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
    const [userData, setUserData] = useState<any | null>(null);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [requestUrl, setRequestUrl] = useState<string | null>(null);

    useEffect(() => {
        console.log('WebApp.initDataUnsafe', WebApp.initDataUnsafe);
        const fetchUserData = async () => {
            try {
                if (WebApp.initDataUnsafe.user) {
                    setUserData(WebApp.initDataUnsafe.user);
                }
                const username = WebApp.initDataUnsafe.user?.username;

                if (!username) {
                    console.error('No user data available');
                    return;
                }

                const url = `${serverApiUrl}api/users/${username}/recommendations`;
                console.log('request to', url);
                setRequestUrl(url);

                const response = await axiosInstance.get(`api/users/${username}/recommendations`);
                console.log('response', response);

                setRecommendations(response.data || []);
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

            {requestUrl && (
                <div>
                    <h3>Request URL</h3>
                    <p>{requestUrl}</p>
                </div>
            )}
        </div>
    );
}
