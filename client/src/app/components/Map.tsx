'use client'
import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import Loader from '../components/Loader';

const containerStyle = {
    width: '100%',
    height: '400px'
};

const centre = {
    lat: 37.437041393899676,
    lng: -4.191635586788259
};

const GoogleMapComponent = () => {
    return (
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} loadingElement={<Loader />}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={centre}
                zoom={10}
            >
                <Marker position={centre} />
            </GoogleMap>
        </LoadScript>
    );
};

export default GoogleMapComponent;
