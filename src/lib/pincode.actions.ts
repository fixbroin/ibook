
'use server';

export async function getAddressFromPincode(pincode: string) {
  if (!pincode || pincode.length < 5) {
    return { error: 'Invalid pincode' };
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is not set.');
    return { error: 'API key not configured.' };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status, data.error_message);
      return { error: `Geocoding failed: ${data.status}` };
    }

    const addressComponents = data.results[0]?.address_components;
    if (!addressComponents) {
      return { error: 'No address components found for this pincode.' };
    }
    
    const getComponent = (type: string) => addressComponents.find((c: any) => c.types.includes(type))?.long_name || '';

    const city = getComponent('locality') || getComponent('administrative_area_level_3') || getComponent('administrative_area_level_2');
    const state = getComponent('administrative_area_level_1');
    const country = getComponent('country');

    return { city, state, country };
  } catch (error) {
    console.error('Error fetching address from pincode:', error);
    return { error: 'Failed to fetch address details.' };
  }
}

    