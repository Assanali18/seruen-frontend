'use client';

import React, { useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function GoogleMaps() {
    const mapRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        // if (window.Telegram && window.Telegram.WebApp) {
        //     const webApp = window.Telegram.WebApp;
        //     webApp.ready();
        //     webApp.expand();
        //
        //     console.log(webApp.initDataUnsafe); // User and app data
        //
        //     webApp.onEvent('backButtonClicked', () => {
        //         webApp.close(); // Закрыть мини-апп
        //     });
        // }
        const initializeMap = async () => {
            const loader = new Loader({
                apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
                version: 'quarterly',
            });

            const { Map } = await loader.importLibrary('maps');

            const locationInMap = {
                lat: 39.60128890889341,
                lng: -9.069839810859907,
            };

            // MARKER
            const { Marker } = (await loader.importLibrary(
                'marker'
            )) as google.maps.MarkerLibrary;

            const options: google.maps.MapOptions = {
                center: locationInMap,
                zoom: 15,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
            };

            const map = new Map(mapRef.current as HTMLDivElement, options);

            // add the marker in the map
            new Marker({
                map: map,
                position: locationInMap,
            });
        };

        initializeMap();
    }, []);

    return (
        <div
            ref={mapRef}
            className="h-[calc(100vh-56px)] w-full" // Responsive design for mobile
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
