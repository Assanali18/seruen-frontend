import axios from 'axios';


export const axiosInstance = axios.create({
    baseURL: 'https://seruen-backend-production.up.railway.app/',
    headers: {
        'Content-Type': 'application/json'
    }
});