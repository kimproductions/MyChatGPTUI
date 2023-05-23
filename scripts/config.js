export let API_URL = null;
export let API_KEY = null;


export const fetchConfig = async () => {
    try {
        const response = await fetch("config.json");
        if (!response.ok) {
            throw new Error("Failed to load config file");
        }
        const config = await response.json();
        API_KEY = config.API_KEY;
        API_URL = config.API_URL;
    } catch (error) {
        console.error("Error fetching config:", error);
    }
};